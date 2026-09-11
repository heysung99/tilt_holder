import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowUpRight,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CirclePlus,
  Clock3,
  Crown,
  Coins,
  Gamepad2,
  History,
  Landmark,
  Minus,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Trophy,
  UserPlus,
  Users,
  WalletCards,
} from 'lucide-react';
import { historyDates, historicalRecords } from '@/data/history';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type TabKey = 'game' | 'settle' | 'ranking' | 'fund';
type PlayerName = string;

type Player = {
  name: PlayerName;
  score: number;
  color: string;
  text: string;
};

type SessionState = {
  date: string;
  gameName: string;
  participantNames: PlayerName[];
  buyIns: Record<string, number>;
  finalAmounts: Record<string, number>;
  hostName: PlayerName | null;
  bankName: PlayerName | null;
  isFinished: boolean;
  fundApplied: boolean;
};

type ExpenseEntry = {
  id: string;
  title: string;
  payer: string;
  amount: number;
  time: string;
};

type FundEntry = {
  id: string;
  title: string;
  meta: string;
  amount: number;
};

type SettlementRow = {
  name: PlayerName;
  buyInTotal: number;
  finalAmount: number;
  result: number;
  actualSettlement: number;
};

const navItems: Array<{ key: TabKey; label: string; path: string; icon: typeof Gamepad2 }> = [
  { key: 'game', label: '게임', path: '/', icon: Gamepad2 },
  { key: 'settle', label: '정산', path: '/settle', icon: ReceiptText },
  { key: 'ranking', label: '랭킹', path: '/ranking', icon: Trophy },
  { key: 'fund', label: '공금', path: '/fund', icon: WalletCards },
];

const userNames = historicalRecords.map((record) => record.name);
const avatarStyles = [
  ['bg-[#dce6ff]', 'text-[#334b98]'],
  ['bg-[#ffe0d7]', 'text-[#a44c3e]'],
  ['bg-[#e9edaa]', 'text-[#657117]'],
  ['bg-[#e7defb]', 'text-[#67429a]'],
  ['bg-[#d9f0ea]', 'text-[#28715d]'],
  ['bg-[#f8e3bb]', 'text-[#9b6a1d]'],
];

const initialPlayers: Player[] = userNames.map((name, index) => ({
  name,
  score: 0,
  color: avatarStyles[index % avatarStyles.length][0],
  text: avatarStyles[index % avatarStyles.length][1],
}));

function formatWon(value: number) {
  return `${value.toLocaleString('ko-KR')}원`;
}

function formatSignedWon(value: number) {
  return `${value >= 0 ? '+' : '-'}${formatWon(Math.abs(value))}`;
}

function formatSessionDate(value: string) {
  const [, month, day] = value.split('-');
  return month && day ? `${month}.${day}` : value;
}

function makeAmountRecord(names: PlayerName[], amount: number) {
  return Object.fromEntries(names.map((name) => [name, amount])) as Record<string, number>;
}

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) as T : fallback;
  } catch {
    return fallback;
  }
}

const initialSession: SessionState = {
  date: '2026-09-11',
  gameName: '오늘의 게임',
  participantNames: initialPlayers.slice(0, 4).map((player) => player.name),
  buyIns: { 김형석: 1, 황성욱: 1, 채민수: 1, 최종탁: 1 },
  finalAmounts: { 김형석: 80000, 황성욱: 50000, 채민수: 40000, 최종탁: 30000 },
  hostName: '김형석',
  bankName: '황성욱',
  isFinished: false,
  fundApplied: false,
};

const initialExpenses: ExpenseEntry[] = [
  { id: 'snack', title: '편의점 간식', payer: '민준', amount: 18400, time: '18:42' },
  { id: 'rent', title: '보드게임 대여', payer: '서연', amount: 12000, time: '18:16' },
];

