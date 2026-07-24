'use client';

import { useEffect } from 'react';

import { LIVE_POLL_MS } from '@/lib/live-sync';

/** Run `callback` immediately and every `intervalMs` while `enabled`. */
export function useLivePoll(
  callback: () => void | Promise<void>,
  enabled = true,
  intervalMs: number = LIVE_POLL_MS,
): void {
  useEffect(() => {
    if (!enabled) return;
    void callback();
    const id = window.setInterval(() => void callback(), intervalMs);
    return () => window.clearInterval(id);
  }, [callback, enabled, intervalMs]);
}
