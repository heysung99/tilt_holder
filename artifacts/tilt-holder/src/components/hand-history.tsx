import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, NotebookPen, RotateCw, Trash2, Undo2, X } from 'lucide-react';
import { type Card, type Suit, SUIT_SYMBOL, isRedSuit, rankLabel } from '@/lib/daily-fortune';
import {
  type ActionType,
  type HandAction,
  type HandHistory,
  BOARD_SIZE,
  HAND_TAGS,
  STREETS,
  STREET_LABEL,
  type Street,
  actingOrder,
  committedOnStreet,
  describeAction,
  emptyHand,
  formatAmount,
  nextToAct,
  playersInHand,
  positionLabels,
  positionOf,
  potTotal,
  streetLevel,
  tagLabel,
} from '@/lib/hand-history';

const RANKS_DESC = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS: Suit[] = ['s', 'h', 'd', 'c'];
const QUICK_ADD = [1000, 5000, 10000, 50000];
const sameCard = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit;
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });

function MiniCard({ card, size = 'sm' }: { card: Card | null; size?: 'sm' | 'md' }) {
  const box = size === 'md' ? 'h-[46px] w-[34px] text-[13px]' : 'h-[30px] w-[22px] text-[10px]';
  if (!card) return <span className={`flex shrink-0 items-center justify-center rounded-[5px] border border-dashed border-[#c9ccd8] bg-[#f7f7fb] ${box}`} />;
  return (
    <span className={`flex shrink-0 flex-col items-center justify-center rounded-[5px] border border-[#dfe1ee] bg-white font-extrabold leading-none shadow-sm ${box} ${isRedSuit(card.suit) ? 'text-[#d1453b]' : 'text-[#20253a]'}`}>
      <span>{rankLabel(card.rank)}</span>
      <span className="mt-0.5 font-normal">{SUIT_SYMBOL[card.suit]}</span>
    </span>
  );
}

