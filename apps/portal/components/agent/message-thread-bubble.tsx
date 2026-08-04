'use client';

import { Mail, MessageSquare } from 'lucide-react';

import { MessageBody } from '@/components/agent/message-body';
import { messageThreadBubbleClasses } from '@/lib/message-thread-bubble';
import type { ThreadMessage } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

export function MessageThreadBubble({
  msg,
  rounded = 'xl',
  maxWidth = 'max-w-[85%]',
  textSize = 'text-sm',
  showChannel = true,
  className,
}: {
  msg: ThreadMessage;
  rounded?: 'xl' | '2xl';
  maxWidth?: string;
  textSize?: string;
  showChannel?: boolean;
  className?: string;
}) {
  const layout = messageThreadBubbleClasses(msg, { rounded, maxWidth });

  return (
    <div className={cn(layout.row, className)}>
      <div className={cn(layout.bubble, textSize === 'text-xs' && 'text-xs')}>
        <div className={cn('mb-1 flex flex-wrap items-center gap-1.5', layout.meta)}>
          {layout.kind === 'system' ? (
            <span className="rounded bg-amber-600/15 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-amber-900 uppercase dark:text-amber-100">
              System
            </span>
          ) : layout.kind === 'received' ? (
            <span className="rounded bg-sky-600/15 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-sky-800 uppercase dark:text-sky-200">
              Received
            </span>
          ) : null}
          {showChannel &&
            (msg.channel === 'email' ? (
              <Mail className="size-3 shrink-0" />
            ) : (
              <MessageSquare className="size-3 shrink-0" />
            ))}
          <span className="font-medium">{msg.from}</span>
          <span className="tabular-nums">{formatDateTime(msg.at)}</span>
        </div>
        <MessageBody body={msg.body} className={textSize === 'text-xs' ? 'text-xs leading-relaxed' : undefined} />
        {msg.mentions && msg.mentions.length > 0 && (
          <p className={cn('mt-1.5', layout.meta)}>
            Tagged: {msg.mentions.map((m) => `@${m.name}`).join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
