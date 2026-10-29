const SEEN_KEY = 'tilt-holder:milestone-seen';

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

// The popup shows at most once a day per phone for a given milestone.
export function milestoneSeenToday(number: number) {
  try {
    return localStorage.getItem(SEEN_KEY) === `${number}:${todayKey()}`;
  } catch {
    return false;
  }
}

export function markMilestoneSeen(number: number) {
  try {
    localStorage.setItem(SEEN_KEY, `${number}:${todayKey()}`);
  } catch {
    // Without storage it just shows again next open.
  }
}

// Announces a round-numbered game (100, 200, …): "next game" once the one before it
// is settled, "today" while it's being played.
export default function MilestonePopup({ number, live, onClose }: { number: number; live: boolean; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-xs" onClick={onClose} data-testid="modal-milestone">
      <div className="rise-in w-full max-w-[340px] overflow-hidden rounded-[24px] bg-white text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#3a4ba3,#202e74)] px-6 pb-6 pt-7 text-white">
          <span className="luck-sparkle pointer-events-none absolute left-1/2 top-1/2 text-2xl" style={{ '--dx': '-110px', '--dy': '-40px' } as React.CSSProperties}>🎉</span>
          <span className="luck-sparkle pointer-events-none absolute left-1/2 top-1/2 text-2xl" style={{ '--dx': '90px', '--dy': '-46px', animationDelay: '120ms' } as React.CSSProperties}>🎊</span>
          <span className="luck-sparkle pointer-events-none absolute left-1/2 top-1/2 text-xl" style={{ '--dx': '-80px', '--dy': '40px', animationDelay: '220ms' } as React.CSSProperties}>✨</span>
          <span className="luck-sparkle pointer-events-none absolute left-1/2 top-1/2 text-xl" style={{ '--dx': '100px', '--dy': '34px', animationDelay: '60ms' } as React.CSSProperties}>✨</span>
          <p className="mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#cbd1f2]">tilt holder</p>
          <p className="mono mt-1 text-6xl font-extrabold tracking-[-0.04em] text-[#e9ef76]" data-testid="text-milestone-number">{number}</p>
          <p className="mt-1 text-sm font-bold text-white/80">th game</p>
        </div>
        <div className="px-6 pb-6 pt-5">
          <h3 className="break-keep text-lg font-extrabold tracking-[-0.03em] text-[#20253a]" data-testid="text-milestone-title">
            {live ? `오늘은 대망의 제${number}회 게임!` : `다음 게임은 대망의 제${number}회!`}
          </h3>
          <p className="mt-1.5 break-keep text-[13px] leading-relaxed text-[#697087]">
            {live
              ? `${number - 1}번의 게임을 지나 드디어 ${number}번째 테이블이에요. 오늘의 주인공은 누가 될까요?`
              : `TILT HOLDER가 벌써 ${number - 1}번의 게임을 함께했어요. 기념할 ${number}번째 게임을 준비하세요!`}
          </p>
          <button type="button" onClick={onClose} className="tilt-button mt-5 w-full rounded-xl bg-[#2d3d8f] py-3 text-sm font-bold text-white hover:bg-[#202e74]" data-testid="button-milestone-close">기대돼요! 🎉</button>
        </div>
      </div>
    </div>
  );
}
