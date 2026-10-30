import { GII_HANDOFF_COPY, GII_HANDOFF_WAIT_HOUR_MINUTES } from '@/constants/gii-handoff';
import { PROPERTY_TIME_ZONE } from '@/constants/time-zone';
import type { GiiHandoff, GiiHandoffMessage } from '@/lib/crossub-api/gii-client';

const MINUTE_MS = 60_000;

/** The thread after the handoff itself: what the team and the agent wrote since. */
export function giiHandoffReplies(handoff: GiiHandoff): GiiHandoffMessage[] {
  return handoff.messages.slice(1);
}

/** True while a person holds the chat, so the composer writes to them instead of Cros. */
export function giiHandoffHeld(handoff: GiiHandoff | null): handoff is GiiHandoff {
  return handoff !== null && !handoff.closed;
}

/** "3 min" or "2 h", from `since` to `now`; under a minute reads "1 min". */
export function giiHandoffWaitLabel(since: string, now: Date): string {
  const minutes = Math.max(1, Math.floor((now.getTime() - new Date(since).getTime()) / MINUTE_MS));
  return minutes < GII_HANDOFF_WAIT_HOUR_MINUTES
    ? `${minutes} min`
    : `${Math.floor(minutes / GII_HANDOFF_WAIT_HOUR_MINUTES)} h`;
}

/** "Mon 9:00 am" on the team's Sydney clock, as their hours are given, whatever the phone's zone. */
function opensLabel(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: PROPERTY_TIME_ZONE,
  });
}

/** The status line under the header: the wait, the team's hours, or that they answered. */
export function giiHandoffStatus(handoff: GiiHandoff, now: Date): string {
  // Whoever pressed Done, who may not be the person holding the chat.
  if (handoff.closed) return GII_HANDOFF_COPY.CLOSED(handoff.closedByName);
  const parts = [
    handoff.waitingSince
      ? GII_HANDOFF_COPY.WAITING(giiHandoffWaitLabel(handoff.waitingSince, now))
      : GII_HANDOFF_COPY.ANSWERED,
  ];
  if (handoff.teamOpensAt) parts.push(GII_HANDOFF_COPY.BACK_FROM(opensLabel(handoff.teamOpensAt)));
  return parts.join(' · ');
}
