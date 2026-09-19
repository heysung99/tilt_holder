import { type HistoricalRecord } from '@/data/history';

export type PlayerName = string;

export type Player = {
  name: PlayerName;
  score: number;
  color: string;
  text: string;
};

export function rankingTier(rank: number, total: number) {
  if (rank === 1) return { label: '챌린저', icon: '👑', className: 'bg-gradient-to-r from-[#ffe17d] to-[#ffd000] text-[#523d00] border border-[#e6b800] shadow-xs font-extrabold' };
  if (rank === 2) return { label: '그랜드마스터', icon: '🔥', className: 'bg-gradient-to-r from-[#ff8d82] to-[#e63928] text-white border border-[#b82314] shadow-xs font-extrabold' };
  if (rank === 3) return { label: '마스터', icon: '🔮', className: 'bg-gradient-to-r from-[#d8b4fe] to-[#9333ea] text-white border border-[#7e22ce] shadow-xs font-bold' };
  const otherRank = rank - 4;
  const otherCount = Math.max(total - 3, 1);
  const tierIndex = Math.min(5, Math.floor((otherRank * 6) / otherCount));
  const tiers = [
    { label: '다이아', icon: '💎', className: 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]' },
    { label: '플래티넘', icon: '🛡️', className: 'bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]' },
    { label: '골드', icon: '🥇', className: 'bg-[#fef9c3] text-[#a16207] border border-[#fef08a]' },
    { label: '실버', icon: '🥈', className: 'bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]' },
    { label: '브론즈', icon: '🥉', className: 'bg-[#ffedd5] text-[#9a3412] border border-[#fed7aa]' },
    { label: '아이언', icon: '⚙️', className: 'bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb]' },
  ];
  return tiers[tierIndex];
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
  const rankMap = new Map<PlayerName, { rank: number; tier: ReturnType<typeof rankingTier> }>();
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
