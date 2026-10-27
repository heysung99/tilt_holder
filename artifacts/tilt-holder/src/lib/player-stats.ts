import { type HistoricalRecord } from '@/data/history';

export type PlayerName = string;

export type Player = {
  name: PlayerName;
  score: number;
  color: string;
  text: string;
};

export type Tier = { label: string; icon: string; className: string };

// Every tier shares one badge shape (see TierBadge); only these colors differ.
const TIERS: Record<string, Tier> = {
  챌린저: { label: '챌린저', icon: '👑', className: 'border-[#efc94c] bg-gradient-to-b from-[#fff8d6] to-[#ffe68a] text-[#7a5600]' },
  그랜드마스터: { label: '그랜드마스터', icon: '🔥', className: 'border-[#f4a99f] bg-gradient-to-b from-[#fff0ee] to-[#ffd3cc] text-[#b42318]' },
  마스터: { label: '마스터', icon: '🔮', className: 'border-[#d4b0fa] bg-gradient-to-b from-[#f8f0ff] to-[#ead8ff] text-[#7e22ce]' },
  다이아: { label: '다이아', icon: '💎', className: 'border-[#a9d6f5] bg-gradient-to-b from-[#f0f9ff] to-[#d9effd] text-[#0369a1]' },
  플래티넘: { label: '플래티넘', icon: '🛡️', className: 'border-[#9fe0d1] bg-gradient-to-b from-[#effcf8] to-[#d3f5ec] text-[#0f766e]' },
  골드: { label: '골드', icon: '🥇', className: 'border-[#f0d77a] bg-gradient-to-b from-[#fffcea] to-[#fdf2b8] text-[#a16207]' },
  실버: { label: '실버', icon: '🥈', className: 'border-[#d3dbe5] bg-gradient-to-b from-[#fafbfd] to-[#e9eef4] text-[#475569]' },
  브론즈: { label: '브론즈', icon: '🥉', className: 'border-[#f2c59a] bg-gradient-to-b from-[#fff6ec] to-[#fde3c8] text-[#9a3412]' },
  아이언: { label: '아이언', icon: '⚙️', className: 'border-[#d9d6d3] bg-gradient-to-b from-[#f8f8f7] to-[#e9e7e5] text-[#57534e]' },
};

export function rankingTier(rank: number, total: number): Tier {
  if (rank === 1) return TIERS.챌린저;
  if (rank === 2) return TIERS.그랜드마스터;
  if (rank === 3) return TIERS.마스터;
  const otherRank = rank - 4;
  const otherCount = Math.max(total - 3, 1);
  const tierIndex = Math.min(5, Math.floor((otherRank * 6) / otherCount));
  return [TIERS.다이아, TIERS.플래티넘, TIERS.골드, TIERS.실버, TIERS.브론즈, TIERS.아이언][tierIndex];
}

const TIER_ORDER = ['챌린저', '그랜드마스터', '마스터', '다이아', '플래티넘', '골드', '실버', '브론즈', '아이언'];

// Higher is better; compares two tiers from rankingTier.
export function tierLevel(label: string) {
  return TIER_ORDER.length - TIER_ORDER.indexOf(label);
}

// Overall ranking counting only the games up to and including dateIndex, ordered
// like the ranking card (net, then win rate, then games played).
export function rankingAtDate(users: Player[], historicalRecords: HistoricalRecord[], dateIndex: number) {
  const stats = users
    .map((player) => {
      const values = (historicalRecords.find((item) => item.name === player.name)?.values ?? []).slice(0, dateIndex + 1);
      const playedValues = values.filter((val): val is number => val !== null && val !== undefined);
      const wins = playedValues.filter((val) => val > 0).length;
      return {
        name: player.name,
        played: playedValues.length,
        net: playedValues.reduce((sum, val) => sum + val, 0),
        winRate: playedValues.length ? wins / playedValues.length : 0,
      };
    })
    .sort((a, b) => b.net - a.net || b.winRate - a.winRate || b.played - a.played);

  const ranked = stats.filter((stat) => stat.played >= 5);
  const rankMap = new Map<PlayerName, { rank: number; tier: Tier }>();
  ranked.forEach((stat, index) => {
    rankMap.set(stat.name, { rank: index + 1, tier: rankingTier(index + 1, ranked.length) });
  });
  return rankMap;
}

