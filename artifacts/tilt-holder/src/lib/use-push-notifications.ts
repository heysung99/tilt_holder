import { useEffect, useState } from 'react';
import { ApiError, api, setPushEndpoint } from '@/lib/api';

export type PushState = 'loading' | 'unsupported' | 'ios-needs-install' | 'denied' | 'off' | 'on';

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(base64: string) {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>('loading');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!isSupported()) {
      // iPhones only expose push to apps opened from the home screen.
      setState(isIOS() && !isStandalone() ? 'ios-needs-install' : 'unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setPushEndpoint(subscription?.endpoint ?? null);
        setState(subscription ? 'on' : 'off');
      })
      .catch(() => setState('off'));
  }, []);

  // Resolves true only when the device ended up subscribed.
  const enable = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      if (permission === 'denied') setState('denied');
      return false;
    }
    let publicKey: string;
    try {
      publicKey = (await (await api('/api/push/public-key')).json()).publicKey;
    } catch (error) {
      if (error instanceof ApiError && error.status === 503) {
        window.alert('서버에 알림 설정이 아직 되어 있지 않아요.');
        return false;
      }
      throw error;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await api('/api/push/subscribe', { method: 'POST', body: subscription.toJSON() });
    setPushEndpoint(subscription.endpoint);
    setState('on');
    return true;
  };

  const disable = async () => {
    if (!window.confirm('알림을 끌까요?')) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await api('/api/push/unsubscribe', { method: 'POST', body: { endpoint: subscription.endpoint } });
      await subscription.unsubscribe();
    }
    setPushEndpoint(null);
    setState('off');
  };

  const toggle = async () => {
    if (state === 'ios-needs-install') {
      window.alert('아이폰은 홈 화면에 추가한 앱에서만 알림을 켤 수 있어요.\n공유 버튼(⬆️) → "홈 화면에 추가" 후, 추가된 앱으로 열어서 다시 눌러주세요.');
      return;
    }
    if (state === 'unsupported') {
      window.alert('이 브라우저는 알림을 지원하지 않아요.');
      return;
    }
    if (state === 'denied') {
      window.alert('알림이 차단되어 있어요. 휴대폰 또는 브라우저 설정에서 이 사이트의 알림을 허용해주세요.');
      return;
    }
    await run(async () => {
      if (state === 'on') {
        await disable();
      } else if (await enable()) {
        window.alert('알림을 켰어요. 게임 개설, 바이인 변동, 정산 결과, 랭킹 변동을 알려드릴게요.');
      }
    });
  };

  async function run(action: () => Promise<void>) {
    if (isBusy || state === 'loading') return;
    setIsBusy(true);
    try {
      await action();
    } catch (error) {
      console.error(error);
      window.alert('알림 설정에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsBusy(false);
    }
  }

  return { state, isBusy, toggle };
}
