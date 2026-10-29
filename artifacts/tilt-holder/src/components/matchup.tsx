import { type HistoricalRecord } from '@/data/history';
import {
  MATCHUP_MIN_GAMES,
  type Player,
  type PlayerName,
  type Matchup,
  computeMatchup,
  formatManwon,
  headToHeadRate,
  matchupVerdict,
} from '@/lib/player-stats';

const RECENT_GAMES = 5;

function formatGameDate(date: string | undefined, index: number) {
  if (!date) return `제${index + 1}회`;
  const [year, month, day] = date.split('-');
  return `${year.slice(2)}.${month}.${day}`;
}

const amountColor = (value: number) => (value > 0 ? 'text-[#16a34a]' : value < 0 ? 'text-[#dc2626]' : 'text-[#858a9b]');

function BestWorstCard({ kind, name, matchup, onPick }: { kind: 'best' | 'worst'; name: PlayerName; matchup: Matchup; onPick: (name: PlayerName) => void }) {
  const best = kind === 'best';
  return (
    <button
      type="button"
      onClick={() => onPick(name)}
      className={`rounded-2xl border p-3 text-left ${best ? 'border-[#bfe3c9] bg-[#effaf2]' : 'border-[#f3c4bf] bg-[#fff2f0]'}`}
      data-testid={`matchup-${kind}`}
    >
      <p className={`text-[11px] font-bold ${best ? 'text-[#16803c]' : 'text-[#c0392b]'}`}>{best ? '😊 최고의 상성' : '😈 최악의 상성'}</p>
      <p className="mt-1 text-base font-extrabold text-[#20253a]">{name}</p>
      <p className="mono mt-0.5 text-[11px] font-bold text-[#596078]">{matchup.aAhead}승 {matchup.bAhead}패</p>
      <p className={`mono text-sm font-bold ${amountColor(matchup.aSum)}`}>{formatManwon(matchup.aSum)}</p>
    </button>
  );
}

// Everyone who has sat at a table with the player, most shared games first, with
// the best and worst matchups (by head-to-head, then money) pulled out on top.
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

  const ranked = opponents
    .filter((item) => item.matchup.together >= MATCHUP_MIN_GAMES)
    .sort((a, b) => headToHeadRate(b.matchup) - headToHeadRate(a.matchup) || b.matchup.aSum - a.matchup.aSum);
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;

  return (
    <div className="mt-4" data-testid="matchup-picker">
      {best ? (
        <div className={`grid gap-2 ${worst ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <BestWorstCard kind="best" name={best.name} matchup={best.matchup} onPick={onPick} />
          {worst ? <BestWorstCard kind="worst" name={worst.name} matchup={worst.matchup} onPick={onPick} /> : null}
        </div>
      ) : (
        <p className="rounded-xl bg-[#fafaf6] px-3 py-2 text-[11px] text-[#858a9b]">{MATCHUP_MIN_GAMES}판 이상 함께한 상대가 생기면 최고·최악의 상성을 보여줘요.</p>
      )}
      <p className="mt-4 text-xs text-[#858a9b]">상대를 고르면 둘이 함께한 게임만으로 상성을 보여줘요. 금액은 함께한 판에서 {playerName} 합계예요.</p>
      <div className="mt-2 divide-y divide-[#ececf0] rounded-2xl border border-[#ececf0]">
        {opponents.map(({ name, matchup }) => (
          <button
            key={name}
            type="button"
            onClick={() => onPick(name)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[#f8f9ff]"
            data-testid={`matchup-opponent-${name}`}
          >
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#20253a]">{name}</span>
              <span className="block text-[11px] text-[#858a9b]">{matchup.together}판 함께</span>
            </span>
            <span className="text-right">
              <span className="mono block text-xs font-bold text-[#2d3d8f]">{matchup.aAhead}승 {matchup.bAhead}패</span>
              <span className={`mono block text-xs font-bold ${amountColor(matchup.aSum)}`}>{formatManwon(matchup.aSum)}</span>
            </span>
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
              { name: playerName, sum: matchup.aSum, withAvg: matchup.aAvgWith, overall: matchup.aAvgOverall, other: opponent },
              { name: opponent, sum: matchup.bSum, withAvg: matchup.bAvgWith, overall: matchup.bAvgOverall, other: playerName },
            ].map((side) => {
              const diff = side.withAvg - side.overall;
              return (
                <div key={side.name} className="rounded-xl bg-[#fafaf6] p-3">
                  <p className="text-[11px] font-bold text-[#596078]">{side.name}</p>
                  <p className={`mono mt-1 text-base font-bold ${amountColor(side.sum)}`} data-testid={`matchup-sum-${side.name}`}>{formatManwon(side.sum)}</p>
                  <p className="text-[10px] text-[#858a9b]">함께한 {matchup.together}판 합계</p>
                  <p className={`mono mt-1.5 text-xs font-bold ${amountColor(side.withAvg)}`}>{formatManwon(side.withAvg)} <span className="font-sans text-[10px] font-normal text-[#858a9b]">평균</span></p>
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
