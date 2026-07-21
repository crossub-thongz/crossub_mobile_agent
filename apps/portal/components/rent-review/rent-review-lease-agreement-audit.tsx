'use client';

import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { LeaseAgreementStep } from '@/lib/rent-review/tenant-decision-display';
import { formatDateTime } from '@/lib/utils';

export function RentReviewLeaseAgreementAudit({
  steps,
  title = 'Lease extension agreement',
  onViewAgreement,
  viewingAgreement = false,
  viewLabel = 'View agreement',
}: {
  steps: LeaseAgreementStep[];
  title?: string;
  /** Opens / downloads the lease extension agreement PDF once preparing starts. */
  onViewAgreement?: () => void;
  viewingAgreement?: boolean;
  viewLabel?: string;
}) {
  if (steps.length === 0) return null;

  const doneCount = steps.filter((step) => step.done).length;
  const canView =
    Boolean(onViewAgreement) &&
    steps.some((s) => (s.id === 'preparing' || s.id === 'sent') && s.done);

  return (
    <section className="rounded-xl border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
        <div className="flex items-center gap-2">
          {canView ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px]"
              disabled={viewingAgreement}
              onClick={() => onViewAgreement?.()}
            >
              <FileText className="size-3.5" />
              {viewingAgreement ? 'Opening…' : viewLabel}
            </Button>
          ) : null}
          <p className="text-muted-foreground text-[10px] tabular-nums">
            {doneCount}/{steps.length}
          </p>
        </div>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-xs">
            <span
              className={
                step.done
                  ? 'bg-primary/15 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold'
                  : 'bg-muted text-muted-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]'
              }
            >
              {step.done ? '✓' : '·'}
            </span>
            <div className="min-w-0 flex-1">
              <p className={step.done ? 'font-medium' : 'text-muted-foreground'}>{step.label}</p>
              {step.at ? (
                <p className="text-muted-foreground text-[10px]">{formatDateTime(step.at)}</p>
              ) : (
                <p className="text-muted-foreground text-[10px]">Pending</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
