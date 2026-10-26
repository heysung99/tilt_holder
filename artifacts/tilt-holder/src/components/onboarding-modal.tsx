import type { ReactNode } from 'react';
import { Bell, Check, Download, Share, SquarePlus } from 'lucide-react';
import type { PushState } from '@/lib/use-push-notifications';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

function Step({ number, done, title, description, children }: {
  number: number;
  done: boolean;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${done ? 'border-[#d5e8c4] bg-[#f3f9ec]' : 'border-[#dfe1ee] bg-white'}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-[#16a34a] text-white' : 'bg-[#2d3d8f] text-white'}`}>
          {done ? <Check size={15} strokeWidth={3} /> : number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#20253a]">{title}</p>
          <p className="mt-0.5 text-xs leading-5 text-[#697087]">{description}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

const primaryButton = 'tilt-button flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#2d3d8f] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#202e74] disabled:opacity-60';
const note = 'rounded-xl bg-[#f6f6f2] px-3 py-2 text-xs leading-5 text-[#697087]';

export default function OnboardingModal({
  installDone,
  canPromptInstall,
  onInstall,
  onAcknowledgeInstall,
  pushState,
  isPushBusy,
  onEnablePush,
  onLater,
  onClose,
}: {
  installDone: boolean;
  canPromptInstall: boolean;
  onInstall: () => void;
  onAcknowledgeInstall: () => void;
  pushState: PushState;
  isPushBusy: boolean;
  onEnablePush: () => void;
  onLater: () => void;
  onClose: () => void;
}) {
  const pushDone = pushState === 'on';
  // Nothing left the person can act on: a blocked or unsupported push doesn't count.
  const allDone = installDone && pushState !== 'off' && pushState !== 'ios-needs-install';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" data-testid="modal-onboarding">
      <div className="rise-in max-h-[90vh] w-full max-w-[400px] overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl">
        <p className="mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#697087]">quick setup</p>
        <h3 className="mt-1 text-lg font-bold text-[#20253a]">📲 TILT HOLDER 더 편하게 쓰기</h3>
        <p className="mt-1 text-xs leading-5 text-[#697087]">두 가지만 해두면 모임 소식을 바로 받아볼 수 있어요.</p>

        <div className="mt-5 space-y-3">
          <Step number={1} done={installDone} title="홈 화면에 앱 저장" description="앱처럼 바로 열려요. 아이폰은 이걸 해야 알림을 받을 수 있어요.">
            {installDone ? (
              <p className="text-xs font-bold text-[#16a34a]">저장 완료</p>
            ) : (
              <div className="space-y-2">
                {canPromptInstall ? (
                  <button type="button" className={primaryButton} onClick={onInstall} data-testid="button-onboarding-install">
                    <Download size={14} /> 앱 설치하기
                  </button>
                ) : isIOS() ? (
                  <ol className={`${note} space-y-1`}>
                    <li className="flex items-center gap-1.5">1. 사파리 아래 <Share size={14} className="text-[#2d3d8f]" /> 공유 버튼</li>
                    <li className="flex items-center gap-1.5">2. <SquarePlus size={14} className="text-[#2d3d8f]" /> "홈 화면에 추가"</li>
                    <li>3. 홈 화면의 TILT HOLDER 아이콘으로 열기</li>
                  </ol>
                ) : (
                  <p className={note}>브라우저 메뉴(⋮ 또는 ≡)에서 "홈 화면에 추가" 또는 "앱 설치"를 눌러주세요.</p>
                )}
                <button type="button" className="w-full text-center text-[11px] font-semibold text-[#858a9b] underline-offset-2 hover:underline" onClick={onAcknowledgeInstall} data-testid="button-onboarding-already-installed">
                  이미 저장했어요
                </button>
              </div>
            )}
          </Step>

          <Step number={2} done={pushDone} title="알림 켜기" description="게임 개설 · 바이인 · 정산 결과 · 랭킹 변동을 알려드려요.">
            {pushDone ? (
              <p className="text-xs font-bold text-[#16a34a]">알림 켜짐</p>
            ) : pushState === 'off' ? (
              <button type="button" className={primaryButton} onClick={onEnablePush} disabled={isPushBusy} data-testid="button-onboarding-push">
                <Bell size={14} /> {isPushBusy ? '설정 중...' : '알림 켜기'}
              </button>
            ) : pushState === 'ios-needs-install' ? (
              <p className={note}>1번을 마치고 홈 화면의 앱으로 열면 켤 수 있어요.</p>
            ) : pushState === 'denied' ? (
              <p className={note}>알림이 차단돼 있어요. 휴대폰 설정에서 이 앱(사이트)의 알림을 허용해주세요.</p>
            ) : (
              <p className={note}>이 브라우저에서는 알림을 받을 수 없어요.</p>
            )}
          </Step>
        </div>

        {allDone ? (
          <button type="button" className={`${primaryButton} mt-5 py-3 text-sm`} onClick={onClose} data-testid="button-onboarding-done">
            🎉 준비 완료! 시작하기
          </button>
        ) : (
          <button type="button" className="tilt-button mt-5 w-full rounded-xl border border-[#dfe1ee] bg-white py-2.5 text-xs font-bold text-[#697087] hover:bg-[#f8f8f4]" onClick={onLater} data-testid="button-onboarding-later">
            나중에 할게요
          </button>
        )}
      </div>
    </div>
  );
}
