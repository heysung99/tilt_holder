import { type Tier } from '@/lib/player-stats';

const SIZES = {
  sm: 'h-5 gap-1 px-2 text-[10px] tracking-[-0.02em]',
  md: 'h-6 gap-1.5 px-2.5 text-xs tracking-[-0.02em]',
};

// One badge shape for every tier (and for 언랭 when tier is null); only the colors
// come from the tier. label overrides the text, e.g. a shorter name in tight rows.
export default function TierBadge({ tier, size = 'sm', label, className = '' }: { tier: Tier | null; size?: keyof typeof SIZES; label?: string; className?: string }) {
  const colors = tier?.className ?? 'border-[#e2e3e8] bg-[#f6f6f3] text-[#80869a]';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border font-bold leading-none ${SIZES[size]} ${colors} ${className}`}>
      {tier ? <span className="text-[0.95em]">{tier.icon}</span> : null}
      <span>{label ?? tier?.label ?? '언랭'}</span>
    </span>
  );
}
