'use client';

import Link from 'next/link';
import { ListTodo } from 'lucide-react';

import { CrosAssistantLogo } from '@/components/brand/cros-assistant-logo';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import {
  BRIEFING_MAX_ROWS,
  SERVER_BRIEFING_ICON,
  SERVER_BRIEFING_URGENT,
} from '@/constants/gii-briefing';
import { ROUTES } from '@/constants/routes';
import type { GiiJobCaseLink, GiiServerBriefing, GiiServerBriefingItem } from '@/lib/crossub-api/gii-client';
import { cn } from '@/lib/utils';

/**
 * The list Cros opens with, from the server briefing (Jarvis 2.2): most urgent first, as the
 * server ordered it. Open goes through the same record-link handler as the Open buttons under a
 * Cros reply. Renders nothing when there is nothing to do; the greeting carries that.
 */
export function GiiServerBriefingCard({
  briefing,
  title,
  onNavigate,
  onAsk,
  onOpen,
}: {
  briefing: GiiServerBriefing;
  title: string;
  onNavigate?: () => void;
  onAsk: (item: GiiServerBriefingItem) => void;
  onOpen: (link: GiiJobCaseLink) => void;
}) {
  if (briefing.items.length === 0) return null;
  const rows = briefing.items.slice(0, BRIEFING_MAX_ROWS);

  return (
    <div className="mr-auto w-[92%] overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-[12px] font-semibold">
          <ListTodo className="size-3.5 shrink-0 text-primary" />
          {title}
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
          {briefing.total}
        </span>
      </div>

      {briefing.summary ? (
        <p className="text-muted-foreground border-b px-3 py-1.5 text-[11px]">{briefing.summary}</p>
      ) : null}

      <ul className="divide-y">
        {rows.map((item, index) => {
          const urgent = SERVER_BRIEFING_URGENT.includes(item.category);
          const Icon = SERVER_BRIEFING_ICON[item.category];
          const link = item.link;
          return (
            <li key={`${item.category}-${link?.id ?? index}`} className="px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg',
                    urgent ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{item.title}</span>
                  <span className="text-muted-foreground block truncate text-[11px]">
                    {[item.detail, item.propertyAddress].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </div>
              <div className="mt-2 flex gap-2 pl-[38px]">
                <button
                  type="button"
                  onClick={() => onAsk(item)}
                  className="inline-flex h-7 items-center gap-1 rounded-md bg-primary/10 px-2.5 text-[12px] font-medium text-primary transition hover:bg-primary/15"
                >
                  <CrosAssistantLogo size="xs" className="size-3" />
                  Ask {CROS_ASSISTANT_NAME}
                </button>
                {link ? (
                  <button
                    type="button"
                    onClick={() => onOpen({ kind: link.kind, id: link.id, reference: null, label: item.title })}
                    className="inline-flex h-7 items-center rounded-md border px-2.5 text-[12px] font-medium text-foreground/80 transition hover:bg-muted/40"
                  >
                    Open
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {briefing.total > rows.length ? (
        <Link
          href={ROUTES.TASKS}
          onClick={() => onNavigate?.()}
          className="text-muted-foreground hover:text-foreground flex items-center justify-center border-t px-3 py-2 text-[12px] font-medium transition"
        >
          View all {briefing.total} &rarr;
        </Link>
      ) : null}
    </div>
  );
}
