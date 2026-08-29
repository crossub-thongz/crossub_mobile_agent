'use client';

import { Briefcase, ChevronRight } from 'lucide-react';

import {
  PROPERTY_JOB_KIND_ICON,
  PROPERTY_JOB_KIND_LABEL,
} from '@/constants/property-jobs';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import { cn } from '@/lib/utils';

/** Rows beyond this collapse into a "+N more" line — the full list is on the property page. */
const MAX_JOB_ROWS = 6;

function jobTitle(row: PropertyJobRow): string {
  if (row.kind === 'maintenance' && row.issueType) {
    return `${PROPERTY_JOB_KIND_LABEL.maintenance} · ${row.issueType}`;
  }
  return row.jobType || PROPERTY_JOB_KIND_LABEL[row.kind];
}

function jobSubtitle(row: PropertyJobRow): string {
  const date = row.date && row.date !== '—' ? row.date : null;
  return [row.status, date].filter(Boolean).join(' · ');
}

/**
 * The list Gii opens with on a property page — that property's in-progress jobs (same set as
 * the Overview tab's "Jobs in progress"). Same recipe as the briefing card: raw divs + `cn`,
 * everything driven by the selector's rows. Tapping a row opens that case in the portfolio
 * dialog. Renders nothing when there are no jobs (the greeting bubble carries the empty state).
 */
export function GiiPropertyJobsCard({
  jobs,
  onOpen,
}: {
  jobs: PropertyJobRow[];
  onOpen: (row: PropertyJobRow) => void;
}) {
  const isV2 = useIsAgentUiV2();

  if (jobs.length === 0) return null;

  const rows = jobs.slice(0, MAX_JOB_ROWS);
  const overflow = Math.max(0, jobs.length - rows.length);

  return (
    <div
      className={cn(
        'mr-auto w-[92%] overflow-hidden rounded-2xl border',
        isV2 ? 'v2-frosted-surface' : 'bg-card',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold">
          <Briefcase className="size-3.5 shrink-0 text-primary" />
          Jobs in progress
        </span>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary tabular-nums">
          {jobs.length}
        </span>
      </div>

      <ul className="divide-y">
        {rows.map((row) => {
          const Icon = PROPERTY_JOB_KIND_ICON[row.kind];
          const subtitle = jobSubtitle(row);

          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onOpen(row)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition',
                  'hover:bg-muted/40',
                )}
              >
                <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{jobTitle(row)}</span>
                  {subtitle ? (
                    <span className="text-muted-foreground block truncate text-[10px]">
                      {subtitle}
                    </span>
                  ) : null}
                </span>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>

      {overflow > 0 ? (
        <p className="text-muted-foreground border-t px-3 py-2 text-center text-[11px] font-medium">
          +{overflow} more in this property
        </p>
      ) : null}
    </div>
  );
}
