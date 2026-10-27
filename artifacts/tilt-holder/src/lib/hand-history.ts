// Hand histories recorded during a game: who sat where, the betting on each
// street, the board and how the hand ended. Amounts are in 원; a call, bet,
// raise or all-in stores the player's total on that street after the action.
import { type Card, SUIT_SYMBOL, rankLabel } from './daily-fortune';

export type Street = 'preflop' | 'flop' | 'turn' | 'river';
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin';
export type HandAction = { street: Street; name: string; type: ActionType; amount?: number };

export type HandHistory = {
  id: string;
  time: string;
  // Seat order starting at the dealer button and going clockwise.
  seats: string[];
  blinds: { sb: number; bb: number } | null;
  actions: HandAction[];
  board: Card[];
  shown: Record<string, Card[]>;
  winners: string[];
  tag: string | null;
  memo: string;
};

export const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];
export const STREET_LABEL: Record<Street, string> = { preflop: '프리플랍', flop: '플랍', turn: '턴', river: '리버' };
// How many board cards are out once each street starts.
export const BOARD_SIZE: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };
export const ACTION_LABEL: Record<ActionType, string> = { fold: '폴드', check: '체크', call: '콜', bet: '벳', raise: '레이즈', allin: '올인' };

export const HAND_TAGS: { key: string; label: string }[] = [
  { key: 'allin', label: '🔥 올인' },
  { key: 'badbeat', label: '💥 배드빗' },
  { key: 'bluff', label: '🎭 블러프' },
  { key: 'cooler', label: '🧊 쿨러' },
  { key: 'bigpot', label: '💰 빅팟' },
  { key: 'monster', label: '🃏 대박 핸드' },
  { key: 'funny', label: '😂 명장면' },
  { key: 'etc', label: '✏️ 기타' },
];
export const tagLabel = (key: string | null) => (key ? HAND_TAGS.find((tag) => tag.key === key)?.label ?? key : null);

const MIDDLE_POSITIONS: Record<number, string[]> = {
  3: [],
  4: ['UTG'],
  5: ['UTG', 'CO'],
  6: ['UTG', 'HJ', 'CO'],
  7: ['UTG', 'LJ', 'HJ', 'CO'],
  8: ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO'],
  9: ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'],
  10: ['UTG', 'UTG+1', 'UTG+2', 'MP', 'LJ', 'HJ', 'CO'],
};

// Position names for a table of n, in seat order from the button.
export function positionLabels(n: number): string[] {
  if (n <= 1) return ['BTN'].slice(0, n);
  if (n === 2) return ['BTN/SB', 'BB'];
  const middle = MIDDLE_POSITIONS[n] ?? Array.from({ length: n - 3 }, (_, index) => `UTG+${index}`.replace('UTG+0', 'UTG'));
  return ['BTN', 'SB', 'BB', ...middle];
}

export function positionOf(hand: Pick<HandHistory, 'seats'>, name: string) {
  const index = hand.seats.indexOf(name);
  return index === -1 ? null : positionLabels(hand.seats.length)[index];
}

function blindSeats(n: number) {
  return n === 2 ? { sb: 0, bb: 1 } : { sb: 1, bb: 2 };
}

// Acting order for a street: preflop starts after the big blind, later streets
// start at the small blind (heads-up the button/SB acts first preflop, last after).
export function actingOrder(seats: string[], street: Street): string[] {
  const n = seats.length;
  if (n === 0) return [];
  const start = n === 2 ? (street === 'preflop' ? 0 : 1) : street === 'preflop' ? 3 % n : 1;
  return Array.from({ length: n }, (_, index) => seats[(start + index) % n]);
}

// Each player's total on the street so far (blinds included preflop).
export function committedOnStreet(hand: Pick<HandHistory, 'seats' | 'blinds' | 'actions'>, street: Street) {
  const committed: Record<string, number> = {};
  if (street === 'preflop' && hand.blinds && hand.seats.length >= 2) {
    const { sb, bb } = blindSeats(hand.seats.length);
    if (hand.blinds.sb > 0) committed[hand.seats[sb]] = hand.blinds.sb;
    if (hand.blinds.bb > 0) committed[hand.seats[bb]] = hand.blinds.bb;
  }
  for (const action of hand.actions) {
    if (action.street === street && action.amount !== undefined) committed[action.name] = action.amount;
  }
  return committed;
}

