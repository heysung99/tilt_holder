export const OVERHEAT_WINDOW_MS = 30 * 60 * 1000;

type LogEntry = { time: string; name: string; delta: number; after: number };

export type OverheatWarning = { name: string; count: number; previousAt: string; addedAt: string };

// Rebuy times still standing for a player: each + pushes its time, each − (a correction)
// takes back the latest one. The starting buy-in (count 1) isn't a rebuy and isn't kept.
function standingRebuys(log: LogEntry[], name: string) {
  const times: string[] = [];
  for (const entry of log) {
    if (entry.name !== name) continue;
    if (entry.delta > 0) {
      if (entry.after >= 2) times.push(entry.time);
    } else if (entry.delta < 0) {
      times.splice(Math.max(0, times.length + entry.delta), -entry.delta);
    }
  }
  return times;
}

// A warning when a rebuy lands within 30 minutes of the player's previous rebuy.
export function overheatWarning(log: LogEntry[], added: LogEntry): OverheatWarning | null {
  if (added.delta <= 0 || added.after < 2) return null;
  const addedAt = new Date(added.time).getTime();
  const recent = standingRebuys(log, added.name).filter((time) => addedAt - new Date(time).getTime() < OVERHEAT_WINDOW_MS);
  const previousAt = recent[recent.length - 1];
  if (!previousAt) return null;
  return { name: added.name, count: recent.length + 1, previousAt, addedAt: added.time };
}

const clock = (time: string | number) => new Date(time).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });

export default function BuyInOverheatModal({ warning, onClose }: { warning: OverheatWarning; onClose: () => void }) {
  const minutesAgo = Math.max(1, Math.round((new Date(warning.addedAt).getTime() - new Date(warning.previousAt).getTime()) / 60000));
  const resumeAt = new Date(warning.addedAt).getTime() + OVERHEAT_WINDOW_MS;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-xs" onClick={onClose} data-testid="modal-buy-in-overheat">
      <div className="rise-in w-full max-w-[340px] overflow-hidden rounded-[24px] bg-white text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="bg-[radial-gradient(circle_at_50%_0%,#f26b4f,#b42318)] px-6 pb-5 pt-6 text-white">
          <p className="text-5xl">🔥</p>
          <p className="mono mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/80">overheat warning</p>
          <p className="mt-0.5 text-xl font-extrabold tracking-[-0.03em]">과열 경고</p>
        </div>
        <div className="px-6 pb-6 pt-5">
          <h3 className="break-keep text-base font-extrabold tracking-[-0.03em] text-[#20253a]" data-testid="text-overheat-title">
            {warning.name}님, 30분 안에 바이인 {warning.count}회!
          </h3>
          <p className="mt-1.5 break-keep text-[13px] leading-relaxed text-[#697087]">
            직전 바이인이 {minutesAgo}분 전({clock(warning.previousAt)})이었어요.
            <br />
            다음 바이인은 30분 뒤 <b className="text-[#b42318]">{clock(resumeAt)} 이후</b>에 하는 걸 권장해요.
          </p>
          <button type="button" onClick={onClose} className="tilt-button mt-5 w-full rounded-xl bg-[#20253a] py-3 text-sm font-bold text-white hover:bg-[#2d3d8f]" data-testid="button-overheat-close">
            확인, 잠깐 쉬어갈게요
          </button>
        </div>
      </div>
    </div>
  );
}
