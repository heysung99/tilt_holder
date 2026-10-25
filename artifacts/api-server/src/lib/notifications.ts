import type { PushPayload } from "./push.js";

const RANKED_MIN_GAMES = 5;
const MAX_LISTED = 4;

type GameResults = { results: unknown };
export type RankEntry = { name: string; rank: number };

const formatManwon = (value: number) => `${value > 0 ? "+" : ""}${Math.round(value * 10) / 10}만원`;

function formatDate(date: string) {
  const [, month, day] = date.split("-");
  return month && day ? `${month}.${day}` : date;
}

function listWithOverflow(items: string[]) {
  const shown = items.slice(0, MAX_LISTED).join(", ");
  return items.length > MAX_LISTED ? `${shown} 외 ${items.length - MAX_LISTED}명` : shown;
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
  const names = Array.isArray(participantNames) ? participantNames.filter((n): n is string => typeof n === "string") : [];
  return {
    title: `🎲 새 게임 개설 · ${formatDate(date)}`,
    body: names.length ? `참가자 ${names.length}명: ${listWithOverflow(names)}` : "새 게임이 열렸어요.",
    tag: `game-created-${date}`,
  };
}

export function buyInChangePayload(previous: unknown, next: unknown): PushPayload | null {
  const before = (previous ?? {}) as Record<string, number>;
  const after = (next ?? {}) as Record<string, number>;
  const changes = Object.entries(after)
    .map(([name, count]) => ({ name, count, delta: count - (before[name] ?? 0) }))
    .filter((change) => change.delta !== 0)
    .map(({ name, count, delta }) => `${name} ${delta > 0 ? "+" : ""}${delta} (총 ${count}회)`);
  if (changes.length === 0) return null;
  return { title: "💰 바이인 변동", body: listWithOverflow(changes), tag: "buy-in" };
}

export function settlementPayloads(
  date: string,
  results: Record<string, number>,
  rankingBefore: RankEntry[],
  rankingAfter: RankEntry[],
): PushPayload[] {
  const winners = Object.entries(results)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => `${name} ${formatManwon(value)}`);

  const previousRank = new Map(rankingBefore.map((entry) => [entry.name, entry.rank]));
  const rankChanges = rankingAfter
    .filter((entry) => previousRank.get(entry.name) !== entry.rank)
    .map((entry) => {
      const before = previousRank.get(entry.name);
      return before === undefined ? `${entry.name} 신규 ${entry.rank}위` : `${entry.name} ${before}→${entry.rank}위`;
    });

  const lines = [`결과: ${listWithOverflow(winners)}`];
  if (rankChanges.length) lines.push(`랭킹 변동: ${listWithOverflow(rankChanges)}`);

  const payloads: PushPayload[] = [
    { title: `🏁 정산 완료 · ${formatDate(date)}`, body: lines.join("\n"), tag: `settled-${date}` },
  ];

  const oldLeader = rankingBefore[0]?.name;
  const newLeader = rankingAfter[0]?.name;
  if (newLeader && newLeader !== oldLeader) {
    payloads.push({
      title: "👑 전체 랭킹 1위 변동",
      body: oldLeader ? `${newLeader}님이 ${oldLeader}님을 제치고 1위에 올랐어요!` : `${newLeader}님이 1위에 올랐어요!`,
      tag: "leader",
    });
  }
  return payloads;
}
