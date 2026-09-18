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
  Triangle,
  UserPlus,
  WalletCards,
} from 'lucide-react';
import { type HistoricalRecord } from '@/data/history';
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

const avatarStyles = [
  ['bg-[#dce6ff]', 'text-[#334b98]'],
  ['bg-[#ffe0d7]', 'text-[#a44c3e]'],
  ['bg-[#e9edaa]', 'text-[#657117]'],
  ['bg-[#e7defb]', 'text-[#67429a]'],
  ['bg-[#d9f0ea]', 'text-[#28715d]'],
  ['bg-[#f8e3bb]', 'text-[#9b6a1d]'],
];

const initialPlayers: Player[] = [];

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

const initialSession: SessionState = {
  date: new Date().toISOString().slice(0, 10),
  gameName: '오늘의 게임',
  participantNames: [],
  buyIns: {},
  finalAmounts: {},
  hostName: null,
  bankName: null,
  isFinished: false,
  fundApplied: false,
};

const initialExpenses: ExpenseEntry[] = [];

const initialFundEntries: FundEntry[] = [];

function AppShell() {
  const [activeTab, setActiveTab] = useState<TabKey>('game');
  const [users, setUsers] = useState<Player[]>(initialPlayers);
  const [session, setSession] = useState<SessionState>(initialSession);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>(initialExpenses);
  const [fundEntries, setFundEntries] = useState<FundEntry[]>(initialFundEntries);
  const [historyDates, setHistoryDates] = useState<string[]>([]);
  const [historicalRecords, setHistoricalRecords] = useState<HistoricalRecord[]>([]);
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [passwordModalConfig, setPasswordModalConfig] = useState<PasswordModalConfig>(null);
  const [isEditingBuyIns, setIsEditingBuyIns] = useState(false);
  const [buyInEditSnapshot, setBuyInEditSnapshot] = useState<Record<string, number> | null>(null);
  const [buyInArrows, setBuyInArrows] = useState<Record<PlayerName, 'up' | 'down'>>({});

  const requestCreateSession = (draft: { date: string; gameName: string; participantNames: PlayerName[]; hostName: PlayerName; bankName: PlayerName }) => {
    setPasswordModalConfig({
      title: '게임 세션 만들기',
      onSuccess: () => createSession(draft),
    });
  };

  const requestCompleteSettlement = () => {
    setPasswordModalConfig({
      title: '정산하기',
      onSuccess: () => {
        if (totalBuyIns !== totalFinalChips) {
          window.alert('정산이 제대로 되지 않았습니다.');
          return;
        }
        finishSession();
        setShowSettlementModal(true);
      },
    });
  };

  const verifyPassword = (title: string, onSuccess: () => void) => {
    setPasswordModalConfig({ title, onSuccess });
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/expenses').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/fund').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/games').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/session').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([serverUsers, serverExpenses, serverFund, serverGames, serverSession]) => {
        if (Array.isArray(serverUsers) && serverUsers.length > 0) {
          setUsers(serverUsers);
        }
        if (Array.isArray(serverExpenses)) {
          setExpenses(serverExpenses);
        }
        if (Array.isArray(serverFund)) {
          setFundEntries(serverFund);
        }
        if (serverSession && !serverSession.fundApplied) {
          setSession({
            date: serverSession.date,
            gameName: serverSession.gameName,
            participantNames: serverSession.participantNames,
            buyIns: serverSession.buyIns,
            finalAmounts: serverSession.finalAmounts,
            hostName: serverSession.hostName,
            bankName: serverSession.bankName,
            isFinished: serverSession.isFinished,
            fundApplied: serverSession.fundApplied,
          });
          setBuyInArrows(serverSession.buyInArrows ?? {});
        }
        if (Array.isArray(serverGames) && serverGames.length > 0) {
          setHistoryDates((currentDates) => {
            const nextDates = [...currentDates];
            serverGames.forEach((game: { date: string }) => {
              if (!nextDates.includes(game.date)) {
                nextDates.push(game.date);
              }
            });

            setHistoricalRecords((currentRecords) => {
              const nextRecords = [...currentRecords];
              serverGames.forEach((game: { date: string; results: Record<string, number> }) => {
                const dateIndex = nextDates.indexOf(game.date);
                const resultsMap = new Map(Object.entries(game.results || {}));

                resultsMap.forEach((value, name) => {
                  let record = nextRecords.find((r) => r.name === name);
                  if (!record) {
                    record = { name, values: [] };
                    nextRecords.push(record);
                  }
                  const values = [...record.values];
                  while (values.length <= dateIndex) {
                    values.push(null);
                  }
                  values[dateIndex] = value;
                  record.values = values;
                });
              });
              return nextRecords;
            });

            return nextDates;
          });
        }
      })
      .catch((err) => {
        console.error('Failed to fetch from central DB:', err);
      });
  }, []);

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

  const saveSessionToServer = (sessionToSave: SessionState, arrowsToSave: Record<PlayerName, 'up' | 'down'>) => {
    fetch('/api/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sessionToSave, buyInArrows: arrowsToSave }),
    }).catch((err) => {
      console.error('Failed to save session to server database:', err);
    });
  };

  const createSession = (draft: { date: string; gameName: string; participantNames: PlayerName[]; hostName: PlayerName; bankName: PlayerName }) => {
    const newSession: SessionState = {
      ...draft,
      buyIns: makeAmountRecord(draft.participantNames, 1),
      finalAmounts: makeAmountRecord(draft.participantNames, 0),
      isFinished: false,
      fundApplied: false,
    };
    setSession(newSession);
    setBuyInArrows({});
    setIsEditingBuyIns(false);
    setBuyInEditSnapshot(null);
    saveSessionToServer(newSession, {});
    setActiveTab('game');
  };

  const startEditingBuyIns = () => {
    setBuyInEditSnapshot({ ...session.buyIns });
    setBuyInArrows({});
    setIsEditingBuyIns(true);
  };

  const finishEditingBuyIns = () => {
    const arrows: Record<PlayerName, 'up' | 'down'> = {};
    if (buyInEditSnapshot) {
      session.participantNames.forEach((name) => {
        const before = buyInEditSnapshot[name] ?? 0;
        const after = session.buyIns[name] ?? 0;
        if (after > before) arrows[name] = 'up';
        else if (after < before) arrows[name] = 'down';
      });
    }
    setBuyInArrows(arrows);
    setBuyInEditSnapshot(null);
    setIsEditingBuyIns(false);
    saveSessionToServer(session, arrows);
  };

  const updateBuyIn = (name: PlayerName, delta: number) => {
    setSession((current) => ({
      ...current,
      buyIns: {
        ...current.buyIns,
        [name]: (current.buyIns[name] ?? 0) + delta,
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
    const newUser = { name: trimmedName, score: 0, color: style[0], text: style[1] };
    setUsers((current) => [...current, newUser]);
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch(console.error);
    return true;
  };

  const renameUser = (currentName: PlayerName, nextName: string) => {
    const trimmedName = nextName.trim();
    if (!trimmedName || currentName === trimmedName || users.some((user) => user.name === trimmedName)) return false;
    setUsers((current) => current.map((user) => user.name === currentName ? { ...user, name: trimmedName } : user));
    fetch(`/api/users/${encodeURIComponent(currentName)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nextName: trimmedName }),
    }).catch(console.error);
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
    const expense = { id, title, payer: '모임 공금', amount, time: '방금 전', settled: false };
    setExpenses((current) => [expense, ...current]);
    const fundItem = { id, title, meta: `모임 공금 · ${formatSessionDate(session.date)}`, amount: -amount };
    setFundEntries((current) => [...current, fundItem]);

    fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    }).catch(console.error);

    fetch('/api/fund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fundItem),
    }).catch(console.error);
  };

  const addFundDeposit = (amount: number) => {
    const id = `deposit-${Date.now()}`;
    const fundItem = { id, title: '공금 직접 입금', meta: `오늘 · ${formatSessionDate(session.date)}`, amount };
    setFundEntries((current) => [...current, fundItem]);

    fetch('/api/fund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fundItem),
    }).catch(console.error);
  };

  const finishSession = () => {
    if (session.fundApplied) return;

    const targetDate = session.date;
    const participantResultsObj: Record<string, number> = {};
    settlementRows.forEach((row) => {
      const netWon = row.finalAmount - row.buyInTotal;
      const netManwon = Math.round((netWon / 10000) * 10) / 10;
      participantResultsObj[row.name] = netManwon;
    });

    fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: session.date,
        gameName: session.gameName,
        hostName: session.hostName,
        bankName: session.bankName,
        participantNames: session.participantNames,
        results: participantResultsObj,
      }),
    }).catch((err) => {
      console.error('Failed to sync game result to server database:', err);
    });

    setHistoryDates((currentDates) => {
      const dateIndex = currentDates.indexOf(targetDate);
      const updatedDates = dateIndex === -1 ? [...currentDates, targetDate] : currentDates;
      const finalDateIndex = updatedDates.indexOf(targetDate);

      setHistoricalRecords((currentRecords) => {
        const participantResults = new Map<string, number>();
        settlementRows.forEach((row) => {
          const netWon = row.finalAmount - row.buyInTotal;
          const netManwon = Math.round((netWon / 10000) * 10) / 10;
          participantResults.set(row.name, netManwon);
        });

        const existingNames = new Set(currentRecords.map((r) => r.name));
        const newRecords = [...currentRecords];

        users.forEach((user) => {
          if (!existingNames.has(user.name)) {
            const initialValues = new Array(finalDateIndex).fill(null);
            newRecords.push({ name: user.name, values: initialValues });
          }
        });

        return newRecords.map((record) => {
          const values = [...record.values];
          while (values.length <= finalDateIndex) {
            values.push(null);
          }

          if (session.participantNames.includes(record.name)) {
            const res = participantResults.get(record.name) ?? 0;
            values[finalDateIndex] = res;
          }
          return { ...record, values };
        });
      });

      return updatedDates;
    });

    if (grossFundContribution !== 0) {
      const fundItem = {
        id: `game-${session.date}-${session.gameName}`,
        title: `${session.gameName} 정산 공금`,
        meta: `${formatSessionDate(session.date)} · 손실금 - 지급액`,
        amount: grossFundContribution,
      };
      setFundEntries((current) => [...current, fundItem]);

      fetch('/api/fund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fundItem),
      }).catch((err) => {
        console.error('Failed to sync settlement fund entry to server database:', err);
      });
    }
    setSession((current) => ({ ...current, isFinished: true, fundApplied: true }));
    setBuyInArrows({});
    setIsEditingBuyIns(false);
    setBuyInEditSnapshot(null);
    fetch('/api/session', { method: 'DELETE' }).catch((err) => {
      console.error('Failed to clear session from server database:', err);
    });
  };

  const deleteHistoryDate = (dateToDelete: string) => {
    const dateIndex = historyDates.indexOf(dateToDelete);
    if (dateIndex === -1) return;

    setHistoryDates((current) => current.filter((d) => d !== dateToDelete));
    setHistoricalRecords((current) =>
      current.map((record) => {
        const values = [...record.values];
        values.splice(dateIndex, 1);
        return { ...record, values };
      })
    );

    fetch(`/api/games/${encodeURIComponent(dateToDelete)}`, {
      method: 'DELETE',
    }).catch(console.error);
  };

  const deleteFundEntry = (entryId: string) => {
    setExpenses((current) => current.filter((e) => e.id !== entryId));
    setFundEntries((current) => current.filter((f) => f.id !== entryId));

    fetch(`/api/fund/${encodeURIComponent(entryId)}`, {
      method: 'DELETE',
    }).catch(console.error);
    fetch(`/api/expenses/${encodeURIComponent(entryId)}`, {
      method: 'DELETE',
    }).catch(console.error);
  };

  const completeSettlement = () => {
    const pwd = window.prompt('관리자 비밀번호를 입력하세요 :');
    if (pwd !== '0511') {
      window.alert('비밀번호가 틀렸습니다.');
      return;
    }
    if (totalBuyIns !== totalFinalChips) {
      window.alert('정산이 제대로 되지 않았습니다.');
      return;
    }
    window.alert('정산이 완료되었습니다.');
    finishSession();
    setShowSettlementModal(true);
  };

  return (
    <div className="tilt-shell">
      <main className="tilt-container page-enter pb-[480px] pt-6 sm:pt-9">
        <header className="mb-8">
          <h1 className="text-[32px] font-bold tracking-[-0.07em] text-[#20253a]">TILT HOLDER</h1>
        </header>

        {activeTab === 'game' && (
          <GameScreen
            session={session}
            users={users}
            historicalRecords={historicalRecords}
            onCreateSession={requestCreateSession}
            onBuyInChange={updateBuyIn}
            onAddUser={addUser}
            onRenameUser={renameUser}
            isEditingBuyIns={isEditingBuyIns}
            buyInArrows={buyInArrows}
            onStartEditBuyIns={startEditingBuyIns}
            onFinishEditBuyIns={finishEditingBuyIns}
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
            onFinishSession={requestCompleteSettlement}
          />
        )}
        {activeTab === 'ranking' && (
          <RankingScreen
            users={users}
            historyDates={historyDates}
            historicalRecords={historicalRecords}
            onDeleteHistoryDate={deleteHistoryDate}
            onVerifyPassword={verifyPassword}
          />
        )}
        {activeTab === 'fund' && (
          <FundScreen
            fundEntries={fundEntries}
            fundBalance={fundBalance}
            onAddDeposit={addFundDeposit}
            onDeleteFundEntry={deleteFundEntry}
            onVerifyPassword={verifyPassword}
          />
        )}
        <div className="h-64" />
      </main>
      {showSettlementModal ? (
        <SettlementSummaryModal
          session={session}
          settlementRows={settlementRows}
          expenses={expenses}
          onClose={() => setShowSettlementModal(false)}
        />
      ) : null}
      <PasswordModal
        config={passwordModalConfig}
        onClose={() => setPasswordModalConfig(null)}
      />
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="rise-in mb-7">
      <p className="mono mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#697087]">{eyebrow}</p>
      <h2 className="text-[30px] font-bold leading-[1.08] tracking-[-0.06em] text-[#20253a]">{title}</h2>
      {description ? <p className="mt-3 max-w-[440px] text-[14px] leading-6 text-[#697087]">{description}</p> : null}
    </div>
  );
}

function GameScreen({
  session,
  users,
  historicalRecords,
  onCreateSession,
  onBuyInChange,
  onAddUser,
  onRenameUser,
  isEditingBuyIns,
  buyInArrows,
  onStartEditBuyIns,
  onFinishEditBuyIns,
}: {
  session: SessionState;
  users: Player[];
  historicalRecords: HistoricalRecord[];
  onCreateSession: (draft: { date: string; gameName: string; participantNames: PlayerName[]; hostName: PlayerName; bankName: PlayerName }) => void;
  onBuyInChange: (name: PlayerName, delta: number) => void;
  onAddUser: (name: string) => boolean;
  onRenameUser: (currentName: PlayerName, nextName: string) => boolean;
  isEditingBuyIns: boolean;
  buyInArrows: Record<PlayerName, 'up' | 'down'>;
  onStartEditBuyIns: () => void;
  onFinishEditBuyIns: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [showNewGame, setShowNewGame] = useState(false);

  const isSessionInProgress = session.participantNames.length > 0 && !session.fundApplied;

  const toggleNewGameForm = () => {
    if (!showNewGame && isSessionInProgress) {
      const proceed = window.confirm('진행중인 게임이 있습니다. 새 게임을 만들 경우 바이인 기록이 날아갑니다. 그래도 진행하시겠습니까?');
      if (!proceed) return;
    }
    setShowNewGame((current) => !current);
  };

  return (
    <div>
      <button
        type="button"
        className="tilt-button rise-in mb-6 flex w-full items-center justify-between rounded-[18px] bg-[#2d3d8f] px-5 py-4 text-left text-white shadow-[0_12px_28px_rgba(45,61,143,.18)] hover:bg-[#202e74]"
        data-testid="button-open-game"
        onClick={toggleNewGameForm}
      >
        <span><span className="mono block text-[10px] font-bold uppercase tracking-[0.16em] text-[#cbd1f2]">new game</span><span className="mt-1 block text-lg font-bold">게임 개설</span></span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9ef76] text-[#2d3d8f]"><CirclePlus size={20} /></span>
      </button>
      {showNewGame ? <NewSessionForm users={users} historicalRecords={historicalRecords} currentSession={session} onCreate={(draft) => { onCreateSession(draft); setShowNewGame(false); }} onAddUser={onAddUser} onRenameUser={onRenameUser} /> : null}

      <section className="rise-in delay-2 mt-6 rounded-[18px] border border-[#d9dcf1] bg-[#f3f4ff] p-4" data-testid="panel-buy-in-controls">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">live buy-in</p>
            <h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">바이인 횟수 기록</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#2d3d8f]">1회 = 50,000원</span>
            <button
              type="button"
              className="tilt-button rounded-full bg-[#2d3d8f] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#202e74]"
              data-testid="button-toggle-buy-in-edit"
              onClick={isEditingBuyIns ? onFinishEditBuyIns : onStartEditBuyIns}
            >
              {isEditingBuyIns ? '완료' : '수정'}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {users.filter((player) => session.participantNames.includes(player.name)).map((player) => {
            const arrow = buyInArrows[player.name];
            return (
              <div key={player.name} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5">
                <span className="flex-1 text-base font-bold text-[#20253a]">{player.name}</span>
                {isEditingBuyIns ? (
                  <button type="button" className="tilt-button flex h-9 w-9 items-center justify-center rounded-lg border border-[#dfe1ee] text-[#2d3d8f] hover:bg-[#eef0ff]" aria-label={`${player.name} 바이인 1회 줄이기`} data-testid={`button-buy-in-minus-${player.name}`} onClick={() => onBuyInChange(player.name, -1)}><Minus size={15} /></button>
                ) : null}
                {arrow ? (
                  <Triangle
                    size={12}
                    className={arrow === 'up' ? 'rotate-0 text-[#d1453b]' : 'rotate-180 text-[#1f9d5a]'}
                    fill="currentColor"
                    data-testid={`arrow-buy-in-${player.name}`}
                  />
                ) : null}
                <span className="mono min-w-10 text-center text-base font-bold text-[#20253a]" data-testid={`count-buy-in-${player.name}`}>{session.buyIns[player.name] ?? 0}</span>
                {isEditingBuyIns ? (
                  <button type="button" className="tilt-button flex h-9 w-9 items-center justify-center rounded-lg bg-[#2d3d8f] text-white hover:bg-[#202e74]" aria-label={`${player.name} 바이인 1회 추가`} data-testid={`button-buy-in-plus-${player.name}`} onClick={() => onBuyInChange(player.name, 1)}><Plus size={15} /></button>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rise-in delay-2 mt-6 grid grid-cols-2 gap-3">
        <button type="button" className="tilt-button tilt-card flex min-h-[126px] flex-col justify-between p-4 text-left hover:border-[#bfc7f0]" data-testid="button-new-game" onClick={toggleNewGameForm}>
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

    </div>
  );
}

function historicalParticipationCount(name: PlayerName, historicalRecords: HistoricalRecord[]) {
  return historicalRecords.find((record) => record.name === name)?.values.filter((value) => value !== null).length ?? 0;
}

function NewSessionForm({
  users,
  historicalRecords,
  currentSession,
  onCreate,
  onAddUser,
  onRenameUser,
}: {
  users: Player[];
  historicalRecords: HistoricalRecord[];
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
  const orderedUsers = users
    .map((player, index) => ({ player, index, participationCount: historicalParticipationCount(player.name, historicalRecords) }))
    .sort((a, b) => b.participationCount - a.participationCount || a.index - b.index);

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
          {orderedUsers.map(({ player, participationCount }) => {
            const selected = participantNames.includes(player.name);
            return <div key={player.name} className={`rounded-xl border p-2 ${selected ? 'border-[#bfc7f0] bg-[#eef0ff]' : 'border-[#e4e5ea] bg-white'}`}>
              <button type="button" className={`tilt-button flex w-full items-center gap-2 text-left text-sm font-semibold ${selected ? 'text-[#2d3d8f]' : 'text-[#858a9b]'}`} data-testid={`button-select-participant-${player.name}`} onClick={() => toggleParticipant(player.name)}><span className="flex w-5 shrink-0 justify-center">{selected ? <Check size={14} /> : null}</span><span className="min-w-0 flex-1 truncate">{player.name}</span><span className="mono text-[9px] font-normal text-[#a0a4b1]">{participationCount}회</span></button>
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
  const [settled, setSettled] = useState<string[]>(() => expenses.filter((e: ExpenseEntry & { settled?: boolean }) => e.settled).map((e) => e.id));
  const [newExpense, setNewExpense] = useState({ title: '', amount: '' });
  const expenseTotal = expenses.reduce((total, expense) => total + expense.amount, 0);
  const projectedFundBalance = session.fundApplied ? fundBalance : fundBalance + grossFundContribution;

  const markSettled = (id: string) => {
    setSettled((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      const isNowSettled = next.includes(id);
      fetch(`/api/expenses/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settled: isNowSettled }),
      }).catch(console.error);
      return next;
    });
  };

  return (
    <div>
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
  if (rank === 1) return { label: '챌린저', icon: '👑', className: 'bg-gradient-to-r from-[#ffe17d] to-[#ffd000] text-[#523d00] border border-[#e6b800] shadow-xs font-extrabold' };
  if (rank === 2) return { label: '그랜드마스터', icon: '🔥', className: 'bg-gradient-to-r from-[#ff8d82] to-[#e63928] text-white border border-[#b82314] shadow-xs font-extrabold' };
  if (rank === 3) return { label: '마스터', icon: '🔮', className: 'bg-gradient-to-r from-[#d8b4fe] to-[#9333ea] text-white border border-[#7e22ce] shadow-xs font-bold' };
  const otherRank = rank - 4;
  const otherCount = Math.max(total - 3, 1);
  const tierIndex = Math.min(5, Math.floor((otherRank * 6) / otherCount));
  const tiers = [
    { label: '다이아', icon: '💎', className: 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]' },
    { label: '플래티넘', icon: '🛡️', className: 'bg-[#ccfbf1] text-[#0f766e] border border-[#99f6e4]' },
    { label: '골드', icon: '🥇', className: 'bg-[#fef9c3] text-[#a16207] border border-[#fef08a]' },
    { label: '실버', icon: '🥈', className: 'bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]' },
    { label: '브론즈', icon: '🥉', className: 'bg-[#ffedd5] text-[#9a3412] border border-[#fed7aa]' },
    { label: '아이언', icon: '⚙️', className: 'bg-[#f3f4f6] text-[#6b7280] border border-[#e5e7eb]' },
  ];
  return tiers[tierIndex];
}

