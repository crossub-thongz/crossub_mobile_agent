import {
  BRIEFING_EMPTY_COPY,
  BRIEFING_MAX_ROWS,
  BRIEFING_MAX_SUMMARY_GROUPS,
  CATEGORY_NOUN,
  GREETING_AFTERNOON_UNTIL_HOUR,
  GREETING_MORNING_UNTIL_HOUR,
  GROUP_SUMMARY_NOUN,
  PRIORITY_RANK,
} from '@/constants/gii-briefing';
import type { NeedActionGroup, PropertyNeedAction } from '@/lib/types';

/**
 * The proactive briefing Gii opens with. Every count and row comes from the data the
 * provider already holds (`needActionItems` / `needActionGroups`) — the model states nothing
 * here, exactly as the vacate card's numbers come only from the engine.
 *
 * Pure and framework-free so it type-checks offline and `now` can be pinned in a test. `now`
 * is a parameter, never `new Date()` inside — same discipline as the engine's `asAt`.
 */
export interface GiiBriefing {
  /** Greeting bubble text: salutation + count (or the caught-up line when empty). */
  greeting: string;
  /** "First up: …" callout for the single top-priority item — null when there is nothing. */
  subtitle: string | null;
  /** One-line group summary, e.g. "1 maintenance · 1 rent review" — null when empty. */
  groupSummary: string | null;
  total: number;
  /** Priority-sorted, sliced to BRIEFING_MAX_ROWS. */
  rows: PropertyNeedAction[];
  /** total − rows.length; drives "View all N". */
  overflow: number;
  isEmpty: boolean;
}

function salutation(now: Date): string {
  const hour = now.getHours();
  if (hour < GREETING_MORNING_UNTIL_HOUR) return 'Good morning';
  if (hour < GREETING_AFTERNOON_UNTIL_HOUR) return 'Good afternoon';
  return 'Good evening';
}

function sortByPriority(items: PropertyNeedAction[]): PropertyNeedAction[] {
  return [...items].sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

/** A group's most-urgent item, as a priority rank (lower = more urgent). */
function groupTopRank(group: NeedActionGroup): number {
  return group.items.reduce(
    (best, item) => Math.min(best, PRIORITY_RANK[item.priority]),
    PRIORITY_RANK.low,
  );
}

function groupSummary(groups: NeedActionGroup[]): string | null {
  if (groups.length === 0) return null;
  // Lead by priority, not raw count — so "maintenance" and "rent review" surface ahead of a
  // larger pile of low-priority items (e.g. missing documents), which is what the agent cares
  // about first. Count breaks ties within a priority band.
  const parts = [...groups]
    .sort((a, b) => groupTopRank(a) - groupTopRank(b) || b.count - a.count)
    .map((g) => `${g.count} ${GROUP_SUMMARY_NOUN[g.id] ?? CATEGORY_NOUN[g.category]}`);
  if (parts.length <= BRIEFING_MAX_SUMMARY_GROUPS) return parts.join(' · ');
  const shown = parts.slice(0, BRIEFING_MAX_SUMMARY_GROUPS).join(' · ');
  return `${shown} · +${parts.length - BRIEFING_MAX_SUMMARY_GROUPS} more`;
}

export function buildGiiBriefing(
  items: PropertyNeedAction[],
  groups: NeedActionGroup[],
  now: Date,
): GiiBriefing {
  const hello = salutation(now);
  const total = items.length;

  if (total === 0) {
    return {
      greeting: `${hello}. ${BRIEFING_EMPTY_COPY}`,
      subtitle: null,
      groupSummary: null,
      total: 0,
      rows: [],
      overflow: 0,
      isEmpty: true,
    };
  }

  const sorted = sortByPriority(items);
  const rows = sorted.slice(0, BRIEFING_MAX_ROWS);
  const top = sorted[0];
  const verb = total === 1 ? 'thing needs' : 'things need';

  return {
    greeting: `${hello} — ${total} ${verb} you today.`,
    subtitle: `First up: ${top.label} · ${top.propertyAddress}.`,
    groupSummary: groupSummary(groups),
    total,
    rows,
    overflow: Math.max(0, total - rows.length),
    isEmpty: false,
  };
}
