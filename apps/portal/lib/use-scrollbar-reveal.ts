'use client';

import { useEffect } from 'react';

const SCROLLING_CLASS = 'is-scrolling';
const HIDE_DELAY_MS = 700;

/**
 * Adds `is-scrolling` while the user scrolls so `.scrollbar-subtle` thumbs can appear briefly.
 */
export function useScrollbarReveal() {
  useEffect(() => {
    const timers = new WeakMap<EventTarget, ReturnType<typeof setTimeout>>();

    const onScroll = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('scrollbar-subtle')) {
        return;
      }

      target.classList.add(SCROLLING_CLASS);
      const existing = timers.get(target);
      if (existing) clearTimeout(existing);

      timers.set(
        target,
        setTimeout(() => {
          target.classList.remove(SCROLLING_CLASS);
          timers.delete(target);
        }, HIDE_DELAY_MS),
      );
    };

    document.addEventListener('scroll', onScroll, true);
    return () => document.removeEventListener('scroll', onScroll, true);
  }, []);
}
