import { type CSSProperties, useEffect, useState } from 'react';
import {
  type Card,
  type DailyDraw,
  SUIT_SYMBOL,
  describeHand,
  findTazzaLine,
  getTodayDraw,
  isRedSuit,
  localDateKey,
  peekTodayDraw,
  rankLabel,
} from '@/lib/daily-fortune';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function PlayingCard({ card, size, className = '' }: { card: Card | null; size: 'mini' | 'large'; className?: string }) {
  const box = size === 'large'
    ? 'h-[118px] w-[84px] rounded-[14px] border-2'
    : 'h-[34px] w-[24px] rounded-[5px] border';
  if (!card) {
    return (
      <span className={`flex shrink-0 items-center justify-center border-white bg-[repeating-linear-gradient(45deg,#3a4ba3_0_3px,#2d3d8f_3px_6px)] font-extrabold text-[#e9ef76] shadow-[0_2px_6px_rgba(32,37,58,.25)] ${size === 'large' ? 'text-5xl' : 'text-sm'} ${box} ${className}`}>?</span>
    );
  }
  const color = isRedSuit(card.suit) ? 'text-[#d1453b]' : 'text-[#20253a]';
  const suit = SUIT_SYMBOL[card.suit];
  if (size === 'mini') {
    return (
      <span className={`flex shrink-0 flex-col items-center justify-center border-[#dfe1ee] bg-white leading-none shadow-sm ${box} ${color} ${className}`}>
        <span className="text-[11px] font-extrabold">{rankLabel(card.rank)}</span>
        <span className="text-[10px]">{suit}</span>
      </span>
    );
  }
  return (
    <span className={`relative block shrink-0 border-[#e4e5ea] bg-white shadow-[0_10px_24px_rgba(32,37,58,.18)] ${box} ${color} ${className}`}>
      <span className="absolute left-2 top-1.5 flex flex-col items-center leading-none">
        <span className="text-lg font-extrabold">{rankLabel(card.rank)}</span>
        <span className="text-sm">{suit}</span>
      </span>
      <span className="absolute inset-0 flex items-center justify-center text-[44px] leading-none">{suit}</span>
      <span className="absolute bottom-1.5 right-2 flex rotate-180 flex-col items-center leading-none">
        <span className="text-lg font-extrabold">{rankLabel(card.rank)}</span>
        <span className="text-sm">{suit}</span>
      </span>
    </span>
  );
}

function formatDrawDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return `${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')} (${WEEKDAYS[new Date(year, month - 1, day).getDay()]})`;
}

function FlipCard({ card, flipped, className = '' }: { card: Card; flipped: boolean; className?: string }) {
  return (
    <span className={`luck-flip block h-[118px] w-[84px] shrink-0 ${className}`}>
      <span className={`luck-flip-inner block ${flipped ? 'is-flipped' : ''}`}>
        <span className="luck-face block"><PlayingCard card={null} size="large" /></span>
        <span className="luck-face luck-face-front block"><PlayingCard card={card} size="large" /></span>
      </span>
    </span>
  );
}

const SPARKLES = [
  { dx: '-92px', dy: '-38px', delay: '0ms' },
  { dx: '96px', dy: '-30px', delay: '80ms' },
  { dx: '-70px', dy: '46px', delay: '140ms' },
  { dx: '78px', dy: '52px', delay: '60ms' },
  { dx: '0px', dy: '-70px', delay: '120ms' },
];

function FortuneText({ fortune }: { fortune: string }) {
  const tazza = findTazzaLine(fortune);
  return tazza ? (
    <>
      <p className="text-[11px] font-bold text-[#9a8f4a]">🎬 타짜 명대사</p>
      <p className="mt-2 break-keep text-lg font-extrabold leading-snug tracking-[-0.03em] text-[#20253a]">“{tazza.quote}”</p>
      <p className="mt-1 text-xs font-semibold text-[#858a9b]">— {tazza.by}</p>
      <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-[#4a5068]">{tazza.twist}</p>
    </>
  ) : (
    <>
      <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a8f4a]">fortune</p>
      <p className="mt-1.5 break-keep text-[15px] font-semibold leading-relaxed text-[#20253a]">“{fortune}”</p>
    </>
  );
}

