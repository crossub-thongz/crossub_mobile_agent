'use client';

import { Briefcase, ChevronRight } from 'lucide-react';

import {
  PROPERTY_JOB_KIND_ICON,
  PROPERTY_JOB_KIND_LABEL,
} from '@/constants/property-jobs';
import type { GiiJobCaseLink } from '@/lib/crossub-api/gii-client';
import {
  inspectionToJobRow,
  maintenanceToJobRow,
  rentReviewToJobRow,
  type PortfolioAgentData,
} from '@/lib/portfolio-case-dialog';
import type { PropertyJobRow } from '@/lib/property-job-rows';
import { cn } from '@/lib/utils';

function resolveJobCaseRow(
  link: GiiJobCaseLink,
  data: PortfolioAgentData,
): PropertyJobRow | null {
  if (link.kind === 'maintenance') {
    const item =
      data.maintenanceAll.find((row) => row.id === link.id) ??
      (link.reference
        ? data.maintenanceAll.find((row) => row.trackingNumber === link.reference)
        : undefined);
    return item ? maintenanceToJobRow(item) : null;
  }

  if (link.kind === 'rent_review') {
    const item = data.rentReviews.find((row) => row.id === link.id);
    return item ? rentReviewToJobRow(item, data.rentReviewDecisions) : null;
  }

  const item = data.inspections.find((row) => row.id === link.id);
  return item ? inspectionToJobRow(item) : null;
}

function stubJobRow(link: GiiJobCaseLink): PropertyJobRow {
  return {
    id: link.id,
    kind: link.kind,
    jobType: PROPERTY_JOB_KIND_LABEL[link.kind],
    name: link.reference?.trim() || PROPERTY_JOB_KIND_LABEL[link.kind],
    description: link.label,
    date: '—',
    createdAt: '—',
    createdAtMs: 0,
    status: 'Open',
    phase: 'in_progress',
  };
}

/**
 * Open buttons under a CROS reply for every job case the tools returned on that turn.
 * Same recipe as the property jobs card: tap opens the portfolio case dialog.
 */
export function GiiJobCaseButtons({
  cases,
  portfolioData,
  onOpen,
  onOpenMissing,
}: {
  cases: GiiJobCaseLink[];
  portfolioData: PortfolioAgentData;
  onOpen: (row: PropertyJobRow) => void;
  /** When the case is not in the loaded portfolio yet (e.g. just created). */
  onOpenMissing?: (link: GiiJobCaseLink) => void | Promise<void>;
}) {
  if (cases.length === 0) return null;

  return (
    <div className="mr-auto flex w-[92%] flex-col gap-1.5">
      {cases.map((link) => {
        const Icon = PROPERTY_JOB_KIND_ICON[link.kind];
        return (
          <button
            key={`${link.kind}:${link.id}`}
            type="button"
            onClick={() => {
              const row = resolveJobCaseRow(link, portfolioData);
              if (row) {
                onOpen(row);
                return;
              }
              if (onOpenMissing) {
                void onOpenMissing(link);
                return;
              }
              onOpen(stubJobRow(link));
            }}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left transition',
              'hover:bg-muted/40',
            )}
          >
            <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-muted-foreground flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
                <Briefcase className="size-3 shrink-0" />
                {PROPERTY_JOB_KIND_LABEL[link.kind]}
              </span>
              <span className="block truncate text-xs font-medium">{link.label}</span>
            </span>
            <span className="text-primary flex shrink-0 items-center gap-0.5 text-[11px] font-semibold">
              Open
              <ChevronRight className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
