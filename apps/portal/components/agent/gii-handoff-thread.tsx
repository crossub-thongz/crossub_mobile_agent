'use client';

import { Headset } from 'lucide-react';

import { GiiChatLine } from '@/components/agent/gii-chat-line';
import { GII_HANDOFF_COPY } from '@/constants/gii-handoff';
import type { GiiHandoff } from '@/lib/crossub-api/gii-client';
import { cn } from '@/lib/utils';
import { giiHandoffReplies, giiHandoffStatus } from '@/utils/gii-handoff';

/**
 * The part of a Cros chat a CROSSUB person holds (Jarvis 2.3): who has it, how long the agent
 * has waited or when the team is back, then the team's replies and the agent's own messages,
 * oldest first, and at the end, once the team closes it, that the chat is back with Cros. The
 * handoff message itself is already in the chat above, on the Confirm card.
 */
export function GiiHandoffThread({ handoff }: { handoff: GiiHandoff }) {
  const now = new Date();
  const status = (
    <div
      className={cn(
        'flex items-start gap-2 rounded-xl border px-3 py-2 text-xs',
        handoff.closed ? 'bg-muted/40 text-muted-foreground' : 'border-sky-500/30 bg-sky-500/5',
      )}
    >
      <Headset className={cn('mt-0.5 size-3.5 shrink-0', handoff.closed ? '' : 'text-sky-600')} />
      <span className="min-w-0">
        {handoff.closed ? null : (
          <span className="block font-semibold">{GII_HANDOFF_COPY.WITH(handoff.staffName)}</span>
        )}
        <span className={cn('block', !handoff.closed && 'text-muted-foreground')}>
          {giiHandoffStatus(handoff, now)}
        </span>
      </span>
    </div>
  );
  return (
    <div className="space-y-2">
      {handoff.closed ? null : status}
      {giiHandoffReplies(handoff).map((message) =>
        message.fromTeam ? (
          <div key={message.id} className="flex w-full justify-start">
            <div className="max-w-[92%]">
              <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-300">
                <Headset className="size-3 shrink-0" />
                {message.from}
              </p>
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-sm">
                {message.body}
              </div>
            </div>
          </div>
        ) : (
          <GiiChatLine key={message.id} role="user" text={message.body} />
        ),
      )}
      {handoff.closed ? status : null}
    </div>
  );
}
