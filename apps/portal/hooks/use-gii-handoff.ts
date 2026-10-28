'use client';

import { useCallback, useEffect, useState } from 'react';

import { GII_HANDOFF_POLL_MS } from '@/constants/gii-handoff';
import {
  getCurrentGiiHandoff,
  getGiiHandoff,
  sendGiiHandoffMessage,
  type GiiHandoff,
} from '@/lib/crossub-api/gii-client';
import { giiHandoffHeld } from '@/utils/gii-handoff';

/**
 * The Cros chat a CROSSUB person holds (Jarvis 2.3). Read when the panel opens, and every few
 * seconds while it is open and a person holds the chat, so their replies appear in it. A closed
 * chat stays on screen, saying it is back with Cros, until the panel closes.
 */
export function useGiiHandoff(open: boolean) {
  const [handoff, setHandoff] = useState<GiiHandoff | null>(null);
  const [sending, setSending] = useState(false);
  /** The chat while a person holds it; null when none is with the team or it is back with Cros. */
  const held = giiHandoffHeld(handoff) ? handoff : null;
  const isHeld = held !== null;
  const threadId = handoff?.threadId ?? null;

  useEffect(() => {
    if (!open) {
      setHandoff(null);
      return;
    }
    let cancelled = false;
    getCurrentGiiHandoff()
      .then((current) => {
        if (!cancelled) setHandoff(current);
      })
      .catch((err: unknown) => console.warn('[cros] team chat could not be loaded', err));
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isHeld || !threadId) return;
    const timer = window.setInterval(() => {
      getGiiHandoff(threadId)
        .then(setHandoff)
        .catch((err: unknown) => console.warn('[cros] team replies could not be loaded', err));
    }, GII_HANDOFF_POLL_MS);
    return () => window.clearInterval(timer);
  }, [isHeld, open, threadId]);

  /** Follow the thread a confirmed handoff opened or added to. */
  const adopt = useCallback((id: string) => {
    getGiiHandoff(id)
      .then(setHandoff)
      .catch((err: unknown) => console.warn('[cros] team chat could not be loaded', err));
  }, []);

  /** Write to the person holding the chat. Throws when it was not sent. */
  const send = useCallback(
    async (body: string) => {
      if (!threadId) throw new Error('No chat is with the CROSSUB team');
      setSending(true);
      try {
        setHandoff(await sendGiiHandoffMessage(threadId, body));
      } catch (err) {
        // The team may have handed it back meanwhile: show that rather than a stale chat.
        void getGiiHandoff(threadId).then(setHandoff).catch(() => {});
        throw err;
      } finally {
        setSending(false);
      }
    },
    [threadId],
  );

  return { handoff, held, sending, adopt, send };
}
