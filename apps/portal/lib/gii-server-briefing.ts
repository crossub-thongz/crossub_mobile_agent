import {
  SERVER_BRIEFING_CHANGES_NAMED,
  SERVER_BRIEFING_UNAVAILABLE_LABEL,
} from '@/constants/gii-briefing';
import type { GiiServerBriefing } from '@/lib/crossub-api/gii-client';
import { greetingLead } from '@/lib/gii-briefing';

/**
 * Cros's opening message from the server briefing (Jarvis 2.2). Every number is the server's;
 * this only words them. Pure, with `now` passed in, like `buildGiiBriefing`.
 */
export function serverBriefingGreeting(
  briefing: GiiServerBriefing,
  now: Date,
  agentName?: string | null,
): string {
  const lead = `${greetingLead(now, agentName)} 👋`;
  const parts: string[] = [];
  if (briefing.total === 0) {
    parts.push(`${lead} Nothing needs you right now.`);
  } else {
    const verb = briefing.total === 1 ? 'thing needs' : 'things need';
    parts.push(`${lead} ${briefing.total} ${verb} you today${briefing.summary ? `: ${briefing.summary}` : ''}.`);
  }
  const { count, latest } = briefing.changes;
  if (count > 0) {
    const named = latest.slice(0, SERVER_BRIEFING_CHANGES_NAMED).join('; ');
    const more = count > SERVER_BRIEFING_CHANGES_NAMED ? `, and ${count - SERVER_BRIEFING_CHANGES_NAMED} more` : '';
    parts.push(`Since your last briefing: ${named}${more}.`);
  }
  if (briefing.unavailable.length > 0) {
    const missing = briefing.unavailable.map((u) => SERVER_BRIEFING_UNAVAILABLE_LABEL[u] ?? u).join(', ');
    parts.push(`I could not check ${missing} just now, so this list may be missing some.`);
  }
  return parts.join('\n\n');
}
