import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowUpRight,
  Banknote,
  Check,
  ChevronRight,
  CirclePlus,
  Clock3,
  Coins,
  Gamepad2,
  History,
  Landmark,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  Trophy,
  Users,
  WalletCards,
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type TabKey = 'game' | 'settle' | 'ranking' | 'fund';

const navItems: Array<{ key: TabKey; label: string; path: string; icon: typeof Gamepad2 }> = [
  { key: 'game', label: '게임', path: '/', icon: Gamepad2 },
  { key: 'settle', label: '정산', path: '/settle', icon: ReceiptText },
  { key: 'ranking', label: '랭킹', path: '/ranking', icon: Trophy },
  { key: 'fund', label: '공금', path: '/fund', icon: WalletCards },
];

const players = [
  { name: '민준', score: 7, color: 'bg-[#dce6ff]', text: 'text-[#334b98]' },
  { name: '서연', score: 5, color: 'bg-[#ffe0d7]', text: 'text-[#a44c3e]' },
  { name: '도윤', score: 3, color: 'bg-[#e9edaa]', text: 'text-[#657117]' },
  { name: '지우', score: 2, color: 'bg-[#e7defb]', text: 'text-[#67429a]' },
];

function formatWon(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>('game');

  return (
    <div className="tilt-shell">
      <main className="tilt-container page-enter pb-32 pt-6 sm:pt-9">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#2d3d8f] text-[#f7f7ed] shadow-[4px_4px_0_#dfe78a]">
              <span className="mono text-[15px] font-bold tracking-[-0.12em]">TH</span>
            </div>
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#697087]">quick scorekeeper</p>
              <h1 className="text-[18px] font-bold tracking-[-0.04em] text-[#20253a]">TILT HOLDER</h1>
            </div>
          </div>
          <button
            type="button"
            className="tilt-button flex h-10 items-center gap-2 rounded-full border border-[#e2e3e8] bg-white px-3 text-xs font-semibold text-[#4a5063] shadow-sm hover:bg-[#f6f6f2]"
            data-testid="button-group-selector"
            onClick={() => window.alert('현재 모임: 금요일 보드게임')}
          >
            <Users size={15} strokeWidth={2.2} />
            <span>금요일 모임</span>
          </button>
        </header>

        {activeTab === 'game' && <GameScreen />}
        {activeTab === 'settle' && <SettleScreen />}
        {activeTab === 'ranking' && <RankingScreen />}
        {activeTab === 'fund' && <FundScreen />}
      </main>
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="rise-in mb-7">
      <p className="mono mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#697087]">{eyebrow}</p>
      <h2 className="text-[30px] font-bold leading-[1.08] tracking-[-0.06em] text-[#20253a]">{title}</h2>
      <p className="mt-3 max-w-[440px] text-[14px] leading-6 text-[#697087]">{description}</p>
    </div>
  );
}

function GameScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div>
      <PageHeading
        eyebrow="오늘의 게임 · 04.19"
        title={isPlaying ? '좋아, 다음 라운드.' : '한 판 더,\n가볍게 시작해요.'}
        description={isPlaying ? '기록은 TILT HOLDER가 맡을게요. 플레이에만 집중하세요.' : '게임 이름과 참가자만 고르면 점수 기록이 바로 시작돼요.'}
      />

      <section className="rise-in delay-1 tilt-card overflow-hidden bg-[#2d3d8f] text-[#f7f7ed]" data-testid="card-current-game">
        <div className="flex items-start justify-between p-5 pb-4 sm:p-7 sm:pb-5">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#cbd1f2]">now playing</p>
            <h3 className="mt-2 text-[23px] font-bold tracking-[-0.05em]">보난자</h3>
          </div>
          <span className="rounded-full bg-[#e9ef76] px-3 py-1.5 text-[11px] font-bold text-[#2d3d8f]">4명 참여</span>
        </div>
        <div className="mx-5 grid grid-cols-4 gap-2 border-t border-white/15 py-5 sm:mx-7">
          {players.map((player) => (
            <div key={player.name} className="text-center">
              <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${player.color} ${player.text}`}>
                {player.name.slice(0, 1)}
              </div>
              <p className="mt-2 text-[11px] text-[#d7dbf1]">{player.name}</p>
              <p className="mono mt-1 text-[14px] font-bold">{player.score}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between bg-[#263675] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2 text-xs text-[#d7dbf1]">
            <Clock3 size={14} />
            <span>{isPlaying ? '진행 중 · 라운드 3' : '마지막 기록 · 12분 전'}</span>
          </div>
          <button
            type="button"
            className="tilt-button flex items-center gap-1 rounded-full bg-[#e9ef76] px-3.5 py-2 text-xs font-bold text-[#2d3d8f] hover:bg-[#f2f5a5]"
            data-testid="button-start-round"
            onClick={() => setIsPlaying((current) => !current)}
          >
            {isPlaying ? '라운드 종료' : '라운드 시작'}
            <ArrowUpRight size={14} />
          </button>
        </div>
      </section>

      <section className="rise-in delay-2 mt-6 grid grid-cols-2 gap-3">
        <button type="button" className="tilt-button tilt-card flex min-h-[126px] flex-col justify-between p-4 text-left hover:border-[#bfc7f0]" data-testid="button-new-game" onClick={() => setIsPlaying(false)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0ff] text-[#2d3d8f]"><CirclePlus size={19} /></span>
          <span><span className="block text-sm font-bold text-[#20253a]">새 게임</span><span className="mt-1 block text-xs text-[#697087]">종목을 바꿔볼까요?</span></span>
        </button>
        <button type="button" className="tilt-button tilt-card flex min-h-[126px] flex-col justify-between p-4 text-left hover:border-[#bfc7f0]" data-testid="button-game-history" onClick={() => setShowHistory((current) => !current)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0e9] text-[#bd604d]"><History size={18} /></span>
          <span><span className="block text-sm font-bold text-[#20253a]">지난 기록</span><span className="mt-1 block text-xs text-[#697087]">오늘 2게임 완료</span></span>
        </button>
      </section>

      {showHistory ? (
        <section className="rise-in mt-6 rounded-[18px] border border-dashed border-[#d8d9df] bg-[#fafaf6] p-5" data-testid="panel-game-history">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#20253a]">오늘의 기록</h3>
            <button type="button" className="text-xs font-semibold text-[#697087] underline underline-offset-4" data-testid="button-close-history" onClick={() => setShowHistory(false)}>닫기</button>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between"><span className="text-[#697087]">스플렌더</span><span className="font-bold text-[#20253a]">민준 1위</span></div>
            <div className="flex items-center justify-between"><span className="text-[#697087]">카탄</span><span className="font-bold text-[#20253a]">서연 1위</span></div>
          </div>
        </section>
      ) : null}

      <section className="rise-in delay-3 mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">next up</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">다음 게임 후보</h3></div>
          <button type="button" className="flex items-center gap-1 text-xs font-bold text-[#2d3d8f]" data-testid="button-edit-queue" onClick={() => window.alert('게임 후보는 현재 순서대로 준비되어 있어요.')}>순서 편집 <ChevronRight size={14} /></button>
        </div>
        <div className="tilt-card divide-y divide-[#ececf0]">
          <QueueRow index="01" title="스플렌더" meta="약 30분 · 2–4명" />
          <QueueRow index="02" title="카탄" meta="약 60분 · 3–4명" />
        </div>
      </section>
    </div>
  );
}

function QueueRow({ index, title, meta }: { index: string; title: string; meta: string }) {
  return (
    <button type="button" className="tilt-button flex w-full items-center gap-4 p-4 text-left hover:bg-[#fbfbf8]" data-testid={`button-queue-${index}`}>
      <span className="mono text-[11px] text-[#a0a4b1]">{index}</span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-[#20253a]">{title}</span><span className="mt-1 block text-xs text-[#858a9b]">{meta}</span></span>
      <ChevronRight size={16} className="text-[#a0a4b1]" />
    </button>
  );
}

function SettleScreen() {
  const [showExpense, setShowExpense] = useState(false);
  const [settled, setSettled] = useState<string[]>([]);
  const [newExpense, setNewExpense] = useState({ title: '', amount: '' });
  const expenses = [
    { id: 'snack', title: '편의점 간식', payer: '민준', amount: 18400, time: '18:42' },
    { id: 'rent', title: '보드게임 대여', payer: '서연', amount: 12000, time: '18:16' },
  ];

  const markSettled = (id: string) => setSettled((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div>
      <PageHeading eyebrow="round expenses" title="정산은 여기서\n한 번에 끝내요." description="누가 먼저 냈는지만 적어두면, 각자 보낼 금액을 깔끔하게 정리해드려요." />
      <section className="rise-in delay-1 tilt-card flex items-end justify-between bg-[#e9ef76] p-5 sm:p-7" data-testid="card-settlement-summary">
        <div><p className="text-sm font-semibold text-[#596313]">현재 정산할 금액</p><p className="mono mt-2 text-[28px] font-bold tracking-[-0.08em] text-[#20253a]">{formatWon(30400)}</p></div>
        <div className="text-right"><p className="text-xs text-[#596313]">4명이 나누면</p><p className="mt-1 text-sm font-bold text-[#20253a]">{formatWon(7600)} / 1인</p></div>
      </section>
      <div className="rise-in delay-2 mt-6 flex items-center justify-between">
        <div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">expense list</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">공유 지출</h3></div>
        <button type="button" className="tilt-button flex items-center gap-1.5 rounded-full bg-[#2d3d8f] px-3.5 py-2.5 text-xs font-bold text-[#f7f7ed] hover:bg-[#202e74]" data-testid="button-add-expense" onClick={() => setShowExpense((current) => !current)}><Plus size={15} /> 지출 추가</button>
      </div>
      {showExpense ? (
        <form className="rise-in mt-3 rounded-[18px] border border-[#d9dcf1] bg-[#f3f4ff] p-4" data-testid="form-add-expense" onSubmit={(event) => { event.preventDefault(); setShowExpense(false); setNewExpense({ title: '', amount: '' }); }}>
          <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
            <label className="text-xs font-semibold text-[#596078]">내용<input value={newExpense.title} onChange={(event) => setNewExpense({ ...newExpense, title: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe1ee] bg-white px-3 text-sm outline-none focus:border-[#2d3d8f]" placeholder="예: 저녁 식사" data-testid="input-expense-title" /></label>
            <label className="text-xs font-semibold text-[#596078]">금액<input value={newExpense.amount} onChange={(event) => setNewExpense({ ...newExpense, amount: event.target.value })} inputMode="numeric" className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe1ee] bg-white px-3 text-sm outline-none focus:border-[#2d3d8f]" placeholder="0" data-testid="input-expense-amount" /></label>
            <button type="submit" className="tilt-button h-11 rounded-xl bg-[#2d3d8f] px-4 text-xs font-bold text-white" data-testid="button-save-expense">저장</button>
          </div>
        </form>
      ) : null}
      <div className="rise-in delay-3 mt-3 divide-y divide-[#ececf0] tilt-card">
        {expenses.map((expense) => {
          const isSettled = settled.includes(expense.id);
          return <div key={expense.id} className={`flex items-center gap-3 p-4 ${isSettled ? 'opacity-55' : ''}`} data-testid={`row-expense-${expense.id}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff0e9] text-[#bd604d]"><Banknote size={18} /></div>
            <div className="min-w-0 flex-1"><p className={`text-sm font-bold text-[#20253a] ${isSettled ? 'line-through' : ''}`}>{expense.title}</p><p className="mt-1 text-xs text-[#858a9b]">{expense.payer} 결제 · {expense.time}</p></div>
            <div className="text-right"><p className="mono text-sm font-bold text-[#20253a]">{formatWon(expense.amount)}</p><button type="button" className="mt-1 text-[11px] font-bold text-[#2d3d8f]" data-testid={`button-settle-${expense.id}`} onClick={() => markSettled(expense.id)}>{isSettled ? '취소' : '완료 처리'}</button></div>
          </div>;
        })}
      </div>
      <div className="rise-in delay-4 mt-8 flex items-center gap-3 rounded-[18px] border border-dashed border-[#d8d9df] p-4"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f0ec] text-[#8a8e99]"><Check size={17} /></div><p className="text-xs leading-5 text-[#697087]">모두 정산되면 다음 게임을 시작해도 좋아요.<br /><span className="font-semibold text-[#20253a]">아직 2명이 보내지 않았어요.</span></p></div>
    </div>
  );
}

