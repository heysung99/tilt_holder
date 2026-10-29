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
