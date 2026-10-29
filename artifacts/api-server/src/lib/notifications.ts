import type { PushPayload } from "./push.js";

const RANKED_MIN_GAMES = 5;
const MAX_LISTED = 3;

type GameResults = { results: unknown };
export type RankEntry = { name: string; rank: number };

const formatManwon = (value: number) => `${value > 0 ? "+" : ""}${Math.round(value * 10) / 10}만`;

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  return month && day ? `${month}.${day}` : date;
}

function listWithOverflow(items: string[]) {
  const shown = items.slice(0, MAX_LISTED).join(" · ");
  return items.length > MAX_LISTED ? `${shown} 외 ${items.length - MAX_LISTED}` : shown;
}

// Same ordering and threshold as the ranking tab's "전체" view.
export function computeOverallRanking(games: GameResults[]): RankEntry[] {
  const stats = new Map<string, { net: number; played: number; wins: number }>();
  for (const game of games) {
    for (const [name, value] of Object.entries((game.results ?? {}) as Record<string, unknown>)) {
      if (typeof value !== "number") continue;
      const stat = stats.get(name) ?? { net: 0, played: 0, wins: 0 };
      stat.net += value;
      stat.played += 1;
      if (value > 0) stat.wins += 1;
      stats.set(name, stat);
    }
  }
  return [...stats]
    .filter(([, stat]) => stat.played >= RANKED_MIN_GAMES)
    .map(([name, stat]) => ({ name, ...stat, winRate: stat.wins / stat.played }))
    .sort((a, b) => b.net - a.net || b.winRate - a.winRate || b.played - a.played)
    .map((stat, index) => ({ name: stat.name, rank: index + 1 }));
}

export function gameCreatedPayload(date: string, participantNames: unknown): PushPayload {
  const count = Array.isArray(participantNames) ? participantNames.length : 0;
  return {
    title: "🎲 게임 개설",
    body: count ? `${formatDate(date)} · ${count}명` : formatDate(date),
    tag: `game-created-${date}`,
  };
}

export function buyInChangePayload(previous: unknown, next: unknown): PushPayload | null {
  const before = (previous ?? {}) as Record<string, number>;
  const after = (next ?? {}) as Record<string, number>;
  const changes = Object.entries(after)
    .map(([name, count]) => ({ name, delta: count - (before[name] ?? 0) }))
    .filter((change) => change.delta !== 0)
    .map(({ name, delta }) => `${name} ${delta > 0 ? "+" : ""}${delta}`);
  if (changes.length === 0) return null;
  return { title: "💰 바이인", body: listWithOverflow(changes), tag: "buy-in" };
}

export function settlementPayloads(
  date: string,
  results: Record<string, number>,
  rankingBefore: RankEntry[],
  rankingAfter: RankEntry[],
  gameNumber?: number,
): PushPayload[] {
  const [winnerName, winnerNet] = Object.entries(results).sort(([, a], [, b]) => b - a)[0] ?? [];

  const previousRank = new Map(rankingBefore.map((entry) => [entry.name, entry.rank]));
  const rankChanges = rankingAfter
    .filter((entry) => previousRank.get(entry.name) !== entry.rank)
    .map((entry) => {
      const before = previousRank.get(entry.name);
      if (before === undefined) return `${entry.name} NEW ${entry.rank}위`;
      return `${entry.name} ${entry.rank < before ? "▲" : "▼"}${entry.rank}위`;
    });

  const lines: string[] = [];
  if (winnerName !== undefined && winnerNet !== undefined) lines.push(`1등 ${winnerName} ${formatManwon(winnerNet)}`);
  if (rankChanges.length) lines.push(listWithOverflow(rankChanges));

  const payloads: PushPayload[] = [
    { title: `🏁 ${gameNumber ? `제${gameNumber}회 ` : ""}정산 완료 · ${formatDate(date)}`, body: lines.join("\n"), tag: `settled-${date}` },
  ];

  const oldLeader = rankingBefore[0]?.name;
  const newLeader = rankingAfter[0]?.name;
  if (newLeader && newLeader !== oldLeader) {
    payloads.push({
      title: "👑 1위 교체",
      body: oldLeader ? `${oldLeader} → ${newLeader}` : newLeader,
      tag: "leader",
    });
  }
  return payloads;
}

