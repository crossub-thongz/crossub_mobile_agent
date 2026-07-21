'use client';

import { Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { rentReviewLeaseTypeLabel } from '@/lib/rent-review/agent-workflow-model';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { formatCurrency } from '@/lib/utils';

function formatLeaseEndShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function RentReviewResearchResultSection({
  detail,
  researchComplete,
  landlordEmailed,
  emailBusy,
  onEmail,
  helperText,
}: {
  detail: RentReviewWorkflowDetail;
  researchComplete: boolean;
  landlordEmailed: boolean;
  emailBusy?: boolean;
  onEmail: () => void;
  helperText?: string;
}) {
  const suggested = detail.ai.suggestedWeekly;

  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-sm font-semibold">Research result</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Current rent</dt>
            <dd className="mt-0.5 font-semibold tabular-nums">
              {formatCurrency(detail.currentWeeklyRent)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Lease type</dt>
            <dd className="mt-0.5 font-medium">{rentReviewLeaseTypeLabel(detail)}</dd>
          </div>
        </dl>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Lease end</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {formatLeaseEndShort(detail.leaseEndDate)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Recommended rent value</dt>
            <dd className="text-primary mt-0.5 font-semibold tabular-nums">
              {suggested != null ? formatCurrency(suggested) : '—'}
              {detail.ai.increasePercent != null ? (
                <span className="text-muted-foreground ml-1 text-xs font-normal">
                  (+{detail.ai.increasePercent}%)
                </span>
              ) : null}
            </dd>
          </div>
        </dl>
      </div>

      {detail.ai.rationale ? (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{detail.ai.rationale}</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {landlordEmailed ? (
          <p className="text-muted-foreground text-xs sm:mr-auto">
            Research results emailed to the landlord automatically.
          </p>
        ) : null}
        <Button
          type="button"
          className="gap-2 sm:min-w-[8rem]"
          disabled={!researchComplete || emailBusy || landlordEmailed}
          onClick={onEmail}
        >
          <Mail className="size-4" />
          {landlordEmailed ? 'Sent to landlord' : 'Email landlord'}
        </Button>
      </div>
      {!researchComplete || helperText ? (
        <p className="text-muted-foreground mt-2 text-[11px]">
          {helperText ??
            'Market research is completed in the admin portal. Email the landlord once results are shown above.'}
        </p>
      ) : null}
    </section>
  );
}
