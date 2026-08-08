'use client';

import { useEffect } from 'react';

import { LIVE_POLL_MS } from '@/lib/live-sync';

export interface LivePollOptions {
  /** When false, skip the immediate run (use when the screen already loaded once on mount). */
  immediate?: boolean;
  intervalMs?: number;
}

/**
 * Run `callback` on an interval while `enabled`.
 *
 * Matches the admin portal poller: hidden tabs do not poll, in-flight runs are not
 * stacked, and becoming visible again triggers one immediate refresh.
 */
export function useLivePoll(
  callback: () => void | Promise<void>,
  enabled = true,
  options: LivePollOptions = {},
): void {
  const { immediate = true, intervalMs = LIVE_POLL_MS } = options;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let running = false;

    const run = () => {
      if (cancelled || running || document.hidden) return;
      running = true;
      void Promise.resolve()
        .then(() => callback())
        .catch(() => undefined)
        .finally(() => {
          running = false;
        });
    };

    if (immediate) run();
    const id = window.setInterval(run, intervalMs);
    const onVisibilityChange = () => {
      if (!document.hidden) run();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [callback, enabled, immediate, intervalMs]);
}