function RankingScreen({
  users,
  historyDates,
  historicalRecords,
  onDeleteHistoryDate,
  onVerifyPassword,
}: {
  users: Player[];
  historyDates: string[];
  historicalRecords: HistoricalRecord[];
  onDeleteHistoryDate: (date: string) => void;
  onVerifyPassword: (title: string, onSuccess: () => void) => void;
}) {
  const availableYears = Array.from(new Set(historyDates.map((date) => date.split('-')[0]))).sort().reverse();
  const [selectedSeason, setSelectedSeason] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState(historyDates[historyDates.length - 1] ?? '');
  const [isAdmin, setIsAdmin] = useState(false);

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      return;
    }
    onVerifyPassword('랭킹 관리자 모드', () => setIsAdmin(true));
  };

  // Active indices for the selected season
  const activeIndices = historyDates
    .map((date, index) => (selectedSeason === 'ALL' || date.startsWith(selectedSeason) ? index : -1))
    .filter((index) => index !== -1);

  // Active indices excluding the very last game in the active set (for rank change)
  const prevIndices = activeIndices.slice(0, -1);

  // Helper to compute stats for a given set of date indices
  const computeStatsForIndices = (indices: number[]) => {
    return users
      .map((player) => {
        const record = historicalRecords.find((item) => item.name === player.name);
        const values = record?.values ?? [];
        const playedValues = indices
          .map((i) => values[i])
          .filter((val): val is number => val !== null && val !== undefined);
        const wins = playedValues.filter((val) => val > 0).length;
        const net = playedValues.reduce((sum, val) => sum + val, 0);
        return {
          player,
          played: playedValues.length,
          wins,
          losses: playedValues.length - wins,
          net,
          winRate: playedValues.length ? wins / playedValues.length : 0,
          recent: [null, null, ...playedValues.slice(-3)].slice(-3),
        };
      })
      .sort((a, b) => b.net - a.net || b.winRate - a.winRate || b.played - a.played);
  };

  const currentAllStats = computeStatsForIndices(activeIndices);
  const prevAllStats = computeStatsForIndices(prevIndices);

  // Create previous rank map
  const minPlayedThreshold = selectedSeason === 'ALL' ? 5 : 1;
  const prevRanked = prevAllStats.filter((s) => s.played >= minPlayedThreshold);
  const prevRankMap = new Map<string, number>();
  prevRanked.forEach((stat, idx) => {
    prevRankMap.set(stat.player.name, idx + 1);
  });

  const rankedPlayers = currentAllStats.filter((stat) => stat.played >= minPlayedThreshold);
  const unrankedPlayers = currentAllStats.filter((stat) => stat.played < minPlayedThreshold);

  const selectedDateIndex = historyDates.indexOf(selectedDate);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">ranking & stats</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">랭킹 및 전적</h3></div>
        <button type="button" onClick={handleAdminToggle} className="rounded-xl border border-[#dfe1ee] bg-white px-3 py-1.5 text-xs font-bold text-[#2d3d8f]">{isAdmin ? '관리자 모드 닫기' : '⚙️ 관리자'}</button>
      </div>

      {isAdmin ? (
        <section className="rise-in mb-4 rounded-2xl border border-[#bd604d] bg-[#fff8f5] p-4">
          <h4 className="text-xs font-bold text-[#bd604d]">관리자 모드: 이전 이력 삭제</h4>
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
            {historyDates.slice().reverse().map((date) => (
              <div key={date} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                <span className="font-bold text-[#20253a]">{date}</span>
                <button type="button" onClick={() => { if (window.confirm(`${date} 이력을 삭제하시겠습니까?`)) onDeleteHistoryDate(date); }} className="rounded bg-[#bd604d] px-2.5 py-1 text-xs font-bold text-white">삭제</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Season Filter Selector */}
      <div className="rise-in mb-4 flex items-center justify-between rounded-2xl border border-[#dfe1ee] bg-white p-2">
        <span className="ml-2 text-xs font-bold text-[#697087]">시즌 선택</span>
        <div className="flex gap-1 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setSelectedSeason('ALL')}
            className={`tilt-button rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              selectedSeason === 'ALL' ? 'bg-[#2d3d8f] text-white' : 'bg-[#f1f1ee] text-[#697087] hover:bg-[#e4e5ea]'
            }`}
          >
            전체 시즌
          </button>
          {availableYears.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => setSelectedSeason(year)}
              className={`tilt-button rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                selectedSeason === year ? 'bg-[#2d3d8f] text-white' : 'bg-[#f1f1ee] text-[#697087] hover:bg-[#e4e5ea]'
              }`}
            >
              {year} 시즌
            </button>
          ))}
        </div>
      </div>

      <section className="rise-in delay-1 tilt-card overflow-hidden" data-testid="card-ranking-list">
        <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4">
          <div>
            <span className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">
              ranked · {rankedPlayers.length} players ({selectedSeason === 'ALL' ? '전체' : `${selectedSeason}년`})
            </span>
            <p className="mt-1 text-xs text-[#858a9b]">
              {selectedSeason === 'ALL' ? '5회 이상' : '1회 이상'} 참여자 · NET 누적상금 · 만원 단위
            </p>
          </div>
          <Trophy size={18} className="text-[#b38b1e]" />
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[650px] divide-y divide-[#ececf0]">
            {rankedPlayers.map((stat, index) => {
              const rank = index + 1;
              const tier = rankingTier(rank, rankedPlayers.length);
              const prevRank = prevRankMap.get(stat.player.name);
              let rankChange: React.ReactNode = null;
              if (prevRank === undefined) {
                rankChange = <span className="mono text-[9px] font-extrabold text-[#2563eb]">NEW</span>;
              } else {
                const diff = prevRank - rank;
                if (diff > 0) {
                  rankChange = <span className="mono text-[10px] font-extrabold text-[#16a34a]">▲{diff}</span>;
                } else if (diff < 0) {
                  rankChange = <span className="mono text-[10px] font-extrabold text-[#dc2626]">▼{Math.abs(diff)}</span>;
                } else {
                  rankChange = <span className="mono text-[10px] font-bold text-[#9ca3af]">-</span>;
                }
              }

              return (
                <div className="p-3" key={stat.player.name} data-testid={`row-ranking-${stat.player.name}`}>
                  <div className="grid grid-cols-[64px_160px_110px_80px_1fr] items-center gap-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rank === 1 ? 'bg-[#e9ef76] text-[#596313]' : 'bg-[#f1f1ee] text-[#858a9b]'}`}>
                        {String(rank).padStart(2, '0')}
                      </span>
                      <div className="flex w-6 justify-center">{rankChange}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#20253a]">{stat.player.name}</p>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${tier.className}`}>
                        <span>{tier.icon}</span>
                        <span>{tier.label}</span>
                      </span>
                    </div>
                    <div>
                      <p className="mono text-sm font-bold tracking-[-0.04em] text-[#20253a]">{stat.net.toFixed(1)}만원</p>
                      <p className="text-[10px] text-[#858a9b]">NET 누적상금</p>
                    </div>
                    <div>
                      <p className="mono text-sm font-bold text-[#20253a]">{Math.round(stat.winRate * 100)}%</p>
                      <p className="text-[10px] text-[#858a9b]">{stat.wins}승 {stat.losses}패</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="mr-1 text-[10px] text-[#858a9b]">최근 3경기</span>
                      {stat.recent.map((value, recentIndex) =>
                        value === null ? (
                          <span key={`${stat.player.name}-${recentIndex}`} className="rounded-md bg-[#f1f1ee] px-1.5 py-0.5 text-[10px] font-bold text-[#a0a4b1]">
                            —
                          </span>
                        ) : (
                          <span key={`${stat.player.name}-${recentIndex}`} className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${value > 0 ? 'bg-[#e5f1db] text-[#50722b]' : 'bg-[#ffe8e2] text-[#a44c3e]'}`}>
                            {value > 0 ? '승' : '패'}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {unrankedPlayers.length > 0 ? (
        <section className="rise-in delay-2 mt-6 tilt-card overflow-hidden" data-testid="card-unranked-list">
          <div className="flex items-center justify-between border-b border-[#ececf0] px-5 py-4">
            <div>
              <span className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">
                unranked · {unrankedPlayers.length} players
              </span>
              <p className="mt-1 text-xs text-[#858a9b]">5회 미만 참여자 · 참여 5회부터 정식 랭킹</p>
            </div>
            <span className="rounded-full bg-[#f1f1ee] px-2 py-1 text-[10px] font-bold text-[#697087]">언랭</span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[650px] divide-y divide-[#ececf0]">
              {unrankedPlayers.map((stat, index) => (
                <div className="p-3" key={stat.player.name} data-testid={`row-unranked-${stat.player.name}`}>
                  <div className="grid grid-cols-[64px_160px_110px_80px_1fr] items-center gap-2 whitespace-nowrap">
                    <span className="mono flex h-7 w-7 items-center justify-center rounded-full bg-[#f1f1ee] text-xs font-bold text-[#858a9b]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-[#20253a]">{stat.player.name}</p>
                      <span className="rounded-full bg-[#f1f1ee] px-2 py-0.5 text-[10px] font-bold text-[#697087]">언랭</span>
                    </div>
                    <div>
                      <p className="mono text-sm font-bold tracking-[-0.04em] text-[#20253a]">{stat.net.toFixed(1)}만원</p>
                      <p className="text-[10px] text-[#858a9b]">NET 누적상금</p>
                    </div>
                    <div>
                      <p className="mono text-sm font-bold text-[#20253a]">{Math.round(stat.winRate * 100)}%</p>
                      <p className="text-[10px] text-[#858a9b]">{stat.wins}승 {stat.losses}패 · {stat.played}회</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="mr-1 text-[10px] text-[#858a9b]">최근 3경기</span>
                      {stat.recent.map((value, recentIndex) =>
                        value === null ? (
                          <span key={`${stat.player.name}-${recentIndex}`} className="rounded-md bg-[#f1f1ee] px-1.5 py-0.5 text-[10px] font-bold text-[#a0a4b1]">
                            —
                          </span>
                        ) : (
                          <span key={`${stat.player.name}-${recentIndex}`} className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${value > 0 ? 'bg-[#e5f1db] text-[#50722b]' : 'bg-[#ffe8e2] text-[#a44c3e]'}`}>
                            {value > 0 ? '승' : '패'}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="rise-in delay-2 mt-6" data-testid="section-date-results">
        <div className="mb-3 flex items-end justify-between"><div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">date results</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">날짜별 결과</h3></div><span className="text-xs text-[#858a9b]">총 {historyDates.length}회</span></div>
        <label className="sr-only" htmlFor="ranking-date-select">전적 날짜 선택</label>
        <select id="ranking-date-select" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-11 w-full rounded-xl border border-[#dfe1ee] bg-white px-3 text-sm font-bold text-[#20253a] outline-none focus:border-[#2d3d8f]" data-testid="select-ranking-date">
          {historyDates.slice().reverse().map((date) => <option key={date} value={date}>{date}</option>)}
        </select>
        <div className="tilt-card mt-3 divide-y divide-[#ececf0]">
          {users.filter((player) => {
            const record = historicalRecords.find((item) => item.name === player.name);
            const value = selectedDateIndex >= 0 ? record?.values[selectedDateIndex] ?? null : null;
            return value !== null;
          }).map((player) => {
            const record = historicalRecords.find((item) => item.name === player.name);
            const value = selectedDateIndex >= 0 ? record?.values[selectedDateIndex] ?? null : null;
            return <div key={player.name} className="flex items-center gap-3 px-4 py-3" data-testid={`row-date-result-${player.name}`}>
              <span className="flex-1 text-sm font-semibold text-[#20253a]">{player.name}</span>
              {value !== null ? <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${value > 0 ? 'bg-[#e5f1db] text-[#50722b]' : 'bg-[#ffe8e2] text-[#a44c3e]'}`}>{value > 0 ? '승' : '패'} <span className="mono">{value > 0 ? '+' : ''}{value}</span></span> : null}
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
  onDeleteFundEntry,
  onVerifyPassword,
}: {
  fundEntries: FundEntry[];
  fundBalance: number;
  onAddDeposit: (amount: number) => void;
  onDeleteFundEntry: (id: string) => void;
  onVerifyPassword: (title: string, onSuccess: () => void) => void;
}) {
  const [showFundForm, setShowFundForm] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const spentThisMonth = fundEntries.filter((entry) => entry.amount < 0).reduce((total, entry) => total + Math.abs(entry.amount), 0);

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      return;
    }
    onVerifyPassword('공금 관리자 모드', () => setIsAdmin(true));
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div><p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">fund management</p><h3 className="mt-1 text-lg font-bold tracking-[-0.04em] text-[#20253a]">공금 현황</h3></div>
        <button type="button" onClick={handleAdminToggle} className="rounded-xl border border-[#dfe1ee] bg-white px-3 py-1.5 text-xs font-bold text-[#2d3d8f]">{isAdmin ? '관리자 모드 닫기' : '⚙️ 관리자'}</button>
      </div>

      {isAdmin ? (
        <section className="rise-in mb-4 rounded-2xl border border-[#bd604d] bg-[#fff8f5] p-4">
          <h4 className="text-xs font-bold text-[#bd604d]">관리자 모드: 공금 내역 삭제</h4>
          <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
            {fundEntries.slice().reverse().map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
                <div>
                  <span className="font-bold text-[#20253a]">{entry.title}</span>
                  <span className="ml-2 text-gray-500">{formatWon(entry.amount)}</span>
                </div>
                <button type="button" onClick={() => { if (window.confirm('이 내역을 삭제하시겠습니까?')) onDeleteFundEntry(entry.id); }} className="rounded bg-[#bd604d] px-2.5 py-1 text-xs font-bold text-white">삭제</button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
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

function SettlementSummaryModal({
  session,
  settlementRows,
  expenses,
  onClose,
}: {
  session: SessionState;
  settlementRows: SettlementRow[];
  expenses: ExpenseEntry[];
  onClose: () => void;
}) {
  const sortedRows = [...settlementRows].sort((a, b) => b.result - a.result);

  const handleDownload = () => {
    downloadSettlementImage(session, settlementRows, expenses);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="rise-in max-h-[90vh] w-full max-w-[650px] overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between border-b border-[#ececf0] pb-4">
          <div>
            <span className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">settlement summary</span>
            <h3 className="mt-1 text-xl font-bold text-[#20253a]">정산 결과 요약</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-[#f1f1ee] px-3 py-1 text-xs font-bold text-[#697087]">닫기</button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="rounded-2xl bg-[#eef0ff] p-4">
            <p className="text-xs font-bold text-[#2d3d8f]">정산 날짜: {session.date} ({session.gameName})</p>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-bold text-[#20253a]">🏆 순위별 결과</h4>
            <div className="divide-y divide-[#ececf0] rounded-xl border border-[#ececf0] bg-white">
              {sortedRows.map((row, idx) => {
                const buyInCount = Math.round(row.buyInTotal / 50000);
                return (
                  <div key={row.name} className="flex items-center justify-between p-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-3">
                      <span className="mono font-bold text-[#2d3d8f]">{idx + 1}위</span>
                      <span className="font-bold text-[#20253a]">{row.name}</span>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${row.result >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                        NET {formatSignedWon(row.result)}
                      </p>
                      <p className="text-[11px] text-[#697087]">
                        바이인 {buyInCount}회 · 남은칩 {formatWon(row.finalAmount)} · 정산 {formatSignedWon(row.actualSettlement)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-bold text-[#20253a]">💳 당일 공금 지출 내역</h4>
            {expenses.length === 0 ? (
              <p className="text-xs text-[#858a9b]">지출 내역이 없습니다.</p>
            ) : (
              <div className="divide-y divide-[#ececf0] rounded-xl border border-[#ececf0] bg-white">
                {expenses.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between p-3 text-xs">
                    <span className="font-bold text-[#20253a]">{exp.title}</span>
                    <span className="font-bold text-[#bd604d]">-{formatWon(exp.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="tilt-button flex-1 rounded-xl bg-[#2d3d8f] px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-[#202e74]"
          >
            📥 이미지 저장 (다운로드)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="tilt-button rounded-xl border border-[#dfe1ee] bg-white px-5 py-3 text-sm font-bold text-[#697087] hover:bg-[#f8f8f4]"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadSettlementImage(session: SessionState, settlementRows: SettlementRow[], expenses: ExpenseEntry[]) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background
  ctx.fillStyle = '#f8f9fc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Card Header Background
  ctx.fillStyle = '#2d3d8f';
  ctx.fillRect(0, 0, canvas.width, 130);

  // Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('TILT HOLDER - 정산 결과', 40, 55);

  ctx.fillStyle = '#e9ef76';
  ctx.font = '16px sans-serif';
  ctx.fillText(`날짜: ${session.date}  |  게임명: ${session.gameName}`, 40, 95);

  const sortedRows = [...settlementRows].sort((a, b) => b.result - a.result);

  let y = 170;
  ctx.fillStyle = '#20253a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('🏆 순위별 플레이어 결과', 40, y);
  y += 35;

  // Table header
  ctx.fillStyle = '#eef0ff';
  ctx.fillRect(40, y, 720, 36);
  ctx.fillStyle = '#2d3d8f';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('순위 / 이름', 60, y + 23);
  ctx.fillText('총 NET 금액', 260, y + 23);
  ctx.fillText('바이인', 410, y + 23);
  ctx.fillText('남은 칩', 520, y + 23);
  ctx.fillText('정산 결과', 640, y + 23);
  y += 42;

  sortedRows.forEach((row, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f3f4ff';
    ctx.fillRect(40, y, 720, 48);

    ctx.fillStyle = '#20253a';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${idx + 1}위  ${row.name}`, 60, y + 29);

    ctx.fillStyle = row.result >= 0 ? '#16a34a' : '#dc2626';
    ctx.fillText(`${row.result >= 0 ? '+' : ''}${row.result.toLocaleString()}원`, 260, y + 29);

    ctx.fillStyle = '#596078';
    ctx.font = '14px sans-serif';
    const buyInCount = Math.round(row.buyInTotal / 50000);
    ctx.fillText(`${buyInCount}회`, 410, y + 29);

    ctx.fillText(`${row.finalAmount.toLocaleString()}원`, 520, y + 29);

    ctx.fillStyle = row.actualSettlement >= 0 ? '#2d3d8f' : '#dc2626';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`${row.actualSettlement >= 0 ? '+' : ''}${row.actualSettlement.toLocaleString()}원`, 640, y + 29);

    y += 54;
  });

  // Expenses section
  y += 20;
  ctx.fillStyle = '#20253a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('💳 당일 사용 공금 지출 내역', 40, y);
  y += 35;

  if (expenses.length === 0) {
    ctx.fillStyle = '#697087';
    ctx.font = '14px sans-serif';
    ctx.fillText('지출 내역이 없습니다.', 40, y);
  } else {
    expenses.forEach((exp) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(40, y, 720, 36);
      ctx.fillStyle = '#20253a';
      ctx.font = '14px sans-serif';
      ctx.fillText(exp.title, 60, y + 23);
      ctx.fillStyle = '#bd604d';
      ctx.fillText(`-${exp.amount.toLocaleString()}원 (${exp.payer})`, 520, y + 23);
      y += 42;
    });
  }

  const link = document.createElement('a');
  link.download = `settlement-${session.date}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

type PasswordModalConfig = {
  title: string;
  onSuccess: () => void;
} | null;

function PasswordModal({
  config,
  onClose,
}: {
  config: PasswordModalConfig;
  onClose: () => void;
}) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);

  if (!config) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd === '0511') {
      config.onSuccess();
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <form onSubmit={handleSubmit} className="rise-in w-full max-w-[380px] rounded-[24px] bg-white p-6 shadow-2xl sm:p-7">
        <h3 className="text-lg font-bold text-[#20253a]">{config.title}</h3>
        <p className="mt-1 text-xs text-[#697087]">코드를 입력해주세요.</p>
        
        <input
          type="password"
          value={pwd}
          onChange={(e) => { setPwd(e.target.value); setError(false); }}
          className="mt-4 h-11 w-full rounded-xl border border-[#dfe1ee] bg-white px-3 text-sm outline-none focus:border-[#2d3d8f]"
          placeholder="코드 입력"
          autoFocus
        />
        {error ? <p className="mt-1.5 text-xs font-semibold text-[#bd604d]">올바르지 않습니다.</p> : null}

        <div className="mt-5 flex gap-2">
          <button type="submit" className="tilt-button flex-1 rounded-xl bg-[#2d3d8f] px-4 py-2.5 text-xs font-bold text-white">확인</button>
          <button type="button" onClick={onClose} className="tilt-button rounded-xl border border-[#dfe1ee] bg-white px-4 py-2.5 text-xs font-bold text-[#697087]">취소</button>
        </div>
      </form>
    </div>
  );
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;