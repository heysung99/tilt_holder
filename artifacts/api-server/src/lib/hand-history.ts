import type { PushPayload } from "./push.js";

// Server-side copy of the app's hand history shape (artifacts/tilt-holder/src/lib/hand-history.ts).
// Anyone can record a hand, so everything is checked and trimmed before it's stored.
type Card = { rank: string; suit: string };
type HandAction = { street: string; name: string; type: string; amount?: number };
export type HandHistory = {
  id: string;
  time: string;
  seats: string[];
  blinds: { sb: number; bb: number } | null;
  actions: HandAction[];
  board: Card[];
  shown: Record<string, Card[]>;
  winners: string[];
  tag: string | null;
  memo: string;
};

export const MAX_HANDS_PER_GAME = 300;

const RANKS = new Set(["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]);
const SUITS = new Set(["s", "h", "d", "c"]);
const STREETS = new Set(["preflop", "flop", "turn", "river"]);
const ACTIONS = new Set(["fold", "check", "call", "bet", "raise", "allin"]);
const MAX_AMOUNT = 100_000_000;

const isName = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 30;
const isAmount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= MAX_AMOUNT;

function card(value: unknown): Card | null {
  const { rank, suit } = (value ?? {}) as Card;
  return RANKS.has(rank) && SUITS.has(suit) ? { rank, suit } : null;
}

function cards(value: unknown, max: number): Card[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  const parsed = value.map(card);
  return parsed.every((item): item is Card => item !== null) ? parsed : null;
}

// Returns a clean copy of a submitted hand, or null if anything is malformed.
export function parseHand(value: unknown): HandHistory | null {
  const hand = (value ?? {}) as Record<string, unknown>;
  if (typeof hand.id !== "string" || hand.id.length === 0 || hand.id.length > 60) return null;
  if (typeof hand.time !== "string" || Number.isNaN(Date.parse(hand.time))) return null;

  const seats = Array.isArray(hand.seats) && hand.seats.length <= 12 && hand.seats.every(isName) ? hand.seats : null;
  if (!seats || new Set(seats).size !== seats.length) return null;

  let blinds: HandHistory["blinds"] = null;
  if (hand.blinds !== null && hand.blinds !== undefined) {
    const { sb, bb } = hand.blinds as { sb: unknown; bb: unknown };
    if (!isAmount(sb) || !isAmount(bb)) return null;
    blinds = { sb, bb };
  }

  if (!Array.isArray(hand.actions) || hand.actions.length > 200) return null;
  const actions: HandAction[] = [];
  for (const raw of hand.actions) {
    const action = (raw ?? {}) as HandAction;
    if (!STREETS.has(action.street) || !ACTIONS.has(action.type) || !seats.includes(action.name)) return null;
    if (action.amount !== undefined && !isAmount(action.amount)) return null;
    actions.push(action.amount === undefined
      ? { street: action.street, name: action.name, type: action.type }
      : { street: action.street, name: action.name, type: action.type, amount: action.amount });
  }

  const board = cards(hand.board, 5);
  if (!board) return null;

  const shown: Record<string, Card[]> = {};
  if (hand.shown && typeof hand.shown === "object") {
    for (const [name, value] of Object.entries(hand.shown as Record<string, unknown>)) {
      const holeCards = cards(value, 2);
      if (!seats.includes(name) || !holeCards) return null;
      if (holeCards.length > 0) shown[name] = holeCards;
    }
  }

  const winners = Array.isArray(hand.winners) && hand.winners.every((name) => seats.includes(name as string) || isName(name))
    ? (hand.winners as string[]).slice(0, 12)
    : null;
  if (!winners) return null;

  const tag = typeof hand.tag === "string" && hand.tag.length <= 20 ? hand.tag : null;
  const memo = typeof hand.memo === "string" ? hand.memo.slice(0, 500) : "";
  if (actions.length === 0 && board.length === 0 && !tag && !memo.trim()) return null;

  return { id: hand.id, time: hand.time, seats, blinds, actions, board, shown, winners, tag, memo };
}

export function renameInHands(hands: unknown, from: string, to: string) {
  if (!Array.isArray(hands)) return hands;
  const swap = (name: unknown) => (name === from ? to : name);
  return hands.map((hand: HandHistory) => ({
    ...hand,
    seats: Array.isArray(hand.seats) ? hand.seats.map(swap) : hand.seats,
    actions: Array.isArray(hand.actions) ? hand.actions.map((action) => ({ ...action, name: swap(action.name) })) : hand.actions,
    shown: hand.shown && typeof hand.shown === "object"
      ? Object.fromEntries(Object.entries(hand.shown).map(([name, value]) => [swap(name), value]))
      : hand.shown,
    winners: Array.isArray(hand.winners) ? hand.winners.map(swap) : hand.winners,
  }));
}

// Keeps every hand from both lists once, in time order.
export function mergeHands(...lists: unknown[]): HandHistory[] {
  const byId = new Map<string, HandHistory>();
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const hand of list) {
      const parsed = parseHand(hand);
      if (parsed && !byId.has(parsed.id)) byId.set(parsed.id, parsed);
    }
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.time) - Date.parse(b.time)).slice(0, MAX_HANDS_PER_GAME);
}

const TAG_LABELS: Record<string, string> = {
  allin: "🔥 올인",
  badbeat: "💥 배드빗",
  bluff: "🎭 블러프",
  cooler: "🧊 쿨러",
  bigpot: "💰 빅팟",
  monster: "🃏 대박 핸드",
  funny: "😂 명장면",
  etc: "✏️ 기타",
};

function potTotal(hand: HandHistory) {
  let total = 0;
  for (const street of STREETS) {
    const committed: Record<string, number> = {};
    if (street === "preflop" && hand.blinds && hand.seats.length >= 2) {
      const [sb, bb] = hand.seats.length === 2 ? [0, 1] : [1, 2];
      committed[hand.seats[sb]] = hand.blinds.sb;
      committed[hand.seats[bb]] = hand.blinds.bb;
    }
    for (const action of hand.actions) {
      if (action.street === street && action.amount !== undefined) committed[action.name] = action.amount;
    }
    total += Object.values(committed).reduce((sum, value) => sum + value, 0);
  }
  return total;
}

function formatAmount(won: number) {
  return won >= 10000 ? `${Math.round((won / 10000) * 100) / 100}만` : `${won.toLocaleString("ko-KR")}원`;
}

// "🃏 핸드 #4 · 💥 배드빗" / "철수 승 · 팟 12만 · AA vs KK 리버 K"
export function handRecordedPayload(hand: HandHistory, number: number): PushPayload {
  const tag = hand.tag ? TAG_LABELS[hand.tag] ?? hand.tag : null;
  const pot = potTotal(hand);
  const parts = [
    hand.winners.length > 0 ? `${hand.winners.join("·")} 승` : null,
    pot > 0 ? `팟 ${formatAmount(pot)}` : null,
    hand.memo.trim() ? hand.memo.trim().slice(0, 40) : null,
  ].filter(Boolean);
  return {
    title: `🃏 핸드 #${number}${tag ? ` · ${tag}` : ""}`,
    body: parts.length > 0 ? parts.join(" · ") : "새 핸드 기록",
    tag: `hand-${hand.id}`,
  };
}