const initialFundEntries: FundEntry[] = [
  { id: 'opening', title: '이전 모임 잔액', meta: '시작 잔액', amount: 50000 },
  { id: 'rent', title: '보드게임 대여', meta: '서연 · 04.17', amount: -12000 },
  { id: 'snack', title: '편의점 간식', meta: '민준 · 04.19', amount: -18400 },
];

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>('game');
  const [users, setUsers] = useState<Player[]>(() => readStored('tilt-holder-users-v2', initialPlayers));
  const [session, setSession] = useState<SessionState>(() => readStored('tilt-holder-session-v2', initialSession));
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(() => readStored('tilt-holder-expenses-v2', initialExpenses));
  const [fundEntries, setFundEntries] = useState<FundEntry[]>(() => readStored('tilt-holder-fund-entries-v2', initialFundEntries));

  useEffect(() => {
    window.localStorage.setItem('tilt-holder-users-v2', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    window.localStorage.setItem('tilt-holder-session-v2', JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    window.localStorage.setItem('tilt-holder-expenses-v2', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    window.localStorage.setItem('tilt-holder-fund-entries-v2', JSON.stringify(fundEntries));
  }, [fundEntries]);

  const participantDetails = users.filter((player) => session.participantNames.includes(player.name));
  const settlementRows: SettlementRow[] = participantDetails.map((player) => {
    const buyInTotal = (session.buyIns[player.name] ?? 0) * 50000;
    const finalAmount = session.finalAmounts[player.name] ?? 0;
    const result = finalAmount - buyInTotal;
    const actualSettlement = result > 0 ? Math.round(result * 0.5) : result;

    return { name: player.name, buyInTotal, finalAmount, result, actualSettlement };
  });
  const expenseTotal = expenses.reduce((total, expense) => total + expense.amount, 0);
  const lossTotal = settlementRows.reduce((total, row) => total + (row.actualSettlement < 0 ? Math.abs(row.actualSettlement) : 0), 0);
  const totalPayout = settlementRows.reduce((total, row) => total + (row.actualSettlement > 0 ? row.actualSettlement : 0), 0);
  const grossFundContribution = lossTotal - totalPayout;
  const finalFundAmount = grossFundContribution - expenseTotal;
  const totalBuyIns = settlementRows.reduce((total, row) => total + row.buyInTotal, 0);
  const totalFinalChips = settlementRows.reduce((total, row) => total + row.finalAmount, 0);
  const fundBalance = fundEntries.reduce((total, entry) => total + entry.amount, 0);

  const createSession = (draft: { date: string; gameName: string; participantNames: PlayerName[]; hostName: PlayerName; bankName: PlayerName }) => {
    setSession({
      ...draft,
      buyIns: makeAmountRecord(draft.participantNames, 1),
      finalAmounts: makeAmountRecord(draft.participantNames, 0),
      isFinished: false,
      fundApplied: false,
    });
    setActiveTab('game');
  };

  const updateBuyIn = (name: PlayerName, delta: number) => {
    setSession((current) => ({
      ...current,
      buyIns: {
        ...current.buyIns,
        [name]: Math.max(0, (current.buyIns[name] ?? 0) + delta),
      },
    }));
  };

  const updateFinalAmount = (name: PlayerName, value: number) => {
    setSession((current) => ({
      ...current,
      finalAmounts: {
        ...current.finalAmounts,
        [name]: Number.isFinite(value) ? Math.max(0, value) : 0,
      },
    }));
  };

  const addUser = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName || users.some((user) => user.name === trimmedName)) return false;
    const style = avatarStyles[users.length % avatarStyles.length];
    setUsers((current) => [...current, { name: trimmedName, score: 0, color: style[0], text: style[1] }]);
    return true;
  };

  const renameUser = (currentName: PlayerName, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName || currentName === trimmedName || users.some((user) => user.name === trimmedName)) return false;
    setUsers((current) => current.map((user) => user.name === currentName ? { ...user, name: trimmedName } : user));
    setSession((current) => {
      const participantNames = current.participantNames.map((name) => name === currentName ? trimmedName : name);
      const buyIns = { ...current.buyIns };
      const finalAmounts = { ...current.finalAmounts };
      if (currentName in buyIns) {
        buyIns[trimmedName] = buyIns[currentName];
        delete buyIns[currentName];
      }
      if (currentName in finalAmounts) {
        finalAmounts[trimmedName] = finalAmounts[currentName];
        delete finalAmounts[currentName];
      }
      return {
        ...current,
        participantNames,
        buyIns,
        finalAmounts,
        hostName: current.hostName === currentName ? trimmedName : current.hostName,
        bankName: current.bankName === currentName ? trimmedName : current.bankName,
      };
    });
    return true;
  };

  const addExpense = (title: string, amount: number) => {
    const id = `expense-${Date.now()}`;
    const expense = { id, title, payer: '모임 공금', amount, time: '방금 전' };
    setExpenses((current) => [expense, ...current]);
    setFundEntries((current) => [
      ...current,
      { id, title, meta: `모임 공금 · ${formatSessionDate(session.date)}`, amount: -amount },
    ]);
  };

  const addFundDeposit = (amount: number) => {
    const id = `deposit-${Date.now()}`;
    setFundEntries((current) => [
      ...current,
      { id, title: '공금 직접 입금', meta: `오늘 · ${formatSessionDate(session.date)}`, amount },
    ]);
  };

  const finishSession = () => {
    if (session.fundApplied) return;
    if (grossFundContribution !== 0) {
      setFundEntries((current) => [
        ...current,
        {
          id: `game-${session.date}-${session.gameName}`,
          title: `${session.gameName} 정산 공금`,
          meta: `${formatSessionDate(session.date)} · 손실금 - 지급액`,
          amount: grossFundContribution,
        },
      ]);
    }
    setSession((current) => ({ ...current, isFinished: true, fundApplied: true }));
  };

  const completeSettlement = () => {
    if (totalBuyIns !== totalFinalChips) {
      window.alert('정산이 제대로 되지 않았습니다.');
      return;
    }
    window.alert('정산이 완료되었습니다.');
    console.log({
      session,
      settlementRows,
      totalBuyIns,
      totalFinalChips,
      finalFundAmount,
    });
    finishSession();
  };

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

        {activeTab === 'game' && (
          <GameScreen
            session={session}
            users={users}
            onCreateSession={createSession}
            onBuyInChange={updateBuyIn}
            onAddUser={addUser}
            onRenameUser={renameUser}
          />
        )}
        {activeTab === 'settle' && (
          <SettleScreen
            session={session}
            expenses={expenses}
            settlementRows={settlementRows}
            grossFundContribution={grossFundContribution}
            finalFundAmount={finalFundAmount}
            totalPayout={totalPayout}
            fundBalance={fundBalance}
            totalBuyIns={totalBuyIns}
            totalFinalChips={totalFinalChips}
            onFinalAmountChange={updateFinalAmount}
            onAddExpense={addExpense}
            onFinishSession={completeSettlement}
          />
        )}
        {activeTab === 'ranking' && <RankingScreen users={users} />}
        {activeTab === 'fund' && (
          <FundScreen
            fundEntries={fundEntries}
            fundBalance={fundBalance}
            onAddDeposit={addFundDeposit}
          />
        )}
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