function RankingScreen() {
  return (
    <div>
      <PageHeading eyebrow="season score · 4 games" title="오늘의 플레이어는\n누구였을까요?" description="이번 모임에서 쌓인 승점을 기준으로 정리했어요. 다음 판의 작은 긴장감을 위해." />
      <section className="rise-in delay-1 tilt-card overflow-hidden" data-testid="card-ranking-list">
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4"><span className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">standings</span><span className="text-xs text-[#858a9b]">승점 기준</span></div>
        <div className="divide-y divide-[#ececf0]">
          {players.map((player, index) => <div className="flex items-center gap-4 px-5 py-4" key={player.name} data-testid={`row-ranking-${player.name}`}>
            <span className={`mono flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-[#e9ef76] text-[#596313]' : 'bg-[#f1f1ee] text-[#858a9b]'}`}>{String(index + 1).padStart(2, '0')}</span>
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${player.color} ${player.text}`}>{player.name.slice(0, 1)}</div>
            <div className="flex-1"><p className="text-sm font-bold text-[#20253a]">{player.name}{index === 0 ? <span className="ml-2 rounded-full bg-[#eef0ff] px-2 py-1 text-[10px] text-[#2d3d8f]">리더</span> : null}</p><p className="mt-1 text-xs text-[#858a9b]">{index === 0 ? '최근 2게임 연속 1위' : `${index + 1}게임 참여`}</p></div>
            <p className="mono text-lg font-bold tracking-[-0.08em] text-[#20253a]">{player.score}<span className="ml-1 text-[11px] font-normal tracking-normal text-[#858a9b]">점</span></p>
          </div>)}
        </div>
      </section>
      <section className="rise-in delay-2 mt-6 grid grid-cols-[1fr_auto] gap-4 rounded-[20px] bg-[#2d3d8f] p-5 text-[#f7f7ed]" data-testid="card-rank-highlight">
        <div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#cbd1f2]">next target</p><p className="mt-2 text-lg font-bold tracking-[-0.04em]">서연님, 2점만 더!</p><p className="mt-1 text-xs text-[#d7dbf1]">민준님을 따라잡을 수 있어요.</p></div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#e9ef76] text-center"><span className="mono text-sm font-bold">2<span className="block text-[8px] font-normal">점차</span></span></div>
      </section>
      <button type="button" className="tilt-button mt-6 flex w-full items-center justify-between rounded-[16px] border border-dashed border-[#d8d9df] px-4 py-3 text-left hover:bg-[#f8f8f4]" data-testid="button-reset-ranking" onClick={() => window.alert('이번 시즌 기록은 계속 보관돼요.')}>
        <span className="flex items-center gap-2 text-xs font-semibold text-[#697087]"><RotateCcw size={15} /> 시즌 기록 안내</span><ChevronRight size={15} className="text-[#a0a4b1]" />
      </button>
    </div>
  );
}

function FundScreen() {
  const [showFundForm, setShowFundForm] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  return (
    <div>
      <PageHeading eyebrow="shared wallet" title="우리 공금,\n지금 얼마 남았지?" description="간식부터 다음 게임 대여비까지. 함께 쓰는 돈을 한눈에 확인하세요." />
      <section className="rise-in delay-1 tilt-card bg-[#fff0e9] p-5 sm:p-7" data-testid="card-fund-balance">
        <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-[#8e5347]">현재 공금 잔액</p><p className="mono mt-2 text-[34px] font-bold tracking-[-0.09em] text-[#20253a]">{formatWon(86300)}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#bd604d]"><Landmark size={20} /></div></div>
        <div className="mt-6 flex items-center justify-between border-t border-[#efcfc6] pt-4 text-xs"><span className="text-[#8e5347]">이번 달 사용액</span><span className="mono font-bold text-[#20253a]">{formatWon(42600)}</span></div>
      </section>
      <div className="rise-in delay-2 mt-6 flex items-center justify-between"><div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">fund activity</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">최근 내역</h3></div><button type="button" className="tilt-button flex items-center gap-1.5 rounded-full border border-[#dfe1e7] bg-white px-3.5 py-2.5 text-xs font-bold text-[#2d3d8f]" data-testid="button-add-fund" onClick={() => setShowFundForm((current) => !current)}><Plus size={15} /> 기록 추가</button></div>
      {showFundForm ? <form className="rise-in mt-3 flex gap-2 rounded-[18px] border border-[#f0d1c7] bg-[#fff8f5] p-3" data-testid="form-add-fund" onSubmit={(event) => { event.preventDefault(); setShowFundForm(false); setFundAmount(''); }}><input value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} inputMode="numeric" className="h-11 min-w-0 flex-1 rounded-xl border border-[#ecd9d3] bg-white px-3 text-sm outline-none focus:border-[#bd604d]" placeholder="입금 금액" data-testid="input-fund-amount" /><button type="submit" className="tilt-button rounded-xl bg-[#bd604d] px-4 text-xs font-bold text-white" data-testid="button-save-fund">추가</button></form> : null}
      <div className="rise-in delay-3 mt-3 tilt-card divide-y divide-[#ececf0]">
        <FundRow icon={<Plus size={17} />} title="3월 공금 입금" meta="민준 · 04.03" amount="+ 50,000원" positive />
        <FundRow icon={<Minus size={17} />} title="보드게임 대여" meta="서연 · 04.17" amount="- 12,000원" />
        <FundRow icon={<Minus size={17} />} title="편의점 간식" meta="민준 · 04.19" amount="- 18,400원" />
      </div>
      <section className="rise-in delay-4 mt-6 rounded-[18px] border border-dashed border-[#d8d9df] p-4" data-testid="panel-fund-empty-state"><div className="flex items-start gap-3"><Coins size={18} className="mt-0.5 text-[#9ba0ae]" /><div><p className="text-sm font-bold text-[#20253a]">다음 모임을 위한 여유</p><p className="mt-1 text-xs leading-5 text-[#697087]">잔액이 부족해지면 모두에게 알려드릴게요.</p></div></div></section>
    </div>
  );
}

function FundRow({ icon, title, meta, amount, positive = false }: { icon: ReactNode; title: string; meta: string; amount: string; positive?: boolean }) {
  return <div className="flex items-center gap-3 p-4"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${positive ? 'bg-[#eef3c5] text-[#657117]' : 'bg-[#f1f1ee] text-[#858a9b]'}`}>{icon}</div><div className="flex-1"><p className="text-sm font-bold text-[#20253a]">{title}</p><p className="mt-1 text-xs text-[#858a9b]">{meta}</p></div><p className={`mono text-sm font-bold ${positive ? 'text-[#657117]' : 'text-[#20253a]'}`}>{amount}</p></div>;
}

function BottomNavigation({ activeTab, onTabChange }: { activeTab: TabKey; onTabChange: (tab: TabKey) => void }) {
  return <nav className="tilt-nav fixed inset-x-0 bottom-0 z-20" aria-label="주요 메뉴"><div className="mx-auto grid max-w-[680px] grid-cols-4 px-4 pt-3"><div className="col-span-4 mb-2 flex justify-center"><span className="h-1 w-9 rounded-full bg-[#d9dae0]" /></div>{navItems.map(({ key, label, icon: Icon }) => <button key={key} type="button" data-active={activeTab === key} className={`tilt-nav-item flex min-h-[56px] flex-col items-center justify-center gap-1.5 text-[11px] font-semibold ${activeTab === key ? 'text-[#2d3d8f]' : 'text-[#9ba0ae]'}`} data-testid={`nav-${key}`} onClick={() => onTabChange(key)} aria-current={activeTab === key ? 'page' : undefined}><Icon size={20} strokeWidth={activeTab === key ? 2.5 : 1.8} /><span>{label}</span><span className="tilt-nav-dot" /></button>)}</div></nav>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={AppShell} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;