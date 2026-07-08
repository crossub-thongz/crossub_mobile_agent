'use client';

import { useEffect } from 'react';

import { LIVE_POLL_MS } from '@/lib/live-sync';

/** Run `callback` immediately and every {@link LIVE_POLL_MS} while `enabled`. */
export function useLivePoll(
  callback: () => void | Promise<void>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    void callback();
    const id = window.setInterval(() => void callback(), LIVE_POLL_MS);
    return () => window.clearInterval(id);
  }, [callback, enabled]);
}
