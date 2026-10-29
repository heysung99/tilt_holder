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

export type Matchup = {
  together: number;
  // Who finished higher in each game both played.
  aAhead: number;
  bAhead: number;
  ties: number;
  // Each player's total over the shared games.
  aSum: number;
  bSum: number;
  aAvgWith: number;
  bAvgWith: number;
  aAvgOverall: number;
  bAvgOverall: number;
  // Shared games in play order, by index into the history dates.
  games: { index: number; a: number; b: number }[];
};

const playedAt = (values: (number | null)[] | undefined, index: number) => {
  const value = values?.[index];
  return value === null || value === undefined ? null : value;
};

export function computeMatchup(a: PlayerName, b: PlayerName, historicalRecords: HistoricalRecord[]): Matchup {
  const aValues = historicalRecords.find((record) => record.name === a)?.values;
  const bValues = historicalRecords.find((record) => record.name === b)?.values;
  const length = Math.max(aValues?.length ?? 0, bValues?.length ?? 0);
  const games: Matchup['games'] = [];
  for (let index = 0; index < length; index += 1) {
    const aResult = playedAt(aValues, index);
    const bResult = playedAt(bValues, index);
    if (aResult !== null && bResult !== null) games.push({ index, a: aResult, b: bResult });
  }
  const total = (values: number[]) => Math.round(values.reduce((sum, value) => sum + value, 0) * 10) / 10;
  const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  return {
    together: games.length,
    aAhead: games.filter((game) => game.a > game.b).length,
    bAhead: games.filter((game) => game.b > game.a).length,
    ties: games.filter((game) => game.a === game.b).length,
    aSum: total(games.map((game) => game.a)),
    bSum: total(games.map((game) => game.b)),
    aAvgWith: average(games.map((game) => game.a)),
    bAvgWith: average(games.map((game) => game.b)),
    aAvgOverall: computePlayerStats(a, historicalRecords).avg,
    bAvgOverall: computePlayerStats(b, historicalRecords).avg,
    games,
  };
}

