import { type Tier } from '@/lib/player-stats';

const SIZES = {
  xs: 'h-5 gap-0.5 px-1 text-[10px] tracking-[-0.05em]',
  sm: 'h-5 gap-1 px-2 text-[10px] tracking-[-0.02em]',
  md: 'h-6 gap-1.5 px-2.5 text-xs tracking-[-0.02em]',
};

// One badge shape for every tier (and for 언랭 when tier is null); only the colors
// come from the tier. Pass a width class to line badges up in a column. Size xs
// leaves out the icon so two badges and an amount fit on one 360px-wide row.
export default function TierBadge({ tier, size = 'sm', className = '' }: { tier: Tier | null; size?: keyof typeof SIZES; className?: string }) {
  const colors = tier?.className ?? 'border-[#e2e3e8] bg-[#f6f6f3] text-[#80869a]';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border font-bold leading-none ${SIZES[size]} ${colors} ${className}`}>
      {tier && size !== 'xs' ? <span className="text-[0.95em]">{tier.icon}</span> : null}
      <span>{tier?.label ?? '언랭'}</span>
    </span>
  );
}
