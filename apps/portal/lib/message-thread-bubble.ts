import type { ThreadMessage } from '@/lib/types';
import { cn } from '@/lib/utils';

/** True when the signed-in agent authored this message. */
export function isAgentSentMessage(msg: Pick<ThreadMessage, 'sentByAgent'>): boolean {
  return msg.sentByAgent === true;
}

/** Row + bubble classes for agent message threads. Received messages align right with a distinct tint. */
export function messageThreadBubbleClasses(
  msg: Pick<ThreadMessage, 'sentByAgent'>,
  options?: { rounded?: 'xl' | '2xl'; maxWidth?: string },
): { row: string; bubble: string; meta: string } {
  const isAgentSent = isAgentSentMessage(msg);
  const rounded = options?.rounded ?? 'xl';
  const maxWidth = options?.maxWidth ?? 'max-w-[85%]';

  return {
    row: cn('flex', isAgentSent ? 'justify-start' : 'justify-end'),
    bubble: cn(
      maxWidth,
      rounded === '2xl' ? 'rounded-2xl' : 'rounded-xl',
      'px-3 py-2 text-sm',
      isAgentSent
        ? 'bg-primary/15 text-foreground'
        : 'border border-sky-500/25 bg-sky-500/15 text-sky-950 dark:text-sky-50',
    ),
    meta: cn(
      'text-[10px]',
      isAgentSent ? 'text-muted-foreground' : 'text-sky-800/80 dark:text-sky-100/80',
    ),
  };
}
