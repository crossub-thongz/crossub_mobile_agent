'use client';

import { useCallback } from 'react';

import { CrosAssistantLogo } from '@/components/brand/cros-assistant-logo';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { CROS_NAME_PATTERN, CROS_NOTIFICATION_ASK_PROMPT } from '@/constants/cros-notification';
import { useShellDockStore } from '@/lib/shell-dock-store';
import type { AgentNotification } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The parts a notification card uses to point at Cros: its name picked out (and tappable) in the
 * text, a "From CROS" mark on the cards Cros raised, and an Ask button. Cards lay a full size
 * button under their content, so these sit above it and take their own taps.
 */

/** Ask Cros about one notification: open the panel with the card's title as the question. */
export function useAskCrosAboutNotification() {
  const openGii = useShellDockStore((state) => state.openGii);
  return useCallback(
    (notification: Pick<AgentNotification, 'title' | 'propertyAddress'>) =>
      openGii({
        propertyAddress: notification.propertyAddress || undefined,
        initialPrompt: CROS_NOTIFICATION_ASK_PROMPT(notification.title.trim()),
      }),
    [openGii],
  );
}

/** Text with each mention of Cros highlighted; tapping the name opens Cros, then runs `onOpen`. */
export function CrosNameText({ text, onOpen }: { text: string; onOpen?: () => void }) {
  const openGii = useShellDockStore((state) => state.openGii);
  const parts = text.split(new RegExp(CROS_NAME_PATTERN.source, 'g'));
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) =>
        CROS_NAME_PATTERN.test(part) ? (
          <button
            key={i}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openGii();
              onOpen?.();
            }}
            className="text-primary pointer-events-auto relative font-semibold underline decoration-dotted underline-offset-2"
          >
            {part}
          </button>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** The Cros face and "From CROS", on the cards Cros raised itself. */
export function FromCrosMark({ className }: { className?: string }) {
  return (
    <span className={cn('text-primary inline-flex items-center gap-1 text-[11px] font-semibold', className)}>
      <CrosAssistantLogo size="xs" />
      From {CROS_ASSISTANT_NAME}
    </span>
  );
}

/** Opens Cros already asking about this notification, then runs `onAsk`. */
export function AskCrosButton({
  notification,
  onAsk,
  className,
}: {
  notification: Pick<AgentNotification, 'title' | 'propertyAddress'>;
  onAsk?: () => void;
  className?: string;
}) {
  const ask = useAskCrosAboutNotification();
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        ask(notification);
        onAsk?.();
      }}
      className={cn(
        'bg-primary/10 text-primary hover:bg-primary/15 pointer-events-auto relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors',
        className,
      )}
    >
      <CrosAssistantLogo size="xs" />
      Ask {CROS_ASSISTANT_NAME}
    </button>
  );
}