// 이/가 after a Korean name, by whether its last syllable has a final consonant.
export function subjectParticle(name: string) {
  const code = name.charCodeAt(name.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '이' : '가';
}

// 은/는 after a Korean name, the same way.
export function topicParticle(name: string) {
  return subjectParticle(name) === '이' ? '은' : '는';
}

export const MATCHUP_MIN_GAMES = 3;

// Share of the decided shared games the first player finished ahead in.
export const headToHeadRate = (matchup: Matchup) => {
  const decided = matchup.aAhead + matchup.bAhead;
  return decided ? matchup.aAhead / decided : 0.5;
};

// How much a few shared games are trusted: the per-game average is pulled toward 0
// as if MATCHUP_SHRINK games at ±0 had been played too.
const MATCHUP_SHRINK = 5;
export const matchupScore = (matchup: Matchup) => (matchup.aAvgWith * matchup.together) / (matchup.together + MATCHUP_SHRINK);

// Only the clear-cut matchups get a name: winning more often (head-to-head ≥ 50%) and
// up money in shared games, or losing more often and down. Mixed ones go untagged.
export type MatchupKind = 'gukbap' | 'nemesis';
export const MATCHUP_KINDS: Record<MatchupKind, { emoji: string; label: string; detail: string }> = {
  gukbap: { emoji: '🍲', label: '든든 국밥', detail: '자주 이기고 돈도 따요' },
  nemesis: { emoji: '😈', label: '천적', detail: '자주 지고 돈도 잃어요' },
};
export function matchupKind(matchup: Matchup): MatchupKind | null {
  const winning = headToHeadRate(matchup) >= 0.5;
  const profiting = matchup.aSum > 0;
  if (winning && profiting) return 'gukbap';
  if (!winning && !profiting) return 'nemesis';
  return null;
}

export function matchupVerdict(a: PlayerName, b: PlayerName, matchup: Matchup) {
  if (matchup.together < MATCHUP_MIN_GAMES) {
    return { emoji: '🤔', title: '아직 데이터 부족', detail: `함께한 게임이 ${MATCHUP_MIN_GAMES}판은 넘어야 상성을 볼 수 있어요.` };
  }
  // Told from a's side about b.
  const kind = matchupKind(matchup);
  const winning = headToHeadRate(matchup) >= 0.5;
  const verdict = kind === 'gukbap'
    ? { emoji: '🍲', title: `${b}${topicParticle(b)} ${a}의 든든 국밥` }
    : kind === 'nemesis'
      ? { emoji: '😈', title: `${b}${subjectParticle(b)} ${a}의 천적` }
      : { emoji: '⚖️', title: '승률과 돈이 엇갈리는 사이' };
  const summary = kind ? MATCHUP_KINDS[kind].detail : winning ? '자주 이기는데 돈은 잃어요' : '자주 지지만 돈은 따요';

  let detail = `${matchup.together}판 중 ${a} ${matchup.aAhead}번, ${b} ${matchup.bAhead}번 더 많이 땄고 ${a} 합계는 ${formatManwon(matchup.aSum)}. ${summary}.`;
  if (matchup.aAvgWith > 0 && matchup.bAvgWith > 0) detail += ' 같이 치면 둘 다 따는 사이 💰';
  else if (matchup.aAvgWith < 0 && matchup.bAvgWith < 0) detail += ' 같이 치면 둘 다 털리는 사이 💸';
  return { ...verdict, detail };
}

export const VERDICT_MIN_GAMES = 3;
const RECENT_WINDOW = 5;

const mean = (values: number[]) => (values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0);
const percent = (rate: number) => `${Math.round(rate * 100)}%`;

// A blunt, numbers-first read on a player's record: an archetype headline from how they
// win and lose, then what the recent games say about where it's heading.
export function playerVerdict(name: PlayerName, users: Player[], historicalRecords: HistoricalRecord[]) {
  const stats = computePlayerStats(name, historicalRecords);
  const { played, winRate, net, avg, best, history } = stats;
  if (played < VERDICT_MIN_GAMES) {
    return {
      emoji: '🧪',
      title: '판단 보류',
      lines: [`${played}판은 표본이 아닙니다. 지금의 ${formatManwon(net)}은 실력보다 카드가 만든 숫자예요.`],
    };
  }

  const winsOnly = history.filter((val) => val > 0);
  const lossesOnly = history.filter((val) => val <= 0);
  const avgWin = mean(winsOnly);
  const avgLoss = mean(lossesOnly);
  const netWithoutBest = net - best;

  // Where the player's per-game average sits among everyone with a real sample.
  const pool = users
    .map((user) => computePlayerStats(user.name, historicalRecords))
    .filter((item) => item.played >= VERDICT_MIN_GAMES)
    .map((item) => item.avg)
    .sort((a, b) => b - a);
  const avgRank = pool.indexOf(avg) + 1;
  const topCut = Math.max(1, Math.ceil(pool.length * 0.2));
  const bottomCut = pool.length - topCut + 1;
  const sizes = `이긴 판 평균 ${formatManwon(avgWin)}, 진 판 평균 ${formatManwon(avgLoss)}`;
  const swing = mean(history.map((val) => Math.abs(val)));

  let verdict: { emoji: string; title: string; line: string };
  if (net > 0 && netWithoutBest <= 0 && played >= 5) {
    verdict = { emoji: '🎰', title: '한 판이 먹여 살리는 흑자', line: `누적 ${formatManwon(net)} 중 최고 한 판이 ${formatManwon(best)}. 그 판을 빼면 ${formatManwon(netWithoutBest)} — 실력이라 부르기엔 한 방 의존도가 너무 높습니다.` };
  } else if (Math.abs(avg) <= Math.max(0.5, swing * 0.25)) {
    verdict = { emoji: '🧱', title: '제자리걸음', line: `${played}판 누적 ${formatManwon(net)}, 판당 ${formatManwon(avg)}. ${sizes} — 오르내려도 결국 제자리, 테이블에 시간만 쓰고 있습니다.` };
  } else if (net > 0 && avgRank > 0 && avgRank <= topCut && pool.length >= 3) {
    verdict = { emoji: '🦈', title: '테이블의 포식자', line: winRate >= 0.5
      ? `${played}판 승률 ${percent(winRate)}, 판당 ${formatManwon(avg)}으로 평균 수익 ${avgRank}위. 이 표본이면 운이 아니라 실력입니다.`
      : `승률 ${percent(winRate)}로도 판당 ${formatManwon(avg)}, 평균 수익 ${avgRank}위. ${sizes} — 지는 판을 작게 끊을 줄 압니다.` };
  } else if (net > 0 && winRate >= 0.5) {
    verdict = avgWin >= -avgLoss
      ? { emoji: '📈', title: '구조가 탄탄한 흑자', line: `${sizes}. 자주 이기고, 이길 때 더 가져갑니다. 약점이 숫자에 안 보입니다.` }
      : { emoji: '⚖️', title: '승률로 버티는 흑자', line: `${sizes}. 질 때 더 크게 잃는데 자주 이겨서 메우는 구조라, 승률이 꺾이면 바로 적자입니다.` };
  } else if (net > 0) {
    verdict = { emoji: '🎯', title: '적게 이기고 크게 먹는다', line: `승률 ${percent(winRate)}로 지는 판이 더 많지만 ${sizes}. 손익비 하나로 먹고사는 스타일입니다.` };
  } else if (winRate >= 0.5) {
    verdict = { emoji: '🩸', title: '자주 이기고 크게 진다', line: `승률 ${percent(winRate)}인데 누적 ${formatManwon(net)}. ${sizes} — 문제는 승률이 아니라 손절입니다.` };
  } else if (avgRank >= bottomCut && pool.length >= 3) {
    verdict = { emoji: '💸', title: '테이블의 기부천사', line: `${played}판 누적 ${formatManwon(net)}, 판당 ${formatManwon(avg)}으로 평균 수익 꼴찌권. 이 테이블의 수익 상당 부분이 여기서 나옵니다.` };
  } else {
    verdict = { emoji: '📉', title: '구조적인 적자', line: avgWin >= -avgLoss
      ? `승률 ${percent(winRate)}, ${sizes}. 이길 때 크기는 충분한데 너무 자주 집니다 — 들어가는 판부터 줄여야 합니다.`
      : `승률 ${percent(winRate)}, ${sizes}. 이기는 횟수도 크기도 모자랍니다.` };
  }

  const lines = [verdict.line];
  if (played >= RECENT_WINDOW + 1) {
    const recentAvg = mean(history.slice(-RECENT_WINDOW));
    const diff = recentAvg - avg;
    const threshold = Math.max(1, stats.stdDev * 0.35);
    if (diff >= threshold) lines.push(`최근 ${RECENT_WINDOW}판 평균 ${formatManwon(recentAvg)}, 평소보다 ${Math.abs(diff).toFixed(1)}만원 좋습니다. 상승세는 맞지만 아직 ${RECENT_WINDOW}판짜리 상승세입니다.`);
    else if (diff <= -threshold) lines.push(`최근 ${RECENT_WINDOW}판 평균 ${formatManwon(recentAvg)}, 평소보다 ${Math.abs(diff).toFixed(1)}만원 나쁩니다. 틸트 경보.`);
    else lines.push(`최근 ${RECENT_WINDOW}판 평균 ${formatManwon(recentAvg)} — 평소 흐름 그대로, 바뀐 건 없습니다.`);
  }
  return { emoji: verdict.emoji, title: verdict.title, lines };
}
