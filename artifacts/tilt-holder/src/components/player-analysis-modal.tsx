import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { type HistoricalRecord } from '@/data/history';
import {
  type Player,
  type PlayerName,
  computePlayerStats,
  computeRadarData,
  formatManwon,
  overallRanking,
} from '@/lib/player-stats';

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'positive' | 'negative' }) {
  const color = tone === 'positive' ? 'text-[#16a34a]' : tone === 'negative' ? 'text-[#dc2626]' : 'text-[#20253a]';
  return (
    <div className="rounded-xl bg-[#fafaf6] p-3 text-center">
      <p className="text-[10px] font-semibold text-[#858a9b]">{label}</p>
      <p className={`mono mt-1 text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

export default function PlayerAnalysisModal({
  playerName,
  users,
  historicalRecords,
  onClose,
}: {
  playerName: PlayerName;
  users: Player[];
  historicalRecords: HistoricalRecord[];
  onClose: () => void;
}) {
  const stats = computePlayerStats(playerName, historicalRecords);
  const radarData = computeRadarData(playerName, users, historicalRecords);
  const rankInfo = overallRanking(users, historicalRecords).get(playerName);
  const trendData = stats.history.map((value, index) => ({ game: `${index + 1}`, value }));
  const trendColor = stats.net >= 0 ? '#16a34a' : '#dc2626';
  let runningTotal = 0;
  const cumulativeData = stats.history.map((value, index) => {
    runningTotal += value;
    return { game: `${index + 1}`, cumulative: runningTotal };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="rise-in max-h-[88vh] w-full max-w-[420px] overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ececf0] pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-[#20253a]">{playerName}</h3>
            {rankInfo ? (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${rankInfo.tier.className}`}>
                <span>{rankInfo.tier.icon}</span>
                <span>{rankInfo.tier.label}</span>
              </span>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f1f1ee] px-3 py-1 text-xs font-bold text-[#697087]" data-testid="button-close-player-analysis">닫기</button>
        </div>

        {stats.played === 0 ? (
          <p className="mt-6 text-sm text-[#858a9b]">아직 참여한 게임이 없습니다.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <StatTile label="총 순손익" value={formatManwon(stats.net)} tone={stats.net >= 0 ? 'positive' : 'negative'} />
              <StatTile label="참여 횟수" value={`${stats.played}회`} />
              <StatTile label="승률" value={`${Math.round(stats.winRate * 100)}% (${stats.wins}승 ${stats.losses}패)`} />
              <StatTile label="평균 손익" value={formatManwon(stats.avg)} tone={stats.avg >= 0 ? 'positive' : 'negative'} />
              <StatTile label="최고 기록" value={formatManwon(stats.best)} tone="positive" />
              <StatTile label="최저 기록" value={formatManwon(stats.worst)} tone="negative" />
            </div>

            {radarData ? (
              <div className="mt-6">
                <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">player profile</p>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="75%">
                      <PolarGrid stroke="#dfe1ee" />
                      <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: '#697087' }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="value" stroke="#2d3d8f" fill="#2d3d8f" fillOpacity={0.35} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}

            <div className="mt-6">
              <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">cumulative profit trend</p>
              <div className="mt-2 h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={trendColor} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ececf0" vertical={false} />
                    <XAxis dataKey="game" tick={{ fontSize: 10, fill: '#a0a4b1' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a0a4b1' }} axisLine={false} tickLine={false} width={32} />
                    <ReferenceLine y={0} stroke="#a0a4b1" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="cumulative" stroke={trendColor} strokeWidth={2} fill="url(#cumulativeFill)" dot={{ r: 3, fill: trendColor, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-6">
              <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">game-by-game net</p>
              <div className="mt-2 h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ececf0" vertical={false} />
                    <XAxis dataKey="game" tick={{ fontSize: 10, fill: '#a0a4b1' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#a0a4b1' }} axisLine={false} tickLine={false} width={32} />
                    <Bar dataKey="value" radius={[4, 4, 4, 4]}>
                      {trendData.map((entry, index) => (
                        <Cell key={index} fill={entry.value >= 0 ? '#16a34a' : '#dc2626'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
