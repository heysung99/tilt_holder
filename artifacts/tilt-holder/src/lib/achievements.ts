import { type HistoricalRecord } from '@/data/history';
import { type Player, type PlayerName, rankingAtDate } from '@/lib/player-stats';

const played = (value: number | null | undefined): value is number => value !== null && value !== undefined;

// Win (+) or loss (−) streak ending at the player's latest game. Skipped games don't
// break it, and anything but a profit is a loss, like the ranking's 승/패.
export function currentStreak(values: (number | null)[]) {
  const games = values.filter(played);
  let streak = 0;
  for (let index = games.length - 1; index >= 0; index -= 1) {
    const win = games[index] > 0;
    if (streak === 0) streak = win ? 1 : -1;
    else if (win === (streak > 0)) streak += win ? 1 : -1;
    else break;
  }
  return streak;
}

export const STREAK_SHOWN_FROM = 3;

export type Achievement = {
  id: string;
  icon: string;
  title: string;
  description: string;
  // Dubious honors get their own look.
  shame?: boolean;
  // Index into the history dates of the game that unlocked it, or null while locked.
  achievedAt: number | null;
};

type Definition = Omit<Achievement, 'achievedAt'> & {
  // Returns the first game index where the condition holds, or null.
  find: (context: Context) => number | null;
};

type Context = {
  name: PlayerName;
  values: (number | null)[];
  dates: string[];
  users: Player[];
  historicalRecords: HistoricalRecord[];
  buyIns: (Record<string, number> | null | undefined)[];
};

const firstIndex = (values: (number | null)[], test: (value: number, index: number) => boolean) => {
  const index = values.findIndex((value, i) => played(value) && test(value, i));
  return index === -1 ? null : index;
};

// First game where a run of `length` consecutive played games all pass `test`.
const firstRun = (values: (number | null)[], length: number, test: (value: number) => boolean) => {
  let run = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!played(value)) continue;
    run = test(value) ? run + 1 : 0;
    if (run >= length) return index;
  }
  return null;
};

// First game where the player has finished at the given end of the table `times` times.
const nthPlace = (context: Context, times: number, pick: (results: number[]) => number) => {
  let count = 0;
  for (let index = 0; index < context.values.length; index += 1) {
    const value = context.values[index];
    if (!played(value)) continue;
    const results = context.historicalRecords.map((record) => record.values[index]).filter(played);
    if (results.length >= 2 && value === pick(results)) count += 1;
    if (count >= times) return index;
  }
  return null;
};

const DEFINITIONS: Definition[] = [
  { id: 'first-win', icon: '🎉', title: '첫 승', description: '처음으로 플러스 마감', find: ({ values }) => firstIndex(values, (value) => value > 0) },
  { id: 'streak-3', icon: '🔥', title: '3연승', description: '3판 연속 플러스', find: ({ values }) => firstRun(values, 3, (value) => value > 0) },
  { id: 'streak-5', icon: '⚡', title: '5연승', description: '5판 연속 플러스', find: ({ values }) => firstRun(values, 5, (value) => value > 0) },
  { id: 'big-win', icon: '💰', title: '한방', description: '한 판에 +20만 이상', find: ({ values }) => firstIndex(values, (value) => value >= 20) },
  { id: 'jackpot', icon: '🚀', title: '잭팟', description: '한 판에 +30만 이상', find: ({ values }) => firstIndex(values, (value) => value >= 30) },
  { id: 'top-1', icon: '🥇', title: '오늘의 1등', description: '그날 최고 수익', find: (context) => nthPlace(context, 1, (results) => Math.max(...results)) },
  { id: 'top-5', icon: '🏅', title: '1등 수집가', description: '그날 1등 5회', find: (context) => nthPlace(context, 5, (results) => Math.max(...results)) },
  {
    id: 'throne',
    icon: '👑',
    title: '왕좌',
    description: '전체 랭킹 1위 등극',
    find: ({ name, values, users, historicalRecords }) => {
      for (let index = 0; index < values.length; index += 1) {
        if (played(values[index]) && rankingAtDate(users, historicalRecords, index).get(name)?.rank === 1) return index;
      }
      return null;
    },
  },
  { id: 'comeback', icon: '🔄', title: '연패 탈출', description: '3연패 뒤 바로 플러스', find: ({ values }) => {
    let losses = 0;
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      if (!played(value)) continue;
      if (value > 0 && losses >= 3) return index;
      losses = value > 0 ? 0 : losses + 1;
    }
    return null;
  } },
  { id: 'phoenix', icon: '🧟', title: '부활의 아이콘', description: '바이인 3번 이상 하고도 플러스', find: ({ name, values, buyIns }) => firstIndex(values, (value, index) => value > 0 && (buyIns[index]?.[name] ?? 0) >= 3) },
  {
    id: 'attendance',
    icon: '📅',
    title: '개근상',
    description: '10판 연속 출석',
    find: ({ values }) => {
      let run = 0;
      for (let index = 0; index < values.length; index += 1) {
        run = played(values[index]) ? run + 1 : 0;
        if (run >= 10) return index;
      }
      return null;
    },
  },
  { id: 'veteran', icon: '🎖️', title: '베테랑', description: '30판 참여', find: ({ values }) => {
    let count = 0;
    const index = values.findIndex((value) => played(value) && ++count >= 30);
    return index === -1 ? null : index;
  } },
  {
    id: 'season',
    icon: '🛡️',
    title: '흑자 시즌',
    description: '끝난 시즌을 5판 이상 플러스로 마감',
    find: ({ values, dates }) => {
      const currentYear = dates[dates.length - 1]?.slice(0, 4);
      const seasons = new Map<string, { net: number; games: number; last: number }>();
      values.forEach((value, index) => {
        const year = dates[index]?.slice(0, 4);
        if (!played(value) || !year || year === currentYear) return;
        const season = seasons.get(year) ?? { net: 0, games: 0, last: index };
        seasons.set(year, { net: season.net + value, games: season.games + 1, last: index });
      });
      const done = [...seasons.values()].filter((season) => season.games >= 5 && season.net > 0).map((season) => season.last);
      return done.length ? Math.min(...done) : null;
    },
  },
  { id: 'atm', icon: '🏧', title: 'ATM', description: '한 판에 바이인 4번 이상', shame: true, find: ({ name, values, buyIns }) => firstIndex(values, (_, index) => (buyIns[index]?.[name] ?? 0) >= 4) },
  { id: 'storm', icon: '🌧️', title: '폭우', description: '한 판에 -30만 이상', shame: true, find: ({ values }) => firstIndex(values, (value) => value <= -30) },
  { id: 'cold-5', icon: '🧊', title: '5연패', description: '5판 연속 마이너스', shame: true, find: ({ values }) => firstRun(values, 5, (value) => value <= 0) },
  { id: 'donor', icon: '💸', title: '기부천사', description: '그날 꼴찌 5회', shame: true, find: (context) => nthPlace(context, 5, (results) => Math.min(...results)) },
];

export const ACHIEVEMENT_COUNT = DEFINITIONS.length;

export function computeAchievements(
  name: PlayerName,
  users: Player[],
  historicalRecords: HistoricalRecord[],
  dates: string[],
  buyIns: (Record<string, number> | null | undefined)[],
): Achievement[] {
  const values = historicalRecords.find((record) => record.name === name)?.values ?? [];
  const context: Context = { name, values, dates, users, historicalRecords, buyIns };
  return DEFINITIONS.map(({ find, ...definition }) => ({ ...definition, achievedAt: find(context) }));
}