export function overallRanking(users: Player[], historicalRecords: HistoricalRecord[]) {
  const stats = users
    .map((player) => {
      const record = historicalRecords.find((item) => item.name === player.name);
      const values = record?.values ?? [];
      const playedValues = values.filter((val): val is number => val !== null && val !== undefined);
      return { name: player.name, played: playedValues.length, net: playedValues.reduce((sum, val) => sum + val, 0) };
    })
    .sort((a, b) => b.net - a.net);

  const ranked = stats.filter((stat) => stat.played >= 5);
  const rankMap = new Map<PlayerName, { rank: number; tier: Tier }>();
  ranked.forEach((stat, index) => {
    rankMap.set(stat.name, { rank: index + 1, tier: rankingTier(index + 1, ranked.length) });
  });
  return rankMap;
}

export type PlayerStats = {
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  net: number;
  avg: number;
  best: number;
  worst: number;
  stdDev: number;
  history: number[];
};

export function computePlayerStats(name: PlayerName, historicalRecords: HistoricalRecord[]): PlayerStats {
  const record = historicalRecords.find((item) => item.name === name);
  const history = (record?.values ?? []).filter((val): val is number => val !== null && val !== undefined);
  const played = history.length;
  const wins = history.filter((val) => val > 0).length;
  const losses = played - wins;
  const winRate = played > 0 ? wins / played : 0;
  const net = history.reduce((sum, val) => sum + val, 0);
  const avg = played > 0 ? net / played : 0;
  const best = played > 0 ? Math.max(...history) : 0;
  const worst = played > 0 ? Math.min(...history) : 0;
  const variance = played > 0 ? history.reduce((sum, val) => sum + (val - avg) ** 2, 0) / played : 0;
  const stdDev = Math.sqrt(variance);
  return { played, wins, losses, winRate, net, avg, best, worst, stdDev, history };
}

export function normalizeToScale(value: number, pool: number[]) {
  if (pool.length === 0) return 50;
  const min = Math.min(...pool);
  const max = Math.max(...pool);
  if (max === min) return 50;
  return Math.round(((value - min) / (max - min)) * 100);
}

export function computeRadarData(name: PlayerName, users: Player[], historicalRecords: HistoricalRecord[]) {
  const allStats = users.map((user) => ({ name: user.name, ...computePlayerStats(user.name, historicalRecords) }));
  const target = allStats.find((stat) => stat.name === name);
  const withGames = allStats.filter((stat) => stat.played > 0);
  if (!target || target.played === 0 || withGames.length === 0) return null;

  const profitScore = normalizeToScale(target.avg, withGames.map((stat) => stat.avg));
  const winRateScore = Math.round(target.winRate * 100);
  const experienceScore = normalizeToScale(target.played, withGames.map((stat) => stat.played));
  const explosiveScore = normalizeToScale(target.best, withGames.map((stat) => stat.best));
  const consistentPool = withGames.filter((stat) => stat.played >= 2).map((stat) => stat.stdDev);
  const consistencyScore = target.played >= 2 && consistentPool.length > 0
    ? 100 - normalizeToScale(target.stdDev, consistentPool)
    : 50;

  return [
    { axis: '수익력', value: profitScore },
    { axis: '승률', value: winRateScore },
    { axis: '꾸준함', value: consistencyScore },
    { axis: '경험치', value: experienceScore },
    { axis: '폭발력', value: explosiveScore },
  ];
}

export function formatManwon(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}만원`;
}
