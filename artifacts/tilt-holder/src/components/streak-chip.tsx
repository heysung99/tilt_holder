import { STREAK_SHOWN_FROM, currentStreak } from '@/lib/achievements';

// "🔥4연승" / "🧊3연패" for a streak long enough to mention; nothing otherwise.
export default function StreakChip({ values, className = '' }: { values: (number | null)[]; className?: string }) {
  const streak = currentStreak(values);
  if (Math.abs(streak) < STREAK_SHOWN_FROM) return null;
  const hot = streak > 0;
  return (
    <span
      className={`inline-flex w-fit items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold ${hot ? 'bg-[#fff1e0] text-[#c2410c]' : 'bg-[#e6f2fb] text-[#1d6fa5]'} ${className}`}
      data-testid="chip-streak"
    >
      {hot ? `🔥${streak}연승` : `🧊${-streak}연패`}
    </span>
  );
}