function GameScreen({
  session,
  users,
  onCreateSession,
  onBuyInChange,
  onAddUser,
  onRenameUser,
}: {
  session: SessionState;
  users: Player[];
  onCreateSession: (draft: { date: string; gameName: string; participantNames: PlayerName[]; hostName: PlayerName; bankName: PlayerName }) => void;
  onBuyInChange: (name: PlayerName, delta: number) => void;
  onAddUser: (name: string) => boolean;
  onRenameUser: (currentName: PlayerName, nextName: string) => boolean;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNewGame, setShowNewGame] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="tilt-button rise-in mb-6 flex w-full items-center justify-between rounded-[18px] bg-[#2d3d8f] px-5 py-4 text-left text-white shadow-[0_12px_28px_rgba(45,61,143,.18)] hover:bg-[#202e74]"
        data-testid="button-open-game"
        onClick={() => setShowNewGame((current) => !current)}
      >
        <span><span className="mono block text-[10px] font-bold uppercase tracking-[0.16em] text-[#cbd1f2]">new game</span><span className="mt-1 block text-lg font-bold">게임 개설</span></span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9ef76] text-[#2d3d8f]"><CirclePlus size={20} /></span>
      </button>
      {showNewGame ? <NewSessionForm users={users} currentSession={session} onCreate={(draft) => { onCreateSession(draft); setShowNewGame(false); setIsPlaying(false); }} onAddUser={onAddUser} onRenameUser={onRenameUser} /> : null}

      <PageHeading
        eyebrow={`게임 세션 · ${formatSessionDate(session.date)}`}
        title={isPlaying ? '좋아, 다음 라운드.' : '한 판 더,\n가볍게 시작해요.'}
        description={isPlaying ? '기록은 TILT HOLDER가 맡을게요. 플레이에만 집중하세요.' : '게임 날짜와 참가자를 고르면 바이인 기록을 바로 시작할 수 있어요.'}
      />

      <section className="rise-in delay-1 tilt-card overflow-hidden bg-[#2d3d8f] text-[#f7f7ed]" data-testid="card-current-game">
        <div className="flex items-start justify-between p-5 pb-4 sm:p-7 sm:pb-5">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#cbd1f2]">now playing</p>
            <h3 className="mt-2 text-[23px] font-bold tracking-[-0.05em]">{session.gameName}</h3>
          </div>
          <span className="rounded-full bg-[#e9ef76] px-3 py-1.5 text-[11px] font-bold text-[#2d3d8f]">{session.participantNames.length}명 참여</span>
        </div>
        <div className="mx-5 grid grid-cols-4 gap-2 border-t border-white/15 py-5 sm:mx-7">
          {users.filter((player) => session.participantNames.includes(player.name)).map((player) => (
            <div key={player.name} className="text-center">
              <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${player.color} ${player.text}`}>
                {player.name.slice(0, 1)}
              </div>
              <p className="mt-2 text-[11px] text-[#d7dbf1]">{player.name}</p>
              <p className="mono mt-1 text-[14px] font-bold">{session.buyIns[player.name] ?? 0}<span className="ml-1 text-[10px] font-normal text-[#cbd1f2]">회</span></p>
              <div className="mt-1 flex justify-center gap-1 text-[8px] font-bold uppercase tracking-wide text-[#cbd1f2]">
                {session.hostName === player.name ? <span>HOST</span> : null}
                {session.bankName === player.name ? <span>BANK</span> : null}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between bg-[#263675] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2 text-xs text-[#d7dbf1]">
            <Clock3 size={14} />
            <span>{isPlaying ? '진행 중 · 바이인 기록 중' : session.isFinished ? '게임 종료 · 정산 가능' : '시작 전 · 바이인 준비'}</span>
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

      <section className="rise-in delay-2 mt-6 rounded-[18px] border border-[#d9dcf1] bg-[#f3f4ff] p-4" data-testid="panel-buy-in-controls">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">live buy-in</p>
            <h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">바이인 횟수 기록</h3>
          </div>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#2d3d8f]">1회 = 50,000원</span>
        </div>
        <div className="space-y-2">
          {users.filter((player) => session.participantNames.includes(player.name)).map((player) => (
            <div key={player.name} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${player.color} ${player.text}`}>{player.name.slice(0, 1)}</div>
              <span className="flex-1 text-sm font-bold text-[#20253a]">{player.name}</span>
              <button type="button" className="tilt-button flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfe1ee] text-[#2d3d8f] hover:bg-[#eef0ff]" aria-label={`${player.name} 바이인 1회 줄이기`} data-testid={`button-buy-in-minus-${player.name}`} onClick={() => onBuyInChange(player.name, -1)}><Minus size={15} /></button>
              <span className="mono min-w-10 text-center text-sm font-bold text-[#20253a]" data-testid={`count-buy-in-${player.name}`}>{session.buyIns[player.name] ?? 0}</span>
              <button type="button" className="tilt-button flex h-9 w-9 items-center justify-center rounded-lg bg-[#2d3d8f] text-white hover:bg-[#202e74]" aria-label={`${player.name} 바이인 1회 추가`} data-testid={`button-buy-in-plus-${player.name}`} onClick={() => onBuyInChange(player.name, 1)}><Plus size={15} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="rise-in delay-2 mt-6 grid grid-cols-2 gap-3">
        <button type="button" className="tilt-button tilt-card flex min-h-[126px] flex-col justify-between p-4 text-left hover:border-[#bfc7f0]" data-testid="button-new-game" onClick={() => setShowNewGame((current) => !current)}>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef0ff] text-[#2d3d8f]"><CirclePlus size={19} /></span>
          <span><span className="block text-sm font-bold text-[#20253a]">새 세션</span><span className="mt-1 block text-xs text-[#697087]">날짜와 참가자 설정</span></span>
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

function NewSessionForm({
  users,
  currentSession,
  onCreate,
  onAddUser,
  onRenameUser,
}: {
  users: Player[];
  currentSession: SessionState;
  onCreate: (draft: { date: string; gameName: string; participantNames: PlayerName[]; hostName: PlayerName; bankName: PlayerName }) => void;
  onAddUser: (name: string) => boolean;
  onRenameUser: (currentName: PlayerName, nextName: string) => boolean;
}) {
  const [date, setDate] = useState(currentSession.date);
  const [gameName, setGameName] = useState(currentSession.gameName);
  const [participantNames, setParticipantNames] = useState<PlayerName[]>(currentSession.participantNames);
  const [hostName, setHostName] = useState<PlayerName | null>(currentSession.hostName);
  const [bankName, setBankName] = useState<PlayerName | null>(currentSession.bankName);
  const [newUserName, setNewUserName] = useState('');
  const [editingName, setEditingName] = useState<PlayerName | null>(null);
  const [editingValue, setEditingValue] = useState('');

  const toggleParticipant = (name: PlayerName) => {
    setParticipantNames((current) => {
      if (current.includes(name)) {
        const next = current.filter((item) => item !== name);
        if (hostName === name) setHostName(next[0] ?? null);
        if (bankName === name) setBankName(next[0] ?? null);
        return next;
      }
      return [...current, name];
    });
  };

  return (
    <form
      className="rise-in mt-6 rounded-[18px] border border-[#d9dcf1] bg-white p-4 shadow-[0_10px_28px_rgba(45,61,143,.08)]"
      data-testid="form-new-session"
      onSubmit={(event) => {
        event.preventDefault();
        if (participantNames.length > 0 && gameName.trim()) {
          onCreate({ date, gameName: gameName.trim(), participantNames, hostName: hostName!, bankName: bankName! });
        }
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">new session</p><h3 className="mt-1 text-lg font-bold text-[#20253a]">게임 세션 만들기</h3></div>
        <CalendarDays size={19} className="text-[#2d3d8f]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-[#596078]">게임 날짜<input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe1ee] bg-white px-3 text-sm text-[#20253a] outline-none focus:border-[#2d3d8f]" data-testid="input-session-date" /></label>
        <label className="text-xs font-semibold text-[#596078]">게임 이름<input value={gameName} onChange={(event) => setGameName(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-[#dfe1ee] bg-white px-3 text-sm text-[#20253a] outline-none focus:border-[#2d3d8f]" placeholder="예: 보난자" data-testid="input-session-name" /></label>
      </div>
      <fieldset className="mt-4">
        <legend className="flex items-center gap-1.5 text-xs font-semibold text-[#596078]"><Crown size={13} className="text-[#2d3d8f]" /> 참가자 선택 · 역할 지정</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {users.map((player) => {
            const selected = participantNames.includes(player.name);
            return <div key={player.name} className={`rounded-xl border p-2 ${selected ? 'border-[#bfc7f0] bg-[#eef0ff]' : 'border-[#e4e5ea] bg-white'}`}>
              <button type="button" className={`tilt-button flex w-full items-center gap-2 text-left text-sm font-semibold ${selected ? 'text-[#2d3d8f]' : 'text-[#858a9b]'}`} data-testid={`button-select-participant-${player.name}`} onClick={() => toggleParticipant(player.name)}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${player.color} ${player.text}`}>{selected ? <Check size={14} /> : player.name.slice(0, 1)}</span><span className="min-w-0 flex-1 truncate">{player.name}</span></button>
              <div className="mt-2 flex items-center justify-between gap-1 border-t border-[#ececf0] pt-2 text-[9px] font-bold tracking-wide">
                <label className={`flex items-center gap-1 ${selected ? 'text-[#2d3d8f]' : 'text-[#b1b4bf]'}`}><input type="radio" name="host-player" checked={hostName === player.name} disabled={!selected} onChange={() => setHostName(player.name)} /> HOST</label>
                <label className={`flex items-center gap-1 ${selected ? 'text-[#bd604d]' : 'text-[#b1b4bf]'}`}><input type="radio" name="bank-player" checked={bankName === player.name} disabled={!selected} onChange={() => setBankName(player.name)} /> BANK</label>
              </div>
            </div>;
          })}
        </div>
      </fieldset>
      <div className="mt-4 rounded-xl bg-[#fafaf6] p-3">
        <div className="flex items-center gap-2"><UserPlus size={15} className="text-[#2d3d8f]" /><p className="text-xs font-bold text-[#20253a]">유저 관리</p></div>
        <div className="mt-2 flex gap-2">
          <input value={newUserName} onChange={(event) => setNewUserName(event.target.value)} className="h-10 min-w-0 flex-1 rounded-lg border border-[#dfe1ee] bg-white px-3 text-sm outline-none focus:border-[#2d3d8f]" placeholder="새 유저명" data-testid="input-new-user-name" />
          <button type="button" className="tilt-button rounded-lg bg-[#2d3d8f] px-3 text-xs font-bold text-white" data-testid="button-add-user" onClick={() => { if (onAddUser(newUserName)) setNewUserName(''); }}>추가</button>
        </div>
        <div className="mt-3 space-y-2">
          {users.map((user) => editingName === user.name ? (
            <div key={user.name} className="flex gap-2">
              <input value={editingValue} onChange={(event) => setEditingValue(event.target.value)} className="h-9 min-w-0 flex-1 rounded-lg border border-[#dfe1ee] bg-white px-2 text-sm outline-none focus:border-[#2d3d8f]" autoFocus data-testid={`input-edit-user-${user.name}`} />
              <button type="button" className="text-xs font-bold text-[#2d3d8f]" onClick={() => { if (onRenameUser(user.name, editingValue)) { setEditingName(null); setEditingValue(''); } }}>저장</button>
              <button type="button" className="text-xs text-[#858a9b]" onClick={() => setEditingName(null)}>취소</button>
            </div>
          ) : (
            <div key={user.name} className="flex items-center justify-between text-xs text-[#697087]">
              <span>{user.name}</span>
              <button type="button" className="flex items-center gap-1 text-[#2d3d8f]" data-testid={`button-edit-user-${user.name}`} onClick={() => { setEditingName(user.name); setEditingValue(user.name); }}><Pencil size={12} /> 수정</button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-[#858a9b]">{participantNames.length}명 선택됨</p>
        <button type="submit" disabled={!gameName.trim() || participantNames.length === 0 || !hostName || !bankName} className="tilt-button rounded-xl bg-[#2d3d8f] px-4 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-create-session">참가자 선택 완료</button>
      </div>
    </form>
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

function SettleScreen({
  session,
  expenses,
  settlementRows,
  grossFundContribution,
  finalFundAmount,
  totalPayout,
  fundBalance,
  totalBuyIns,
  totalFinalChips,
  onFinalAmountChange,
  onAddExpense,
  onFinishSession,
}: {
  session: SessionState;
  expenses: ExpenseEntry[];
  settlementRows: SettlementRow[];
  grossFundContribution: number;
  finalFundAmount: number;
  totalPayout: number;
  fundBalance: number;
  totalBuyIns: number;
  totalFinalChips: number;
  onFinalAmountChange: (name: PlayerName, value: number) => void;
  onAddExpense: (title: string, amount: number) => void;
  onFinishSession: () => void;
}) {
  const [showExpense, setShowExpense] = useState(false);
  const [settled, setSettled] = useState<string[]>([]);
  const [newExpense, setNewExpense] = useState({ title: '', amount: '' });
  const expenseTotal = expenses.reduce((total, expense) => total + expense.amount, 0);
  const projectedFundBalance = session.fundApplied ? fundBalance : fundBalance + grossFundContribution;

  const markSettled = (id: string) => setSettled((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div>
      <PageHeading eyebrow="round expenses" title="정산은 여기서\n한 번에 끝내요." description="누가 먼저 냈는지만 적어두면, 각자 보낼 금액을 깔끔하게 정리해드려요." />
      <section className="rise-in delay-1 tilt-card bg-[#e9ef76] p-5 sm:p-7" data-testid="card-settlement-summary">
        <div className="flex items-end justify-between">
          <div><p className="text-sm font-semibold text-[#596313]">플러스 플레이어 지급액</p><p className="mono mt-2 text-[28px] font-bold tracking-[-0.08em] text-[#20253a]">{formatWon(totalPayout)}</p></div>
          <div className="text-right"><p className="text-xs text-[#596313]">{settlementRows.length}명이 참여</p><p className="mt-1 text-sm font-bold text-[#20253a]">바이인 {formatWon(totalBuyIns)}</p></div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[#cfd66c] pt-4">
          <div><p className="text-xs text-[#596313]">오늘 최종 공금액</p><p className="mono mt-1 text-lg font-bold text-[#20253a]">{formatSignedWon(finalFundAmount)}</p></div>
          <div className="text-right"><p className="text-xs text-[#596313]">종료 후 공금 잔액</p><p className="mono mt-1 text-lg font-bold text-[#20253a]">{formatWon(projectedFundBalance)}</p></div>
        </div>
      </section>
      <section className="rise-in delay-1 mt-4 rounded-[18px] border border-[#d9dcf1] bg-[#f3f4ff] p-4" data-testid="panel-special-rule">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#2d3d8f]"><CheckCircle2 size={18} /></div>
          <div>
            <p className="text-sm font-bold text-[#20253a]">특수 룰 · 딴 돈의 50%만 지급</p>
            <p className="mt-1 text-xs leading-5 text-[#697087]">바이인보다 많이 딴 금액의 절반만 지급하고, 나머지 절반은 게임 종료 시 공금으로 자동 귀속됩니다.</p>
            <p className="mt-2 text-[11px] font-semibold text-[#2d3d8f]">예시: 100,000원 → 160,000원이라면 130,000원 지급 · 30,000원 공금</p>
          </div>
        </div>
      </section>
      <div className="rise-in delay-2 mt-7">
        <div className="mb-3 flex items-center justify-between"><div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">payout calculator</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">플레이어별 정산</h3></div><span className="text-xs text-[#858a9b]">최종 금액 입력</span></div>
        <div className="tilt-card divide-y divide-[#ececf0]">
          {settlementRows.map((row) => (
            <div key={row.name} className="p-4" data-testid={`row-settlement-${row.name}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef0ff] text-xs font-bold text-[#2d3d8f]">{row.name.slice(0, 1)}</div>
                <div className="flex-1"><p className="text-sm font-bold text-[#20253a]">{row.name}</p><p className="mt-1 text-xs text-[#858a9b]">바이인 {formatWon(row.buyInTotal)}</p></div>
                <label className="text-right text-[10px] font-semibold text-[#858a9b]">최종 금액<input value={row.finalAmount || ''} onChange={(event) => onFinalAmountChange(row.name, Number(event.target.value.replace(/[^0-9]/g, '')) || 0)} inputMode="numeric" className="mt-1 h-9 w-[116px] rounded-lg border border-[#dfe1ee] bg-white px-2 text-right text-sm font-bold text-[#20253a] outline-none focus:border-[#2d3d8f]" placeholder="0" data-testid={`input-final-amount-${row.name}`} /></label>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fafaf6] px-3 py-2.5 text-xs">
                <span className={row.result >= 0 ? 'text-[#657117]' : 'text-[#bd604d]'}>최종 결과 {formatSignedWon(row.result)}</span>
                <span className={`font-bold ${row.actualSettlement >= 0 ? 'text-[#2d3d8f]' : 'text-[#bd604d]'}`}>실제 정산액 {formatSignedWon(row.actualSettlement)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rise-in delay-2 mt-6 flex items-center justify-between">
        <div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">today expenses</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">당일 사용 지출</h3></div>
        <button type="button" className="tilt-button flex items-center gap-1.5 rounded-full bg-[#2d3d8f] px-3.5 py-2.5 text-xs font-bold text-[#f7f7ed] hover:bg-[#202e74]" data-testid="button-add-expense" onClick={() => setShowExpense((current) => !current)}><Plus size={15} /> 지출 추가</button>
      </div>
      {showExpense ? (
        <form className="rise-in mt-3 rounded-[18px] border border-[#d9dcf1] bg-[#f3f4ff] p-4" data-testid="form-add-expense" onSubmit={(event) => { event.preventDefault(); const amount = Number(newExpense.amount.replace(/[^0-9]/g, '')); if (newExpense.title.trim() && amount > 0) { onAddExpense(newExpense.title.trim(), amount); setShowExpense(false); setNewExpense({ title: '', amount: '' }); } }}>
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
      <section className="rise-in delay-4 mt-8 rounded-[18px] border border-[#d8d9df] bg-white p-4" data-testid="card-fund-final-preview">
        <div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef3c5] text-[#657117]"><Landmark size={17} /></div><div className="flex-1"><p className="text-sm font-bold text-[#20253a]">최종 공금액 계산</p><p className="mt-1 text-xs leading-5 text-[#697087]">손실금 {formatWon(settlementRows.reduce((total, row) => total + (row.actualSettlement < 0 ? Math.abs(row.actualSettlement) : 0), 0))} - 지급액 {formatWon(totalPayout)} - 지출 {formatWon(expenseTotal)}</p></div><p className="mono text-lg font-bold text-[#20253a]">{formatSignedWon(finalFundAmount)}</p></div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#fafaf6] px-3 py-2 text-xs"><span className="text-[#697087]">칩 합계 검증</span><span className={totalBuyIns === totalFinalChips ? 'font-bold text-[#657117]' : 'font-bold text-[#bd604d]'}>{formatWon(totalFinalChips)} / {formatWon(totalBuyIns)} {totalBuyIns === totalFinalChips ? '일치' : '불일치'}</span></div>
        <button type="button" className="tilt-button mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2d3d8f] px-4 py-3 text-xs font-bold text-white hover:bg-[#202e74] disabled:cursor-not-allowed disabled:opacity-50" data-testid="button-settle-session" onClick={onFinishSession} disabled={session.fundApplied}><Check size={15} />{session.fundApplied ? '정산 완료' : '정산하기'}</button>
      </section>
    </div>
  );
}

function rankingTier(rank: number, total: number) {
  const percentile = total === 0 ? 1 : rank / total;
  if (percentile <= 0.05) return { label: '챌린저', className: 'bg-[#eee4b8] text-[#8d6b15]' };
  if (percentile <= 0.15) return { label: '그랜드마스터', className: 'bg-[#ffe0d7] text-[#a44c3e]' };
  if (percentile <= 0.3) return { label: '마스터', className: 'bg-[#e7defb] text-[#67429a]' };
  if (percentile <= 0.5) return { label: '다이아', className: 'bg-[#dce6ff] text-[#334b98]' };
  if (percentile <= 0.7) return { label: '플래티넘', className: 'bg-[#d9f0ea] text-[#28715d]' };
  if (percentile <= 0.85) return { label: '골드', className: 'bg-[#f8e3bb] text-[#9b6a1d]' };
  return { label: '실버', className: 'bg-[#f1f1ee] text-[#697087]' };
}

function RankingScreen({ users }: { users: Player[] }) {
  const [selectedDate, setSelectedDate] = useState(historyDates[historyDates.length - 1] ?? '');
  const rankedPlayers = users
    .map((player) => {
      const record = historicalRecords.find((item) => item.name === player.name);
      const values = record?.values ?? [];
      const playedValues = values.filter((value): value is number => value !== null);
      const wins = playedValues.filter((value) => value > 0).length;
      const winnings = playedValues.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
      return {
        player,
        played: playedValues.length,
        wins,
        losses: playedValues.length - wins,
        winnings,
        winRate: playedValues.length ? wins / playedValues.length : 0,
        recent: playedValues.slice(-3),
      };
    })
    .sort((a, b) => b.winnings - a.winnings || b.winRate - a.winRate || b.played - a.played);

  const selectedDateIndex = historyDates.indexOf(selectedDate);

  return (
    <div>
      <PageHeading eyebrow={`historical ranking · ${historyDates.length} games`} title="지금까지의\n랭킹" description="전적 파일을 기준으로 누적상금, 승률, 최근 3경기를 집계했어요. 빈칸은 미참여, 0은 패배로 계산했습니다." />
      <section className="rise-in delay-1 tilt-card overflow-hidden" data-testid="card-ranking-list">
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4"><div><span className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">standings</span><p className="mt-1 text-xs text-[#858a9b]">누적상금 양수 합계 · 순위별 티어</p></div><Trophy size={18} className="text-[#b38b1e]" /></div>
        <div className="divide-y divide-[#ececf0]">
          {rankedPlayers.map((stat, index) => {
            const rank = index + 1;
            const tier = rankingTier(rank, rankedPlayers.length);
            return <div className="p-4" key={stat.player.name} data-testid={`row-ranking-${stat.player.name}`}>
              <div className="flex items-start gap-3">
                <span className={`mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rank === 1 ? 'bg-[#e9ef76] text-[#596313]' : 'bg-[#f1f1ee] text-[#858a9b]'}`}>{String(rank).padStart(2, '0')}</span>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${stat.player.color} ${stat.player.text}`}>{stat.player.name.slice(0, 1)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold text-[#20253a]">{stat.player.name}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${tier.className}`}>{tier.label}</span></div>
                  <p className="mt-1 text-xs text-[#858a9b]">총 {stat.played}경기 · {stat.wins}승 {stat.losses}패</p>
                </div>
                <div className="text-right"><p className="mono text-lg font-bold tracking-[-0.08em] text-[#20253a]">+{stat.winnings.toLocaleString()}</p><p className="text-[10px] text-[#858a9b]">누적상금</p></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#fafaf6] px-3 py-2.5 text-xs">
                <div><p className="text-[#858a9b]">승률</p><p className="mono mt-1 font-bold text-[#20253a]">{Math.round(stat.winRate * 100)}%</p></div>
                <div><p className="text-[#858a9b]">최근 3경기</p><div className="mt-1 flex gap-1.5">{stat.recent.length ? stat.recent.map((value, recentIndex) => <span key={`${stat.player.name}-${recentIndex}`} className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${value > 0 ? 'bg-[#e5f1db] text-[#50722b]' : 'bg-[#ffe8e2] text-[#a44c3e]'}`}>{value > 0 ? '승' : '패'}</span>) : <span className="text-[#a0a4b1]">기록 없음</span>}</div></div>
              </div>
            </div>;
          })}
        </div>
      </section>

      <section className="rise-in delay-2 mt-6" data-testid="section-date-results">
        <div className="mb-3 flex items-end justify-between"><div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">date results</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">날짜별 결과</h3></div><span className="text-xs text-[#858a9b]">총 {historyDates.length}회</span></div>
        <label className="sr-only" htmlFor="ranking-date-select">전적 날짜 선택</label>
        <select id="ranking-date-select" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-11 w-full rounded-xl border border-[#dfe1ee] bg-white px-3 text-sm font-bold text-[#20253a] outline-none focus:border-[#2d3d8f]" data-testid="select-ranking-date">
          {historyDates.slice().reverse().map((date) => <option key={date} value={date}>{date}</option>)}
        </select>
        <div className="tilt-card mt-3 divide-y divide-[#ececf0]">
          {users.map((player) => {
            const record = historicalRecords.find((item) => item.name === player.name);
            const value = selectedDateIndex >= 0 ? record?.values[selectedDateIndex] ?? null : null;
            return <div key={player.name} className="flex items-center gap-3 px-4 py-3" data-testid={`row-date-result-${player.name}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${player.color} ${player.text}`}>{player.name.slice(0, 1)}</div>
              <span className="flex-1 text-sm font-semibold text-[#20253a]">{player.name}</span>
              {value === null ? <span className="rounded-full bg-[#f1f1ee] px-2 py-1 text-[10px] font-bold text-[#9ba0ae]">미참여</span> : <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${value > 0 ? 'bg-[#e5f1db] text-[#50722b]' : 'bg-[#ffe8e2] text-[#a44c3e]'}`}>{value > 0 ? '승' : '패'} <span className="mono">{value > 0 ? '+' : ''}{value}</span></span>}
            </div>;
          })}
        </div>
      </section>
      <button type="button" className="tilt-button mt-6 flex w-full items-center justify-between rounded-[16px] border border-dashed border-[#d8d9df] px-4 py-3 text-left hover:bg-[#f8f8f4]" data-testid="button-ranking-rule" onClick={() => window.alert('빈칸은 미참여, 0을 포함한 음수는 패배로 계산했어요.')}>
        <span className="flex items-center gap-2 text-xs font-semibold text-[#697087]"><RotateCcw size={15} /> 전적 계산 기준</span><ChevronRight size={15} className="text-[#a0a4b1]" />
      </button>
    </div>
  );
}

function FundScreen({
  fundEntries,
  fundBalance,
  onAddDeposit,
}: {
  fundEntries: FundEntry[];
  fundBalance: number;
  onAddDeposit: (amount: number) => void;
}) {
  const [showFundForm, setShowFundForm] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const spentThisMonth = fundEntries.filter((entry) => entry.amount < 0).reduce((total, entry) => total + Math.abs(entry.amount), 0);
  return (
    <div>
      <PageHeading eyebrow="shared wallet" title="우리 공금,\n지금 얼마 남았지?" description="간식부터 다음 게임 대여비까지. 함께 쓰는 돈을 한눈에 확인하세요." />
      <section className="rise-in delay-1 tilt-card bg-[#fff0e9] p-5 sm:p-7" data-testid="card-fund-balance">
        <div className="flex items-start justify-between"><div><p className="text-sm font-semibold text-[#8e5347]">현재 공금 잔액</p><p className="mono mt-2 text-[34px] font-bold tracking-[-0.09em] text-[#20253a]">{formatWon(fundBalance)}</p></div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#bd604d]"><Landmark size={20} /></div></div>
        <div className="mt-6 flex items-center justify-between border-t border-[#efcfc6] pt-4 text-xs"><span className="text-[#8e5347]">누적 사용액</span><span className="mono font-bold text-[#20253a]">{formatWon(spentThisMonth)}</span></div>
      </section>
      <div className="rise-in delay-2 mt-6 flex items-center justify-between"><div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">fund activity</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">최근 내역</h3></div><button type="button" className="tilt-button flex items-center gap-1.5 rounded-full border border-[#dfe1e7] bg-white px-3.5 py-2.5 text-xs font-bold text-[#2d3d8f]" data-testid="button-add-fund" onClick={() => setShowFundForm((current) => !current)}><Plus size={15} /> 기록 추가</button></div>
      {showFundForm ? <form className="rise-in mt-3 flex gap-2 rounded-[18px] border border-[#f0d1c7] bg-[#fff8f5] p-3" data-testid="form-add-fund" onSubmit={(event) => { event.preventDefault(); const amount = Number(fundAmount.replace(/[^0-9]/g, '')); if (amount > 0) { onAddDeposit(amount); setShowFundForm(false); setFundAmount(''); } }}><input value={fundAmount} onChange={(event) => setFundAmount(event.target.value)} inputMode="numeric" className="h-11 min-w-0 flex-1 rounded-xl border border-[#ecd9d3] bg-white px-3 text-sm outline-none focus:border-[#bd604d]" placeholder="입금 금액" data-testid="input-fund-amount" /><button type="submit" className="tilt-button rounded-xl bg-[#bd604d] px-4 text-xs font-bold text-white" data-testid="button-save-fund">추가</button></form> : null}
      <div className="rise-in delay-3 mt-3 tilt-card divide-y divide-[#ececf0]">
        {fundEntries.slice().reverse().map((entry) => <FundRow key={entry.id} entry={entry} />)}
      </div>
      <section className="rise-in delay-4 mt-6 rounded-[18px] border border-dashed border-[#d8d9df] p-4" data-testid="panel-fund-empty-state"><div className="flex items-start gap-3"><Coins size={18} className="mt-0.5 text-[#9ba0ae]" /><div><p className="text-sm font-bold text-[#20253a]">공금 자동 귀속 내역도 함께 기록돼요</p><p className="mt-1 text-xs leading-5 text-[#697087]">게임을 종료하면 딴 돈의 절반이 이곳에 자동으로 추가됩니다.</p></div></div></section>
    </div>
  );
}

function FundRow({ entry }: { entry: FundEntry }) {
  const positive = entry.amount >= 0;
  return <div className="flex items-center gap-3 p-4"><div className={`flex h-9 w-9 items-center justify-center rounded-xl ${positive ? 'bg-[#eef3c5] text-[#657117]' : 'bg-[#f1f1ee] text-[#858a9b]'}`}>{positive ? <Plus size={17} /> : <Minus size={17} />}</div><div className="flex-1"><p className="text-sm font-bold text-[#20253a]">{entry.title}</p><p className="mt-1 text-xs text-[#858a9b]">{entry.meta}</p></div><p className={`mono text-sm font-bold ${positive ? 'text-[#657117]' : 'text-[#20253a]'}`}>{positive ? '+' : '-'} {formatWon(Math.abs(entry.amount))}</p></div>;
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