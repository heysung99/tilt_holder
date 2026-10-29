import { useState } from 'react';
import { type Achievement } from '@/lib/achievements';

function formatAchievedDate(date: string | undefined) {
  if (!date) return '';
  const [year, month, day] = date.split('-');
  return `${year.slice(2)}.${month}.${day}`;
}

function AchievementTile({ achievement, date }: { achievement: Achievement; date?: string }) {
  const unlocked = achievement.achievedAt !== null;
  const tone = !unlocked
    ? 'border-dashed border-[#dfe1ee] bg-white text-[#a0a4b1]'
    : achievement.shame
      ? 'border-[#f3c4bf] bg-[#fff4f2] text-[#20253a]'
      : 'border-[#e8dca8] bg-gradient-to-b from-[#fffdf3] to-[#fff6d6] text-[#20253a]';
  return (
    <div className={`rounded-xl border px-1.5 py-2 text-center ${tone}`} data-testid={`achievement-${achievement.id}`} data-unlocked={unlocked}>
      <p className={`text-xl leading-none ${unlocked ? '' : 'opacity-35 grayscale'}`}>{achievement.icon}</p>
      <p className="mt-1 text-[11px] font-extrabold leading-tight">{achievement.title}</p>
      <p className={`mt-0.5 break-keep text-[9px] leading-snug ${unlocked ? 'text-[#697087]' : ''}`}>{achievement.description}</p>
      {unlocked ? <p className="mono mt-1 text-[9px] font-bold text-[#a0a4b1]">{formatAchievedDate(date)}</p> : null}
    </div>
  );
}

// Unlocked achievements up front (proud ones first); the locked ones fold out as goals.
export default function AchievementsSection({ achievements, historyDates }: { achievements: Achievement[]; historyDates?: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const unlocked = achievements
    .filter((item) => item.achievedAt !== null)
    .sort((a, b) => Number(!!a.shame) - Number(!!b.shame));
  const locked = achievements.filter((item) => item.achievedAt === null);

  return (
    <div className="mt-6" data-testid="section-achievements">
      <div className="flex items-center justify-between">
        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">
          achievements · {unlocked.length}/{achievements.length}
        </p>
        {locked.length ? (
          <button
            type="button"
            data-share-exclude="true"
            onClick={() => setShowAll((value) => !value)}
            className="rounded-full bg-[#f1f1ee] px-2.5 py-1 text-[10px] font-bold text-[#697087]"
            data-testid="button-toggle-achievements"
          >
            {showAll ? '접기' : `미달성 ${locked.length}개 보기`}
          </button>
        ) : null}
      </div>
      {unlocked.length ? (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {unlocked.map((item) => (
            <AchievementTile key={item.id} achievement={item} date={historyDates?.[item.achievedAt ?? -1]} />
          ))}
        </div>
      ) : (
        <p className="mt-2 rounded-xl bg-[#fafaf6] px-3 py-2 text-[11px] text-[#858a9b]">아직 달성한 업적이 없어요.</p>
      )}
      {showAll && locked.length ? (
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          {locked.map((item) => (
            <AchievementTile key={item.id} achievement={item} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
