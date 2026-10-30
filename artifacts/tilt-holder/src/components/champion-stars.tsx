import { useChampionTitles } from '@/lib/champions';

// One gold star per season title, right after a player's name; ★N once there are more
// than three so it stays narrow.
export default function ChampionStars({ name, className = '' }: { name: string; className?: string }) {
  const titles = useChampionTitles(name);
  if (titles.length === 0) return null;
  const seasons = titles.map((title) => `${title.season.slice(2)}시즌`).join(', ');
  return (
    <span
      className={`inline-flex shrink-0 items-center text-[11px] font-extrabold leading-none tracking-[-0.08em] text-[#e0a800] [text-shadow:0_1px_0_rgba(122,86,0,0.25)] ${className}`}
      title={`${seasons} 우승`}
      aria-label={`${seasons} 우승 ${titles.length}회`}
      data-testid={`champion-stars-${name}`}
    >
      {titles.length > 3 ? `★${titles.length}` : '★'.repeat(titles.length)}
    </span>
  );
}
