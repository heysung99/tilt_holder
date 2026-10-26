import { useLayoutEffect, useState } from 'react';

export type CoachTarget = { testId: string; label: string };

type Placed = CoachTarget & { x: number; top: number; arrowLength: number };

const EDGE = 16;
const FIRST_ARROW = 30;
const ARROW_STEP = 52;

// Dims the screen and points at real buttons (which the caller lifts above the dim
// layer so they stay tappable). Labels are right-aligned to their arrow, so the
// leftmost target gets the shortest arrow and each one further right reaches lower:
// that way no label sits across another target's arrow.
export default function CoachMarks({ targets, onDismiss }: { targets: CoachTarget[]; onDismiss: () => void }) {
  const [placed, setPlaced] = useState<Placed[]>([]);
  const targetKey = targets.map((target) => target.testId).join('|');

  useLayoutEffect(() => {
    const measure = () => {
      const found = targets
        .map((target) => {
          const element = document.querySelector(`[data-testid="${target.testId}"]`);
          return element ? { target, rect: element.getBoundingClientRect() } : null;
        })
        .filter((item): item is { target: CoachTarget; rect: DOMRect } => item !== null)
        .sort((a, b) => a.rect.left - b.rect.left);
      setPlaced(found.map(({ target, rect }, index) => ({
        ...target,
        x: rect.left + rect.width / 2,
        top: rect.bottom + 6,
        arrowLength: FIRST_ARROW + index * ARROW_STEP,
      })));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
    // Re-measure when the set of targets changes (finished ones drop out and the
    // remaining buttons shift).
  }, [targetKey]);

  return (
    <div className="fixed inset-0 z-50 bg-black/65" onClick={onDismiss} data-testid="coach-marks">
      {placed.map((item) => (
        <div key={item.testId} className="pointer-events-none">
          <svg
            className="fixed"
            style={{ left: item.x - 8, top: item.top, width: 16, height: item.arrowLength }}
            viewBox={`0 0 16 ${item.arrowLength}`}
            aria-hidden="true"
          >
            <path d="M2 9 L8 2 L14 9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="8" y1="3" x2="8" y2={item.arrowLength} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <p
            className="fixed whitespace-nowrap rounded-full bg-white px-3.5 py-2 text-sm font-bold text-[#20253a] shadow-lg"
            style={{
              top: item.top + item.arrowLength + 4,
              right: Math.max(EDGE, window.innerWidth - (item.x + 28)),
            }}
          >
            {item.label}
          </p>
        </div>
      ))}
      <p className="pointer-events-none fixed inset-x-0 bottom-28 text-center text-xs font-semibold text-white/70">
        화면을 누르면 닫혀요
      </p>
    </div>
  );
}
