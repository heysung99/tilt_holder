import { useChampionTitles } from '@/lib/champions';

// One championship ring per season title, right after a player's name; 💍×N once
// there are more than three so it stays narrow.
export default function ChampionRings({ name, className = '' }: { name: string; className?: string }) {
  const titles = useChampionTitles(name);
  if (titles.length === 0) return null;
  const seasons = titles.map((title) => `${title.season.slice(2)}시즌`).join(', ');
  return (
    <span
      className={`inline-flex shrink-0 items-center text-[14px] leading-none tracking-[-0.18em] ${className}`}
      title={`${seasons} 우승`}
      aria-label={`${seasons} 우승 ${titles.length}회`}
      data-testid={`champion-rings-${name}`}
    >
      {titles.length > 3 ? <>💍<span className="mono ml-0.5 text-[10px] font-extrabold tracking-normal text-[#a07400]">×{titles.length}</span></> : '💍'.repeat(titles.length)}
    </span>
  );
}
