import type { ThreadMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

/** True when the signed-in agent authored this message (not automated CROSSUB system). */
export function isAgentSentMessage(msg: Pick<ThreadMessage, 'sentByAgent' | 'from'>): boolean {
  return msg.sentByAgent === true && !isSystemThreadMessage(msg);
}

/** Automated workflow / platform messages from CROSSUB — always left-aligned. */
export function isSystemThreadMessage(msg: Pick<ThreadMessage, 'from'>): boolean {
  const from = msg.from.trim().toLowerCase();
  if (!from) return false;
  return (
    from.startsWith('crossub') ||
    from.includes('crossub maintenance') ||
    from.includes('crossub support') ||
    from.includes('crossub leasing') ||
    from.includes('crossub inspection') ||
    from.includes('crossub accounting')
  );
}

export type MessageBubbleKind = 'own' | 'received' | 'system';

export function messageBubbleKind(
  msg: Pick<ThreadMessage, 'sentByAgent' | 'from'>,
): MessageBubbleKind {
  if (isSystemThreadMessage(msg)) return 'system';
  if (msg.sentByAgent === true) return 'own';
  return 'received';
}

/** Row + bubble classes for agent message threads. Own messages on the right; received and system on the left. */
export function messageThreadBubbleClasses(
  msg: Pick<ThreadMessage, 'sentByAgent' | 'from'>,
  options?: { rounded?: 'xl' | '2xl'; maxWidth?: string },
): { row: string; bubble: string; meta: string; kind: MessageBubbleKind } {
  const kind = messageBubbleKind(msg);
  const rounded = options?.rounded ?? 'xl';
  const maxWidth = options?.maxWidth ?? 'max-w-[85%]';

  return {
    kind,
    row: cn('flex w-full', kind === 'own' ? 'justify-end' : 'justify-start'),
    bubble: cn(
      maxWidth,
      rounded === '2xl' ? 'rounded-2xl' : 'rounded-xl',
      'px-3 py-2 text-sm',
      kind === 'own'
        ? 'bg-primary text-primary-foreground'
        : kind === 'system'
          ? 'border border-amber-500/35 bg-amber-500/10 text-foreground dark:border-amber-400/25 dark:bg-amber-950/30'
          : 'border border-sky-500/35 bg-sky-500/12 text-foreground dark:border-sky-400/25 dark:bg-sky-950/40',
    ),
    meta: cn(
      'text-[10px]',
      kind === 'own'
        ? 'text-primary-foreground/75'
        : kind === 'system'
          ? 'text-amber-900/90 dark:text-amber-100/80'
          : 'text-sky-800/90 dark:text-sky-200/80',
    ),
  };
}