export const streetLevel = (committed: Record<string, number>) => Math.max(0, ...Object.values(committed));

export function potTotal(hand: Pick<HandHistory, 'seats' | 'blinds' | 'actions'>) {
  return STREETS.reduce((sum, street) => sum + Object.values(committedOnStreet(hand, street)).reduce((a, b) => a + b, 0), 0);
}

// Players out of the hand (folded) or unable to act (all in) before this street ends.
function playerStatus(hand: Pick<HandHistory, 'actions'>, street: Street) {
  const upTo = STREETS.indexOf(street);
  const folded = new Set<string>();
  const allIn = new Set<string>();
  for (const action of hand.actions) {
    if (STREETS.indexOf(action.street) > upTo) continue;
    if (action.type === 'fold') folded.add(action.name);
    if (action.type === 'allin') allIn.add(action.name);
  }
  return { folded, allIn };
}

export function playersInHand(hand: Pick<HandHistory, 'seats' | 'actions'>) {
  const { folded } = playerStatus(hand, 'river');
  return hand.seats.filter((name) => !folded.has(name));
}

// Who should act next on this street, or null once the betting there is closed.
export function nextToAct(hand: Pick<HandHistory, 'seats' | 'blinds' | 'actions'>, street: Street): string | null {
  const order = actingOrder(hand.seats, street);
  const { folded, allIn } = playerStatus(hand, street);
  const canAct = order.filter((name) => !folded.has(name) && !allIn.has(name));
  if (playersInHand(hand).length <= 1 || canAct.length === 0) return null;

  const streetActions = hand.actions.filter((action) => action.street === street);
  const committed = committedOnStreet(hand, street);
  const level = streetLevel(committed);
  const acted = new Set(streetActions.map((action) => action.name));
  // Everyone else still in is all in and this player has matched: nothing left to bet.
  if (canAct.length === 1 && (committed[canAct[0]] ?? 0) >= level) return null;

  const last = streetActions[streetActions.length - 1];
  const start = last ? (order.indexOf(last.name) + 1) % order.length : 0;
  for (let step = 0; step < order.length; step += 1) {
    const name = order[(start + step) % order.length];
    if (!canAct.includes(name)) continue;
    if (!acted.has(name) || (committed[name] ?? 0) < level) return name;
  }
  return null;
}

export function formatAmount(won: number) {
  if (won >= 10000) return `${Math.round((won / 10000) * 100) / 100}만`;
  if (won >= 1000 && won % 1000 === 0) return `${won / 1000}천`;
  return won.toLocaleString('ko-KR');
}

export function describeAction(action: HandAction) {
  const label = ACTION_LABEL[action.type];
  return action.amount !== undefined && action.type !== 'fold' && action.type !== 'check'
    ? `${label} ${formatAmount(action.amount)}`
    : label;
}

export const cardText = (card: Card) => `${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}`;

export function renameInHand(hand: HandHistory, from: string, to: string): HandHistory {
  const swap = (name: string) => (name === from ? to : name);
  const shown = Object.fromEntries(Object.entries(hand.shown).map(([name, cards]) => [swap(name), cards]));
  return {
    ...hand,
    seats: hand.seats.map(swap),
    actions: hand.actions.map((action) => ({ ...action, name: swap(action.name) })),
    shown,
    winners: hand.winners.map(swap),
  };
}

export function emptyHand(seats: string[] = [], blinds: HandHistory['blinds'] = null): HandHistory {
  return {
    id: `hand-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    time: new Date().toISOString(),
    seats,
    blinds,
    actions: [],
    board: [],
    shown: {},
    winners: [],
    tag: null,
    memo: '',
  };
}
