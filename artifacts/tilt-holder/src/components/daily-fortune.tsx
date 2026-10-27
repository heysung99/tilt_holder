import { useState } from 'react';
import {
  type Card,
  type DailyDraw,
  SUIT_SYMBOL,
  describeHand,
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
      <span className={`block shrink-0 border-white bg-[repeating-linear-gradient(45deg,#3a4ba3_0_3px,#2d3d8f_3px_6px)] shadow-[0_2px_6px_rgba(32,37,58,.25)] ${box} ${className}`} />
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

function FortuneModal({ draw, onClose }: { draw: DailyDraw; onClose: () => void }) {
  const hand = describeHand(draw.cards);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={onClose} data-testid="modal-daily-fortune">
      <div className="rise-in w-full max-w-[380px] overflow-hidden rounded-[24px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="relative bg-[radial-gradient(circle_at_50%_0%,#3a4ba3,#202e74)] px-6 pb-7 pt-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#cbd1f2]">today's luck · {formatDrawDate(draw.date)}</p>
              <h3 className="mt-1 text-lg font-bold">오늘의 운세 & 핸드</h3>
            </div>
            <button type="button" onClick={onClose} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white hover:bg-white/25">닫기</button>
          </div>
          <div className="mt-6 flex justify-center" data-testid="daily-fortune-cards">
            <PlayingCard card={draw.cards[0]} size="large" className="-mr-1.5 -rotate-[7deg]" />
            <PlayingCard card={draw.cards[1]} size="large" className="translate-y-1.5 rotate-[7deg]" />
          </div>
        </div>
        <div className="px-6 pb-6 pt-5">
          <div className="text-center" data-testid="text-daily-hand">
            <p className="text-lg font-extrabold tracking-[-0.03em] text-[#20253a]">{hand.name}</p>
            <p className="mt-1 break-keep text-[13px] font-medium text-[#697087]">{hand.comment}</p>
          </div>
          <div className="mt-4 rounded-2xl bg-[#f6f6f1] px-4 py-4">
            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#9a8f4a]">fortune</p>
            <p className="mt-1.5 break-keep text-[15px] font-semibold leading-relaxed text-[#20253a]" data-testid="text-daily-fortune">“{draw.fortune}”</p>
          </div>
          <p className="mt-4 text-center text-[11px] text-[#9aa0ae]">하루에 한 번만 뽑혀요. 내일 새로운 운세를 확인하세요!</p>
        </div>
      </div>
    </div>
  );
}

// Sits above 게임 개설. The modal renders beside the button rather than inside it,
// because the button's entrance animation would trap a fixed overlay.
export default function DailyFortune() {
  // Face-down cards on the button until today's draw; the drawn cards after that.
  const [draw, setDraw] = useState<DailyDraw | null>(peekTodayDraw);
  const [isOpen, setIsOpen] = useState(false);
  const todayDraw = draw?.date === localDateKey() ? draw : null;

  const open = () => {
    setDraw(getTodayDraw());
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        className="tilt-button rise-in mb-3 flex w-full items-center justify-between rounded-[18px] border border-[#ebe6c4] bg-gradient-to-r from-[#fffbe8] to-[#f3f5ff] px-5 py-3.5 text-left hover:from-[#fff7d6] hover:to-[#eceffd]"
        data-testid="button-daily-fortune"
        onClick={open}
      >
        <span>
          <span className="mono block text-[10px] font-bold uppercase tracking-[0.16em] text-[#9a8f4a]">today's luck</span>
          <span className="mt-1 block text-base font-bold text-[#20253a]">오늘의 운세 & 핸드 보기</span>
        </span>
        <span className="flex items-center">
          <PlayingCard card={todayDraw?.cards[0] ?? null} size="mini" className="-rotate-6" />
          <PlayingCard card={todayDraw?.cards[1] ?? null} size="mini" className="-ml-1 rotate-6" />
        </span>
      </button>
      {isOpen && draw ? <FortuneModal draw={draw} onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}
