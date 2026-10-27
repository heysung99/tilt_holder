import { type HistoricalRecord } from '@/data/history';
import {
  MATCHUP_MIN_GAMES,
  type Player,
  type PlayerName,
  computeMatchup,
  formatManwon,
  matchupVerdict,
} from '@/lib/player-stats';

const RECENT_GAMES = 5;

function formatGameDate(date: string | undefined, index: number) {
  if (!date) return `${index + 1}번째 게임`;
  const [year, month, day] = date.split('-');
  return `${year.slice(2)}.${month}.${day}`;
}

const amountColor = (value: number) => (value > 0 ? 'text-[#16a34a]' : value < 0 ? 'text-[#dc2626]' : 'text-[#858a9b]');

// Everyone who has sat at a table with the player, most shared games first.
export function MatchupPicker({
  playerName,
  users,
  historicalRecords,
  onPick,
}: {
  playerName: PlayerName;
  users: Player[];
  historicalRecords: HistoricalRecord[];
  onPick: (opponent: PlayerName) => void;
}) {
  const opponents = users
    .filter((user) => user.name !== playerName)
    .map((user) => ({ name: user.name, matchup: computeMatchup(playerName, user.name, historicalRecords) }))
    .filter((item) => item.matchup.together > 0)
    .sort((a, b) => b.matchup.together - a.matchup.together);

  if (opponents.length === 0) {
    return <p className="mt-6 text-sm text-[#858a9b]">아직 함께 플레이한 사람이 없어요.</p>;
  }
  return (
    <div className="mt-4" data-testid="matchup-picker">
      <p className="text-xs text-[#858a9b]">상대를 고르면 둘이 함께한 게임만으로 상성을 보여줘요.</p>
      <div className="mt-3 divide-y divide-[#ececf0] rounded-2xl border border-[#ececf0]">
        {opponents.map(({ name, matchup }) => (
          <button
            key={name}
            type="button"
            onClick={() => onPick(name)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f8f9ff]"
            data-testid={`matchup-opponent-${name}`}
          >
            <span className="flex-1 text-sm font-bold text-[#20253a]">{name}</span>
            <span className="text-xs text-[#858a9b]">{matchup.together}판 함께</span>
            <span className="mono w-[74px] text-right text-xs font-bold text-[#2d3d8f]">{matchup.aAhead}승 {matchup.bAhead}패</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MatchupView({
  playerName,
  opponent,
  historicalRecords,
  historyDates,
}: {
  playerName: PlayerName;
  opponent: PlayerName;
  historicalRecords: HistoricalRecord[];
  historyDates?: string[];
}) {
  const matchup = computeMatchup(playerName, opponent, historicalRecords);
  const verdict = matchupVerdict(playerName, opponent, matchup);
  const decided = matchup.aAhead + matchup.bAhead + matchup.ties;
  const aShare = decided ? (matchup.aAhead / decided) * 100 : 50;
  const tieShare = decided ? (matchup.ties / decided) * 100 : 0;
  const recent = matchup.games.slice(-RECENT_GAMES).reverse();

  return (
    <div className="mt-4" data-testid="matchup-view">
      <div className="rounded-2xl bg-gradient-to-br from-[#2d3d8f] to-[#202e74] px-4 py-5 text-center text-white">
        <p className="text-3xl">{verdict.emoji}</p>
        <p className="mt-1 text-lg font-extrabold tracking-[-0.03em]" data-testid="text-matchup-verdict">{verdict.title}</p>
        <p className="mt-1.5 break-keep text-xs leading-relaxed text-[#cbd1f2]">{verdict.detail}</p>
      </div>

      {matchup.together > 0 ? (
        <>
          <div className="mt-4">
            <div className="flex items-end justify-between">
              <p className="text-sm font-bold text-[#20253a]">{playerName} <span className="mono text-lg text-[#2d3d8f]">{matchup.aAhead}</span></p>
              <p className="mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#858a9b]">head to head · {matchup.together}판</p>
              <p className="text-sm font-bold text-[#20253a]"><span className="mono text-lg text-[#c0392b]">{matchup.bAhead}</span> {opponent}</p>
            </div>
            <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-[#f1f1ee]">
              <span className="h-full bg-[#2d3d8f]" style={{ width: `${aShare}%` }} />
              <span className="h-full bg-[#d5d7e0]" style={{ width: `${tieShare}%` }} />
              <span className="h-full flex-1 bg-[#e0796c]" />
            </div>
            <p className="mt-1 text-center text-[10px] text-[#a0a4b1]">그 게임에서 누가 더 많이 땄는지 기준{matchup.ties ? ` · 같음 ${matchup.ties}` : ''}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { name: playerName, withAvg: matchup.aAvgWith, overall: matchup.aAvgOverall, other: opponent },
              { name: opponent, withAvg: matchup.bAvgWith, overall: matchup.bAvgOverall, other: playerName },
            ].map((side) => {
              const diff = side.withAvg - side.overall;
              return (
                <div key={side.name} className="rounded-xl bg-[#fafaf6] p-3">
                  <p className="text-[11px] font-bold text-[#596078]">{side.name}</p>
                  <p className={`mono mt-1 text-base font-bold ${amountColor(side.withAvg)}`}>{formatManwon(side.withAvg)}</p>
                  <p className="text-[10px] text-[#858a9b]">함께할 때 평균</p>
                  <p className="mt-1.5 break-keep text-[10px] leading-snug text-[#697087]">
                    평소 {formatManwon(side.overall)} → {side.other} 있으면{' '}
                    <span className={`font-bold ${amountColor(diff)}`}>{diff >= 0 ? '+' : ''}{(Math.round(diff * 10) / 10).toFixed(1)}만</span>
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <div className="grid grid-cols-[1fr_auto_auto] items-end gap-3 px-3">
              <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">recent games</p>
              <span className="w-[70px] text-right text-[10px] font-bold text-[#858a9b]">{playerName}</span>
              <span className="w-[70px] text-right text-[10px] font-bold text-[#858a9b]">{opponent}</span>
            </div>
            <div className="mt-1.5 divide-y divide-[#ececf0] rounded-xl border border-[#ececf0]">
              {recent.map((game) => (
                <div key={game.index} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 text-xs">
                  <span className="mono text-[#858a9b]">{formatGameDate(historyDates?.[game.index], game.index)}</span>
                  <span className={`mono w-[70px] text-right font-bold ${amountColor(game.a)} ${game.a > game.b ? 'underline decoration-2 underline-offset-2' : ''}`}>{formatManwon(game.a)}</span>
                  <span className={`mono w-[70px] text-right font-bold ${amountColor(game.b)} ${game.b > game.a ? 'underline decoration-2 underline-offset-2' : ''}`}>{formatManwon(game.b)}</span>
                </div>
              ))}
            </div>
          </div>
          {matchup.together < MATCHUP_MIN_GAMES ? null : (
            <p className="mt-3 text-center text-[10px] text-[#a0a4b1]">같이 참여한 게임만으로 계산했어요.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
