'use client';

import Link from 'next/link';
import { AlertTriangle, ListTodo, Sparkles } from 'lucide-react';

import { CATEGORY_ICON } from '@/constants/gii-briefing';
import { ROUTES } from '@/constants/routes';
import type { GiiBriefing } from '@/lib/gii-briefing';
import type { PropertyNeedAction } from '@/lib/types';
import { cn } from '@/lib/utils';

/**
 * The list Gii opens with — today's actionable cases, prioritised. Same recipe as the vacate
 * assessment card: raw divs + `cn`, no arithmetic, everything driven by the selector's output.
 * Rows deep-link to the existing record pages (Open); conversational handling is Phase 2.
 *
 * The empty state is carried by the greeting bubble, so this renders nothing when there is
 * nothing to do — never a blank card.
 */
export function GiiBriefingCard({
  briefing,
  onNavigate,
  onAsk,
  onOpen,
}: {
  briefing: GiiBriefing;
  onNavigate?: () => void;
  onAsk?: (row: PropertyNeedAction) => void;
  /** Open the portfolio job popup instead of navigating to the legacy workflow page. */
  onOpen?: (row: PropertyNeedAction) => void;
}) {
  if (briefing.isEmpty || briefing.rows.length === 0) return null;

  return (
    <div className="mr-auto w-[92%] overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
          <ListTodo className="size-3.5 shrink-0 text-primary" />
          Today&rsquo;s jobs for you
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary tabular-nums">
          {briefing.total}
        </span>
      </div>

      {briefing.groupSummary ? (
        <p className="text-muted-foreground border-b px-3 py-1.5 text-[10px]">
          {briefing.groupSummary}
        </p>
      ) : null}

      <ul className="divide-y">
        {briefing.rows.map((row) => {
          const urgent = row.priority === 'urgent' || row.priority === 'high';
          const Icon = urgent ? AlertTriangle : CATEGORY_ICON[row.category];

          return (
            <li key={row.id} className="px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg',
                    urgent
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{row.label}</span>
                  <span className="text-muted-foreground block truncate text-[10px]">
                    {row.propertyAddress}
                  </span>
                </span>
              </div>
              <div className="mt-2 flex gap-2 pl-[38px]">
                {onAsk ? (
                  <button
                    type="button"
                    onClick={() => onAsk(row)}
                    className="inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2.5 text-[11px] font-medium text-primary transition hover:bg-primary/15"
                  >
                    <Sparkles className="size-3" />
                    Ask Gii
                  </button>
                ) : null}
                {onOpen ? (
                  <button
                    type="button"
                    onClick={() => onOpen(row)}
                    className="inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium text-foreground/80 transition hover:bg-muted/40"
                  >
                    Open
                  </button>
                ) : (
                  <Link
                    href={row.href}
                    onClick={() => onNavigate?.()}
                    className="inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium text-foreground/80 transition hover:bg-muted/40"
                  >
                    Open
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {briefing.overflow > 0 ? (
        <Link
          href={ROUTES.TASKS}
          onClick={() => onNavigate?.()}
          className="text-muted-foreground hover:text-foreground flex items-center justify-center border-t px-3 py-2 text-[11px] font-medium transition"
        >
          View all {briefing.total} &rarr;
        </Link>
      ) : null}
    </div>
  );
}
