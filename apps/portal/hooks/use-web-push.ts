'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  NOTIFICATION_PERMISSION_DENIED,
  NOTIFICATION_PERMISSION_GRANTED,
  WEB_PUSH_SERVICE_WORKER_URL,
  WEB_PUSH_STATUS,
  type WebPushStatus,
} from '@/constants/web-push';
import { getWebPushKey, registerWebPushSubscription, unregisterWebPushSubscription } from '@/lib/crossub-api/me-client';
import { browserSupportsWebPush, isIosBrowserTab, webPushKeyBytes } from '@/utils/web-push';

/** This phone's subscription, if it already has one. */
async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration(WEB_PUSH_SERVICE_WORKER_URL);
  return registration ? registration.pushManager.getSubscription() : null;
}

/**
 * Push alerts on this phone (Jarvis 2.2): where it stands, and turning alerts on or off. On asks
 * the browser for permission (it must follow a tap), subscribes with the server's key and
 * registers the subscription; off unsubscribes and removes it. Throws when a step fails.
 */
export function useWebPush() {
  const [status, setStatus] = useState<WebPushStatus>(WEB_PUSH_STATUS.CHECKING);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    const settle = (next: WebPushStatus) => {
      if (live) setStatus(next);
    };
    if (isIosBrowserTab()) {
      settle(WEB_PUSH_STATUS.NEEDS_INSTALL);
      return;
    }
    if (!browserSupportsWebPush()) {
      settle(WEB_PUSH_STATUS.UNSUPPORTED);
      return;
    }
    Promise.all([getWebPushKey(), currentSubscription()])
      .then(([key, subscription]) => {
        if (!live) return;
        setPublicKey(key);
        if (!key) return settle(WEB_PUSH_STATUS.UNCONFIGURED);
        if (Notification.permission === NOTIFICATION_PERMISSION_DENIED) return settle(WEB_PUSH_STATUS.BLOCKED);
        settle(subscription ? WEB_PUSH_STATUS.ON : WEB_PUSH_STATUS.OFF);
      })
      .catch((err: unknown) => {
        console.warn('[push] alerts could not be checked', err);
        settle(WEB_PUSH_STATUS.UNCONFIGURED);
      });
    return () => {
      live = false;
    };
  }, []);

  const turnOn = useCallback(async () => {
    if (!publicKey) throw new Error('Alerts are not available yet');
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== NOTIFICATION_PERMISSION_GRANTED) {
        setStatus(permission === NOTIFICATION_PERMISSION_DENIED ? WEB_PUSH_STATUS.BLOCKED : WEB_PUSH_STATUS.OFF);
        return false;
      }
      const registration = await navigator.serviceWorker.register(WEB_PUSH_SERVICE_WORKER_URL);
      await navigator.serviceWorker.ready;
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: webPushKeyBytes(publicKey),
        }));
      await registerWebPushSubscription(JSON.stringify(subscription.toJSON()));
      setStatus(WEB_PUSH_STATUS.ON);
      return true;
    } finally {
      setBusy(false);
    }
  }, [publicKey]);

  const turnOff = useCallback(async () => {
    setBusy(true);
    try {
      const subscription = await currentSubscription();
      if (subscription) {
        await unregisterWebPushSubscription(JSON.stringify(subscription.toJSON()));
        await subscription.unsubscribe();
      }
      setStatus(WEB_PUSH_STATUS.OFF);
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, turnOn, turnOff };
}