// Rank first (big targets), then suit; cards already on the table are disabled.
function CardPicker({ used, onPick, onCancel }: { used: Card[]; onPick: (card: Card) => void; onCancel: () => void }) {
  const [rank, setRank] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-[#dfe1ee] bg-[#f8f9ff] p-3" data-testid="card-picker">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-[#2d3d8f]">{rank ? `${rankLabel(rank)} — 무늬 선택` : '숫자 선택'}</p>
        <button type="button" onClick={onCancel} className="text-[11px] font-bold text-[#858a9b]">취소</button>
      </div>
      {rank ? (
        <div className="grid grid-cols-4 gap-2">
          {SUITS.map((suit) => {
            const taken = used.some((card) => sameCard(card, { rank, suit }));
            return (
              <button
                key={suit}
                type="button"
                disabled={taken}
                onClick={() => { onPick({ rank, suit }); setRank(null); }}
                className={`h-12 rounded-xl border bg-white text-2xl disabled:opacity-25 ${isRedSuit(suit) ? 'border-[#f3c4bf] text-[#d1453b]' : 'border-[#d5d8e6] text-[#20253a]'}`}
                data-testid={`pick-suit-${suit}`}
              >
                {SUIT_SYMBOL[suit]}
              </button>
            );
          })}
          <button type="button" onClick={() => setRank(null)} className="col-span-4 text-[11px] font-bold text-[#858a9b]">← 숫자 다시 고르기</button>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {RANKS_DESC.map((value) => {
            const allTaken = SUITS.every((suit) => used.some((card) => sameCard(card, { rank: value, suit })));
            return (
              <button
                key={value}
                type="button"
                disabled={allTaken}
                onClick={() => setRank(value)}
                className="h-10 rounded-lg border border-[#d5d8e6] bg-white text-sm font-extrabold text-[#20253a] disabled:opacity-25"
                data-testid={`pick-rank-${value}`}
              >
                {rankLabel(value)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AmountInput({ value, onChange, presets }: { value: number; onChange: (value: number) => void; presets: { label: string; value: number }[] }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          value={value ? value.toLocaleString('ko-KR') : ''}
          onChange={(event) => onChange(Number(event.target.value.replace(/[^0-9]/g, '')) || 0)}
          inputMode="numeric"
          placeholder="금액"
          className="h-10 min-w-0 flex-1 rounded-xl border border-[#dfe1ee] bg-white px-3 text-right text-sm font-bold text-[#20253a] outline-none focus:border-[#2d3d8f]"
          data-testid="input-action-amount"
        />
        <span className="text-xs font-bold text-[#858a9b]">원</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <button key={preset.label} type="button" onClick={() => onChange(preset.value)} className="rounded-full border border-[#d5d8e6] bg-white px-2.5 py-1 text-[11px] font-bold text-[#2d3d8f]">{preset.label}</button>
        ))}
        {QUICK_ADD.map((step) => (
          <button key={step} type="button" onClick={() => onChange(value + step)} className="rounded-full border border-[#e4e5ea] bg-[#f6f6f3] px-2.5 py-1 text-[11px] font-bold text-[#596078]">+{formatAmount(step)}</button>
        ))}
        <button type="button" onClick={() => onChange(0)} className="rounded-full px-2 py-1 text-[11px] font-bold text-[#a0a4b1]">지우기</button>
      </div>
    </div>
  );
}

type Step = 'seats' | 'actions' | 'result';

function HandRecorder({
  number,
  participants,
  previous,
  onSave,
  onClose,
}: {
  number: number;
  participants: string[];
  // The latest hand with seats, for rotating the dealer and reusing the blinds.
  previous: HandHistory | null;
  onSave: (hand: HandHistory) => void;
  onClose: () => void;
}) {
  const [hand, setHand] = useState<HandHistory>(() => emptyHand([], previous?.blinds ?? null));
  const [step, setStep] = useState<Step>('seats');
  const [street, setStreet] = useState<Street>('preflop');
  const [actor, setActor] = useState<string | null>(null);
  const [pending, setPending] = useState<ActionType | null>(null);
  const [amount, setAmount] = useState(0);
  const [picking, setPicking] = useState<{ kind: 'board'; index: number } | { kind: 'shown'; name: string } | null>(null);

  const update = (patch: Partial<HandHistory>) => setHand((current) => ({ ...current, ...patch }));
  const positions = positionLabels(hand.seats.length);
  const usedCards = [...hand.board, ...Object.values(hand.shown).flat()];
  const committed = committedOnStreet(hand, street);
  const level = streetLevel(committed);
  const suggested = nextToAct(hand, street);
  const currentActor = actor ?? suggested;
  const folded = new Set(hand.actions.filter((action) => STREETS.indexOf(action.street) <= STREETS.indexOf(street) && action.type === 'fold').map((action) => action.name));
  const allIn = new Set(hand.actions.filter((action) => STREETS.indexOf(action.street) <= STREETS.indexOf(street) && action.type === 'allin').map((action) => action.name));
  const pot = potTotal(hand);
  const canSave = hand.actions.length > 0 || hand.board.length > 0 || hand.tag !== null || hand.memo.trim().length > 0;

  const setSeats = (seats: string[]) => {
    // Actions by someone no longer seated can't stay.
    update({ seats, actions: hand.actions.filter((action) => seats.includes(action.name)), winners: hand.winners.filter((name) => seats.includes(name)) });
    setActor(null);
  };
  const toggleSeat = (name: string) => setSeats(hand.seats.includes(name) ? hand.seats.filter((seat) => seat !== name) : [...hand.seats, name]);

  const addAction = (type: ActionType, value?: number) => {
    if (!currentActor) return;
    const action: HandAction = value === undefined ? { street, name: currentActor, type } : { street, name: currentActor, type, amount: value };
    update({ actions: [...hand.actions, action] });
    setActor(null);
    setPending(null);
    setAmount(0);
  };

  const undo = () => {
    update({ actions: hand.actions.slice(0, -1) });
    setActor(null);
    setPending(null);
  };

  const goToStreet = (next: Street) => {
    setStreet(next);
    setActor(null);
    setPending(null);
    setPicking(BOARD_SIZE[next] > hand.board.length ? { kind: 'board', index: hand.board.length } : null);
  };

  const pickCard = (card: Card) => {
    if (!picking) return;
    if (picking.kind === 'board') {
      const board = [...hand.board];
      board[picking.index] = card;
      const filled = board.filter(Boolean);
      update({ board: filled });
      const needed = BOARD_SIZE[street];
      setPicking(filled.length < needed ? { kind: 'board', index: filled.length } : null);
    } else {
      const cards = [...(hand.shown[picking.name] ?? []), card].slice(0, 2);
      update({ shown: { ...hand.shown, [picking.name]: cards } });
      if (cards.length >= 2) setPicking(null);
    }
  };

  const levelPresets = level > 0
    ? [{ label: '2배', value: level * 2 }, { label: '3배', value: level * 3 }, { label: '팟', value: level + pot }]
    : hand.blinds?.bb
      ? [{ label: '½팟', value: Math.round(pot / 2) }, { label: '팟', value: pot }]
      : [];

  const stepTabs: { key: Step; label: string }[] = [
    { key: 'seats', label: '① 자리' },
    { key: 'actions', label: '② 액션' },
    { key: 'result', label: '③ 결과·메모' },
  ];
  const resultCandidates = hand.seats.length > 0 ? playersInHand(hand) : participants;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs sm:items-center sm:p-4" data-testid="modal-hand-recorder">
      <div className="rise-in flex max-h-[92vh] w-full max-w-[480px] flex-col rounded-t-[24px] bg-white shadow-2xl sm:rounded-[24px]">
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">hand #{number}</p>
            <h3 className="mt-0.5 text-lg font-bold text-[#20253a]">핸드 기록</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f1f1ee] p-1.5 text-[#697087]" aria-label="닫기"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-3 gap-1 border-b border-[#ececf0] px-3 py-2">
          {stepTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStep(tab.key)}
              className={`rounded-xl py-2 text-xs font-bold ${step === tab.key ? 'bg-[#2d3d8f] text-white' : 'text-[#697087] hover:bg-[#f3f4ff]'}`}
              data-testid={`tab-recorder-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {step === 'seats' ? (
            <div>
              <p className="text-sm font-bold text-[#20253a]">딜러(BTN)부터 시계방향으로 이름을 누르세요</p>
              <p className="mt-0.5 text-xs text-[#858a9b]">한 번 더 누르면 빠져요. 이 핸드에 앉은 사람만 고르면 돼요.</p>
              {previous?.seats.length ? (
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setSeats([...previous.seats.slice(1), previous.seats[0]].filter((name) => participants.includes(name)))} className="flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#d5d8e6] bg-[#f3f4ff] py-2 text-xs font-bold text-[#2d3d8f]" data-testid="button-rotate-dealer">
                    <RotateCw size={13} /> 지난 핸드에서 딜러 넘기기
                  </button>
                  <button type="button" onClick={() => setSeats(previous.seats.filter((name) => participants.includes(name)))} className="rounded-xl border border-[#e4e5ea] px-3 py-2 text-xs font-bold text-[#596078]">같은 자리</button>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {participants.map((name) => {
                  const index = hand.seats.indexOf(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleSeat(name)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold ${index >= 0 ? 'border-[#2d3d8f] bg-[#2d3d8f] text-white' : 'border-[#dfe1ee] bg-white text-[#20253a]'}`}
                      data-testid={`seat-${name}`}
                    >
                      {index >= 0 ? <span className="mono rounded-md bg-white/20 px-1 text-[10px]">{index + 1}</span> : null}
                      {name}
                    </button>
                  );
                })}
              </div>
              {hand.seats.length > 0 ? (
                <div className="mt-4 rounded-2xl bg-[#f6f6f1] p-3">
                  <p className="text-[11px] font-bold text-[#9a8f4a]">포지션</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {hand.seats.map((name, index) => (
                      <p key={name} className="flex items-center gap-2 text-sm"><span className="mono w-14 shrink-0 text-[11px] font-bold text-[#2d3d8f]">{positions[index]}</span><span className="font-bold text-[#20253a]">{name}</span></p>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="mt-4">
                <p className="text-xs font-bold text-[#596078]">블라인드 (선택)</p>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  {(['sb', 'bb'] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 rounded-xl border border-[#dfe1ee] bg-white px-3">
                      <span className="mono text-[11px] font-bold text-[#858a9b]">{key.toUpperCase()}</span>
                      <input
                        value={hand.blinds?.[key] ? hand.blinds[key].toLocaleString('ko-KR') : ''}
                        onChange={(event) => {
                          const value = Number(event.target.value.replace(/[^0-9]/g, '')) || 0;
                          const blinds = { sb: hand.blinds?.sb ?? 0, bb: hand.blinds?.bb ?? 0, [key]: value };
                          update({ blinds: blinds.sb || blinds.bb ? blinds : null });
                        }}
                        inputMode="numeric"
                        placeholder="0"
                        className="h-10 min-w-0 flex-1 bg-transparent text-right text-sm font-bold text-[#20253a] outline-none"
                        data-testid={`input-blind-${key}`}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <button type="button" disabled={hand.seats.length < 2} onClick={() => setStep('actions')} className="mt-5 w-full rounded-xl bg-[#2d3d8f] py-3 text-sm font-bold text-white disabled:opacity-40" data-testid="button-seats-next">다음: 액션 기록</button>
              <button type="button" onClick={() => setStep('result')} className="mt-2 w-full py-2 text-xs font-bold text-[#858a9b]">자리 없이 메모만 남기기 →</button>
            </div>
          ) : null}

          {step === 'actions' ? (
            hand.seats.length < 2 ? (
              <p className="py-8 text-center text-sm text-[#858a9b]">① 자리에서 두 명 이상 앉혀주세요.</p>
            ) : (
              <div>
                <div className="grid grid-cols-4 gap-1 rounded-xl bg-[#f1f2f5] p-1">
                  {STREETS.map((value) => (
                    <button key={value} type="button" onClick={() => goToStreet(value)} className={`rounded-lg py-1.5 text-xs font-bold ${street === value ? 'bg-white text-[#2d3d8f] shadow-sm' : 'text-[#858a9b]'}`} data-testid={`street-${value}`}>
                      {STREET_LABEL[value]}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, index) => {
                      const card = hand.board[index] ?? null;
                      const open = index < BOARD_SIZE[street] || card;
                      return (
                        <button key={index} type="button" disabled={!open} onClick={() => setPicking({ kind: 'board', index: Math.min(index, hand.board.length) })} className={open ? '' : 'opacity-30'} data-testid={`board-slot-${index}`}>
                          <MiniCard card={card} size="md" />
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-right">
                    <p className="mono text-[10px] font-bold uppercase tracking-[0.1em] text-[#858a9b]">pot</p>
                    <p className="text-base font-extrabold text-[#20253a]" data-testid="text-pot">{formatAmount(pot)}</p>
                  </div>
                </div>
                {hand.board.length > 0 ? (
                  <button type="button" onClick={() => update({ board: hand.board.slice(0, -1) })} className="mt-1 text-[11px] font-bold text-[#a0a4b1]">마지막 보드 카드 지우기</button>
                ) : null}
                {picking?.kind === 'board' ? <div className="mt-3"><CardPicker used={usedCards} onPick={pickCard} onCancel={() => setPicking(null)} /></div> : null}

                <div className="mt-4 space-y-1.5">
                  {actingOrder(hand.seats, street).map((name) => {
                    const isOut = folded.has(name);
                    const isActor = name === currentActor;
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={isOut || allIn.has(name)}
                        onClick={() => { setActor(name); setPending(null); }}
                        className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left ${isActor ? 'border-[#2d3d8f] bg-[#eef0ff]' : 'border-[#ececf0] bg-white'} ${isOut ? 'opacity-40' : ''}`}
                        data-testid={`actor-${name}`}
                      >
                        <span className="mono w-12 shrink-0 text-[10px] font-bold text-[#2d3d8f]">{positionOf(hand, name)}</span>
                        <span className={`flex-1 text-sm font-bold ${isOut ? 'line-through' : ''} text-[#20253a]`}>{name}</span>
                        {allIn.has(name) ? <span className="rounded-full bg-[#ffe8e2] px-2 py-0.5 text-[10px] font-bold text-[#c0392b]">올인</span> : null}
                        {committed[name] ? <span className="mono text-xs font-bold text-[#596078]">{formatAmount(committed[name])}</span> : null}
                        {isActor ? <ChevronRight size={14} className="text-[#2d3d8f]" /> : null}
                      </button>
                    );
                  })}
                </div>

                {currentActor ? (
                  <div className="mt-3 rounded-2xl border border-[#d9dcf1] bg-[#f8f9ff] p-3" data-testid="panel-action">
                    <p className="text-xs font-bold text-[#2d3d8f]">{positionOf(hand, currentActor)} {currentActor}의 액션{level > 0 ? ` · 현재 ${formatAmount(level)}` : ''}</p>
                    <div className="mt-2 grid grid-cols-4 gap-1.5">
                      <button type="button" onClick={() => addAction('fold')} className="rounded-xl bg-[#f1f1ee] py-2.5 text-xs font-bold text-[#596078]" data-testid="action-fold">폴드</button>
                      {(committed[currentActor] ?? 0) >= level ? (
                        <button type="button" onClick={() => addAction('check')} className="rounded-xl bg-white py-2.5 text-xs font-bold text-[#20253a] ring-1 ring-[#dfe1ee]" data-testid="action-check">체크</button>
                      ) : (
                        <button type="button" onClick={() => addAction('call', level)} className="rounded-xl bg-white py-2.5 text-xs font-bold text-[#20253a] ring-1 ring-[#dfe1ee]" data-testid="action-call">콜</button>
                      )}
                      <button type="button" onClick={() => { setPending(level > 0 ? 'raise' : 'bet'); setAmount(level > 0 ? level * 2 : hand.blinds?.bb ?? 0); }} className={`rounded-xl py-2.5 text-xs font-bold ${pending === 'bet' || pending === 'raise' ? 'bg-[#2d3d8f] text-white' : 'bg-white text-[#2d3d8f] ring-1 ring-[#c9cff0]'}`} data-testid="action-raise">{level > 0 ? '레이즈' : '벳'}</button>
                      <button type="button" onClick={() => { setPending('allin'); setAmount(0); }} className={`rounded-xl py-2.5 text-xs font-bold ${pending === 'allin' ? 'bg-[#c0392b] text-white' : 'bg-white text-[#c0392b] ring-1 ring-[#f3c4bf]'}`} data-testid="action-allin">올인</button>
                    </div>
                    {pending ? (
                      <div className="mt-3">
                        <p className="mb-1.5 text-[11px] text-[#858a9b]">{pending === 'allin' ? '올인 금액 (이번 스트리트 총액)' : `${pending === 'raise' ? '레이즈' : '벳'} 금액 (이번 스트리트 총액)`}</p>
                        <AmountInput value={amount} onChange={setAmount} presets={pending === 'allin' ? [] : levelPresets} />
                        <button type="button" disabled={amount <= 0 || (pending !== 'allin' && amount <= level)} onClick={() => addAction(pending, amount)} className="mt-3 w-full rounded-xl bg-[#2d3d8f] py-2.5 text-sm font-bold text-white disabled:opacity-40" data-testid="button-confirm-amount">
                          {pending === 'allin' ? '올인' : pending === 'raise' ? '레이즈' : '벳'} {amount > 0 ? formatAmount(amount) : ''} 확정
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl bg-[#f6f6f1] p-3 text-center">
                    <p className="text-xs font-bold text-[#596078]">{STREET_LABEL[street]} 베팅이 끝났어요</p>
                    {street !== 'river' && playersInHand(hand).length > 1 ? (
                      <button type="button" onClick={() => goToStreet(STREETS[STREETS.indexOf(street) + 1])} className="mt-2 w-full rounded-xl bg-[#2d3d8f] py-2.5 text-sm font-bold text-white" data-testid="button-next-street">
                        다음: {STREET_LABEL[STREETS[STREETS.indexOf(street) + 1]]} →
                      </button>
                    ) : (
                      <button type="button" onClick={() => setStep('result')} className="mt-2 w-full rounded-xl bg-[#2d3d8f] py-2.5 text-sm font-bold text-white" data-testid="button-to-result">결과 입력 →</button>
                    )}
                  </div>
                )}

                {hand.actions.length > 0 ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold text-[#9a8f4a]">기록된 액션</p>
                      <button type="button" onClick={undo} className="flex items-center gap-1 text-[11px] font-bold text-[#c0392b]" data-testid="button-undo-action"><Undo2 size={12} /> 되돌리기</button>
                    </div>
                    <ActionLog hand={hand} />
                  </div>
                ) : null}
              </div>
            )
          ) : null}

          {step === 'result' ? (
            <div>
              <p className="text-xs font-bold text-[#596078]">승자 (나눠 가지면 여러 명)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {resultCandidates.map((name) => {
                  const selected = hand.winners.includes(name);
                  return (
                    <button key={name} type="button" onClick={() => update({ winners: selected ? hand.winners.filter((winner) => winner !== name) : [...hand.winners, name] })} className={`rounded-xl border px-3 py-2 text-sm font-bold ${selected ? 'border-[#b38b1e] bg-[#fff6d6] text-[#7a5600]' : 'border-[#dfe1ee] bg-white text-[#20253a]'}`} data-testid={`winner-${name}`}>
                      {selected ? '🏆 ' : ''}{name}
                    </button>
                  );
                })}
              </div>
              {pot > 0 ? <p className="mt-2 text-xs text-[#858a9b]">팟 <span className="font-bold text-[#20253a]">{formatAmount(pot)}</span></p> : null}

              {hand.seats.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-bold text-[#596078]">공개된 핸드 (선택)</p>
                  <div className="mt-2 space-y-1.5">
                    {playersInHand(hand).map((name) => (
                      <div key={name} className="flex items-center gap-2 rounded-xl border border-[#ececf0] px-3 py-2">
                        <span className="flex-1 text-sm font-bold text-[#20253a]">{name}</span>
                        {(hand.shown[name] ?? []).map((card) => <MiniCard key={`${card.rank}${card.suit}`} card={card} />)}
                        {(hand.shown[name]?.length ?? 0) < 2 ? (
                          <button type="button" onClick={() => setPicking({ kind: 'shown', name })} className="rounded-lg border border-[#d5d8e6] px-2 py-1 text-[11px] font-bold text-[#2d3d8f]" data-testid={`button-show-${name}`}>카드 선택</button>
                        ) : (
                          <button type="button" onClick={() => { const { [name]: _removed, ...rest } = hand.shown; update({ shown: rest }); }} className="text-[11px] font-bold text-[#a0a4b1]">지우기</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {picking?.kind === 'shown' ? <div className="mt-3"><CardPicker used={usedCards} onPick={pickCard} onCancel={() => setPicking(null)} /></div> : null}
                </div>
              ) : null}

              <p className="mt-5 text-xs font-bold text-[#596078]">상황 태그</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {HAND_TAGS.map((tag) => (
                  <button key={tag.key} type="button" onClick={() => update({ tag: hand.tag === tag.key ? null : tag.key })} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${hand.tag === tag.key ? 'border-[#2d3d8f] bg-[#2d3d8f] text-white' : 'border-[#dfe1ee] bg-white text-[#596078]'}`} data-testid={`tag-${tag.key}`}>
                    {tag.label}
                  </button>
                ))}
              </div>

              <p className="mt-5 text-xs font-bold text-[#596078]">메모</p>
              <textarea
                value={hand.memo}
                onChange={(event) => update({ memo: event.target.value.slice(0, 500) })}
                rows={3}
                placeholder="예: AA vs KK 올인, 리버에 K 떠서 역전!"
                className="mt-2 w-full resize-none rounded-xl border border-[#dfe1ee] bg-white px-3 py-2.5 text-sm text-[#20253a] outline-none focus:border-[#2d3d8f]"
                data-testid="input-hand-memo"
              />
            </div>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-[#ececf0] px-5 py-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-[#dfe1ee] py-3 text-sm font-bold text-[#596078]">취소</button>
          <button type="button" disabled={!canSave} onClick={() => onSave({ ...hand, time: new Date().toISOString(), memo: hand.memo.trim() })} className="flex-[2] rounded-xl bg-[#2d3d8f] py-3 text-sm font-bold text-white disabled:opacity-40" data-testid="button-save-hand">
            저장{pot > 0 ? ` · 팟 ${formatAmount(pot)}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionLog({ hand }: { hand: HandHistory }) {
  return (
    <div className="mt-1.5 space-y-2">
      {STREETS.filter((street) => hand.actions.some((action) => action.street === street)).map((street) => (
        <div key={street}>
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#697087]">
            {STREET_LABEL[street]}
            {BOARD_SIZE[street] > 0 ? (
              <span className="flex gap-0.5">{hand.board.slice(BOARD_SIZE[street] === 3 ? 0 : BOARD_SIZE[street] - 1, BOARD_SIZE[street]).map((card) => <MiniCard key={`${card.rank}${card.suit}`} card={card} />)}</span>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {hand.actions.filter((action) => action.street === street).map((action, index) => (
              <span key={index} className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${action.type === 'fold' ? 'bg-[#f4f4f1] text-[#a0a4b1]' : action.type === 'allin' ? 'bg-[#ffe8e2] text-[#c0392b]' : action.type === 'bet' || action.type === 'raise' ? 'bg-[#eef0ff] text-[#2d3d8f]' : 'bg-[#f4f4f1] text-[#596078]'}`}>
                <span className="mono mr-1 text-[9px] opacity-70">{positionOf(hand, action.name)}</span>{action.name} {describeAction(action)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function HandHistoryCard({ hand, number, onDelete }: { hand: HandHistory; number: number; onDelete?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const pot = potTotal(hand);
  const tag = tagLabel(hand.tag);
  const hasDetail = hand.seats.length > 0 || hand.actions.length > 0;
  return (
    <div className="px-4 py-3" data-testid={`hand-${hand.id}`}>
      <div className="flex items-center gap-2">
        <span className="mono rounded-md bg-[#eef0ff] px-1.5 py-0.5 text-[10px] font-bold text-[#2d3d8f]">#{number}</span>
        <span className="mono text-[11px] text-[#858a9b]">{formatTime(hand.time)}</span>
        {tag ? <span className="rounded-full bg-[#fff6d6] px-2 py-0.5 text-[11px] font-bold text-[#7a5600]">{tag}</span> : null}
        <span className="flex-1" />
        {pot > 0 ? <span className="text-xs font-bold text-[#20253a]">팟 {formatAmount(pot)}</span> : null}
      </div>
      {hand.board.length > 0 || hand.winners.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {hand.board.length > 0 ? <span className="flex gap-0.5">{hand.board.map((card) => <MiniCard key={`${card.rank}${card.suit}`} card={card} />)}</span> : null}
          {hand.winners.length > 0 ? <span className="text-sm font-bold text-[#7a5600]">🏆 {hand.winners.join(' · ')}</span> : null}
        </div>
      ) : null}
      {Object.keys(hand.shown).length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {Object.entries(hand.shown).map(([name, cards]) => (
            <span key={name} className="flex items-center gap-1 text-xs font-semibold text-[#596078]">{name}{cards.map((card) => <MiniCard key={`${card.rank}${card.suit}`} card={card} />)}</span>
          ))}
        </div>
      ) : null}
      {hand.memo ? <p className="mt-1.5 break-keep text-sm text-[#20253a]">{hand.memo}</p> : null}
      {hasDetail || onDelete ? (
        <div className="mt-1.5 flex items-center gap-3">
          {hasDetail ? (
            <button type="button" onClick={() => setExpanded((current) => !current)} className="flex items-center gap-0.5 text-[11px] font-bold text-[#2d3d8f]" data-testid={`button-expand-${hand.id}`}>
              {expanded ? '접기' : '상세 보기'} <ChevronDown size={12} className={expanded ? 'rotate-180' : ''} />
            </button>
          ) : null}
          {onDelete ? <button type="button" onClick={onDelete} className="ml-auto flex items-center gap-0.5 text-[11px] font-bold text-[#c0392b]" data-testid={`button-delete-${hand.id}`}><Trash2 size={11} /> 삭제</button> : null}
        </div>
      ) : null}
      {expanded ? (
        <div className="mt-2 rounded-xl bg-[#fafaf6] p-2.5">
          {hand.seats.length > 0 ? (
            <p className="text-[11px] text-[#596078]">
              {hand.seats.map((name) => `${positionOf(hand, name)} ${name}`).join(' · ')}
              {hand.blinds ? ` · 블라인드 ${formatAmount(hand.blinds.sb)}/${formatAmount(hand.blinds.bb)}` : ''}
            </p>
          ) : null}
          <ActionLog hand={hand} />
        </div>
      ) : null}
    </div>
  );
}

export function HandHistoryList({ hands, onDelete }: { hands: HandHistory[]; onDelete?: (hand: HandHistory) => void }) {
  const numbered = useMemo(() => hands.map((hand, index) => ({ hand, number: index + 1 })).reverse(), [hands]);
  return (
    <div className="divide-y divide-[#ececf0]">
      {numbered.map(({ hand, number }) => (
        <HandHistoryCard key={hand.id} hand={hand} number={number} onDelete={onDelete ? () => onDelete(hand) : undefined} />
      ))}
    </div>
  );
}

export function HandHistoryModal({ hands, subtitle, onClose }: { hands: HandHistory[]; subtitle?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" onClick={onClose} data-testid="modal-hand-history">
      <div className="rise-in flex max-h-[85vh] w-full max-w-[460px] flex-col rounded-[24px] bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-[#20253a]">게임 히스토리</h3>
            {subtitle ? <p className="mono mt-0.5 text-xs text-[#858a9b]">{subtitle} · {hands.length}핸드</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f1f1ee] px-3 py-1 text-xs font-bold text-[#697087]">닫기</button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <HandHistoryList hands={hands} />
        </div>
      </div>
    </div>
  );
}

const COLLAPSED_COUNT = 5;

// Bottom of the game tab: record button plus the hands so far, newest first.
export default function HandHistorySection({
  participants,
  hands,
  canRecord,
  onRecord,
  onDelete,
}: {
  participants: string[];
  hands: HandHistory[];
  canRecord: boolean;
  onRecord: (hand: HandHistory) => void;
  onDelete: (hand: HandHistory) => void;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? hands : hands.slice(-COLLAPSED_COUNT);
  const offset = hands.length - visible.length;

  return (
    <>
      <section className="rise-in delay-2 mt-6" data-testid="section-hand-history">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">hand history</p>
            <h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">게임 히스토리</h3>
          </div>
          <span className="text-xs text-[#858a9b]">{hands.length}핸드</span>
        </div>
        <button
          type="button"
          disabled={!canRecord}
          onClick={() => setIsRecording(true)}
          className="tilt-button flex w-full items-center justify-center gap-2 rounded-[16px] bg-[#2d3d8f] py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(45,61,143,.16)] hover:bg-[#202e74] disabled:cursor-not-allowed disabled:opacity-40"
          data-testid="button-record-hand"
        >
          <NotebookPen size={16} /> {canRecord ? '핸드 기록하기' : '게임이 시작되면 기록할 수 있어요'}
        </button>
        {hands.length > 0 ? (
          <div className="tilt-card mt-3 overflow-hidden">
            <div className="divide-y divide-[#ececf0]">
              {visible.map((hand, index) => ({ hand, number: offset + index + 1 })).reverse().map(({ hand, number }) => (
                <HandHistoryCard key={hand.id} hand={hand} number={number} onDelete={() => onDelete(hand)} />
              ))}
            </div>
            {hands.length > COLLAPSED_COUNT ? (
              <button type="button" onClick={() => setShowAll((current) => !current)} className="w-full border-t border-[#ececf0] py-2.5 text-xs font-bold text-[#2d3d8f]" data-testid="button-toggle-hands">
                {showAll ? '최근 5핸드만 보기' : `전체 ${hands.length}핸드 보기`}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
      {/* Outside the rise-in section: its animation transform would trap the fixed overlay. */}
      {isRecording ? (
        <HandRecorder
          number={hands.length + 1}
          participants={participants}
          previous={[...hands].reverse().find((hand) => hand.seats.length > 0) ?? null}
          onSave={(hand) => { onRecord(hand); setIsRecording(false); }}
          onClose={() => setIsRecording(false)}
        />
      ) : null}
    </>
  );
}