// Same split as the app's rankingTier: top three by rank, everyone else in six bands.
const LOWER_TIERS = ["💎다이아", "🛡️플래티넘", "🥇골드", "🥈실버", "🥉브론즈", "⚙️아이언"];
export function tierFor(rank: number, total: number) {
  if (rank === 1) return "👑챌린저";
  if (rank === 2) return "🔥그랜드마스터";
  if (rank === 3) return "🔮마스터";
  const index = Math.min(5, Math.floor(((rank - 4) * 6) / Math.max(total - 3, 1)));
  return LOWER_TIERS[index];
}

const TIER_ORDER = ["👑챌린저", "🔥그랜드마스터", "🔮마스터", ...LOWER_TIERS];

function tierChanges(rankingBefore: RankEntry[], rankingAfter: RankEntry[]) {
  const before = new Map(rankingBefore.map((entry) => [entry.name, tierFor(entry.rank, rankingBefore.length)]));
  const changes: string[] = [];
  for (const entry of rankingAfter) {
    const next = tierFor(entry.rank, rankingAfter.length);
    const previous = before.get(entry.name);
    if (previous === next) continue;
    if (previous === undefined) changes.push(`${entry.name} ${next} 배치`);
    else changes.push(`${entry.name} ${next} ${TIER_ORDER.indexOf(next) < TIER_ORDER.indexOf(previous) ? "승급⬆️" : "강등⬇️"}`);
  }
  return changes;
}

const STREAK_NEWS_MIN = 3;

// Win (+) or loss (−) streak ending at the player's last game; a game they skipped
// doesn't break it, and anything but a profit counts as a loss like the ranking does.
export function streakOf(values: number[]) {
  let streak = 0;
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const win = values[index] > 0;
    if (streak === 0) streak = win ? 1 : -1;
    else if (win === (streak > 0)) streak += win ? 1 : -1;
    else break;
  }
  return streak;
}

function streakNews(games: { date: string; results: unknown }[], date: string) {
  const ordered = [...games].sort((a, b) => a.date.localeCompare(b.date));
  // Only a game settled as the latest date extends anyone's current streak.
  if (ordered[ordered.length - 1]?.date !== date) return [];
  const results = (ordered[ordered.length - 1].results ?? {}) as Record<string, unknown>;
  const news: string[] = [];
  for (const name of Object.keys(results)) {
    const values = ordered
      .map((game) => ((game.results ?? {}) as Record<string, unknown>)[name])
      .filter((value): value is number => typeof value === "number");
    const now = streakOf(values);
    const before = streakOf(values.slice(0, -1));
    if (now >= STREAK_NEWS_MIN) news.push(`🔥${name} ${now}연승`);
    else if (now <= -STREAK_NEWS_MIN) news.push(`🧊${name} ${-now}연패`);
    else if (before >= STREAK_NEWS_MIN) news.push(`${name} ${before}연승 마감`);
    else if (before <= -STREAK_NEWS_MIN) news.push(`${name} ${-before}연패 탈출`);
  }
  return news;
}

// Tier moves and notable streaks from a settlement, as one follow-up push.
export function settlementNewsPayload(
  date: string,
  games: { date: string; results: unknown }[],
  rankingBefore: RankEntry[],
  rankingAfter: RankEntry[],
): PushPayload | null {
  const lines: string[] = [];
  const tiers = tierChanges(rankingBefore, rankingAfter);
  const streaks = streakNews(games, date);
  if (tiers.length) lines.push(listWithOverflow(tiers));
  if (streaks.length) lines.push(listWithOverflow(streaks));
  if (lines.length === 0) return null;
  return { title: "📣 정산 소식 · 티어·연승", body: lines.join("\n"), tag: `settled-news-${date}` };
}