// With reveal, the cards start face down ("?"), flip one after the other with a
// light burst, and then the hand and fortune fade in. Reopening shows it all at once.
function FortuneModal({ draw, reveal, onClose }: { draw: DailyDraw; reveal: boolean; onClose: () => void }) {
  const hand = describeHand(draw.cards);
  const [stage, setStage] = useState(reveal ? 0 : 3);

  useEffect(() => {
    if (!reveal) return;
    const timers = [
      window.setTimeout(() => setStage(1), 650),
      window.setTimeout(() => setStage(2), 950),
      window.setTimeout(() => setStage(3), 1350),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reveal]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={onClose} data-testid="modal-daily-fortune" data-stage={stage}>
      <div className="rise-in w-full max-w-[380px] overflow-hidden rounded-[24px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#3a4ba3,#202e74)] px-6 pb-7 pt-5 text-white">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#cbd1f2]">today's luck · {formatDrawDate(draw.date)}</p>
              <h3 className="mt-1 text-lg font-bold">오늘의 운세 & 핸드</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/25">닫기</button>
          </div>
          <div className="relative mt-6 flex justify-center" data-testid="daily-fortune-cards">
            {reveal && stage >= 2 ? (
              <>
                <span className="luck-burst pointer-events-none absolute left-1/2 top-1/2 -ml-[130px] -mt-[130px] h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(255,240,150,1),rgba(255,214,90,.55)_35%,rgba(255,214,90,0)_68%)]" />
                {SPARKLES.map((sparkle, index) => (
                  <span
                    key={index}
                    className="luck-sparkle pointer-events-none absolute left-1/2 top-1/2 -ml-3 -mt-3 text-2xl"
                    style={{ '--dx': sparkle.dx, '--dy': sparkle.dy, animationDelay: sparkle.delay } as CSSProperties}
                  >
                    ✨
                  </span>
                ))}
              </>
            ) : null}
            <span className={`relative -mr-1.5 -rotate-[7deg] ${stage === 0 ? 'luck-float' : ''}`}><FlipCard card={draw.cards[0]} flipped={stage >= 1} /></span>
            <span className={`relative translate-y-1.5 rotate-[7deg] ${stage === 0 ? 'luck-float' : ''}`}><FlipCard card={draw.cards[1]} flipped={stage >= 2} /></span>
          </div>
        </div>
        <div className="min-h-[220px] px-6 pb-6 pt-5">
          {stage >= 3 ? (
            <div className={reveal ? 'luck-fade-up' : ''}>
              <div className="text-center" data-testid="text-daily-hand">
                <p className="text-lg font-extrabold tracking-[-0.03em] text-[#20253a]">{hand.name}</p>
                <p className="mt-1 break-keep text-[13px] font-medium text-[#697087]">{hand.comment}</p>
              </div>
              <div className="mt-4 rounded-2xl bg-[#f6f6f1] px-4 py-4" data-testid="text-daily-fortune">
                <FortuneText fortune={draw.fortune} />
              </div>
              <p className="mt-4 text-center text-[11px] text-[#9aa0ae]">하루에 한 번만 뽑혀요. 내일 새로운 운세를 확인하세요!</p>
            </div>
          ) : (
            <p className="pt-16 text-center text-sm font-semibold text-[#9aa0ae]">오늘의 패를 뒤집는 중…</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Sits above 게임 개설: a "?" button until today's draw, then a card that keeps the
// day's hand and fortune in its place. The modal renders beside it rather than
// inside, because the entrance animation would trap a fixed overlay.
export default function DailyFortune() {
  const [draw, setDraw] = useState<DailyDraw | null>(peekTodayDraw);
  const [modal, setModal] = useState<{ reveal: boolean } | null>(null);
  const todayDraw = draw?.date === localDateKey() ? draw : null;

  const reveal = () => {
    setDraw(getTodayDraw());
    setModal({ reveal: true });
  };

  return (
    <>
      {todayDraw ? (
        <TodayCard draw={todayDraw} onOpen={() => setModal({ reveal: false })} />
      ) : (
        <button
          type="button"
          className="tilt-button rise-in mb-3 flex w-full items-center justify-between rounded-[18px] border border-[#ebe6c4] bg-gradient-to-r from-[#fffbe8] to-[#f3f5ff] px-5 py-3.5 text-left hover:from-[#fff7d6] hover:to-[#eceffd]"
          data-testid="button-daily-fortune"
          onClick={reveal}
        >
          <span>
            <span className="mono block text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a8f4a]">today's luck</span>
            <span className="mt-1 block text-base font-bold text-[#20253a]">오늘의 운세 & 핸드 보기</span>
          </span>
          <span className="flex items-center">
            <PlayingCard card={null} size="mini" className="-rotate-6" />
            <PlayingCard card={null} size="mini" className="-ml-1 rotate-6" />
          </span>
        </button>
      )}
      {modal && draw ? <FortuneModal draw={draw} reveal={modal.reveal} onClose={() => setModal(null)} /> : null}
    </>
  );
}

function TodayCard({ draw, onOpen }: { draw: DailyDraw; onOpen: () => void }) {
  const hand = describeHand(draw.cards);
  const tazza = findTazzaLine(draw.fortune);
  return (
    <button
      type="button"
      className="tilt-button rise-in mb-3 block w-full rounded-[18px] border border-[#ebe6c4] bg-gradient-to-r from-[#fffbe8] to-[#f3f5ff] px-4 py-3.5 text-left hover:from-[#fff7d6] hover:to-[#eceffd]"
      data-testid="card-daily-fortune"
      onClick={onOpen}
    >
      <span className="flex items-center gap-3">
        <span className="flex shrink-0 items-center">
          <PlayingCard card={draw.cards[0]} size="mini" className="-rotate-6" />
          <PlayingCard card={draw.cards[1]} size="mini" className="-ml-1 rotate-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="mono block text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a8f4a]">today's luck · {formatDrawDate(draw.date)}</span>
          <span className="mt-0.5 block truncate text-[15px] font-extrabold tracking-[-0.03em] text-[#20253a]">{hand.name}</span>
        </span>
      </span>
      <span className="mt-2.5 block break-keep border-t border-[#ebe6c4] pt-2.5 text-[13px] leading-relaxed text-[#4a5068]" data-testid="text-today-fortune">
        {tazza ? (
          <>
            <span className="font-bold text-[#20253a]">“{tazza.quote}”</span>
            <span className="text-[#858a9b]"> — {tazza.by}</span>
            <span className="block">{tazza.twist}</span>
          </>
        ) : (
          draw.fortune
        )}
      </span>
    </button>
  );
}
