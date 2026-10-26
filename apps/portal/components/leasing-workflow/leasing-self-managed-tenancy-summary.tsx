'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

import { StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import { propertyDetail } from '@/constants/routes';
import { CREATE_TENANCY_COPY as COPY } from '@/constants/self-managed-tenancy';
import { LEASING_ITEM_STATUS, LEASING_UI } from '@/lib/leasing/constants';
import { recordedTenancySummary } from '@/lib/leasing/self-managed-tenancy';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

/**
 * Self-Manage: the tenancy the agency recorded with "Create tenancy" (Results), and on the
 * Tenancy step what is left to do outside this letting.
 */
export function LeasingSelfManagedTenancySummary({
  detail,
  showNextSteps = false,
}: {
  detail: LeasingPropertyDetail;
  showNextSteps?: boolean;
}) {
  const summary = recordedTenancySummary(detail);
  const dateText = (iso?: string) => (iso ? formatDate(iso.slice(0, 10)) : COPY.noValue);

  return (
    <StepCard
      icon={Home}
      title={COPY.recordedTitle}
      description={COPY.recordedHint}
      status={LEASING_ITEM_STATUS.DONE}
      footer={
        <Button asChild size="sm" variant="ghost" className={cn('gap-1.5', LEASING_UI.btnSecondary)}>
          <Link href={propertyDetail(detail.propertyId)}>{COPY.openProperty}</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StepFact
          className="col-span-2 sm:col-span-3"
          label={COPY.tenants}
          value={summary.tenantNames.length > 0 ? summary.tenantNames.join(', ') : COPY.noValue}
        />
        <StepFact
          label={COPY.weeklyRent}
          value={summary.weeklyRent != null ? formatCurrency(summary.weeklyRent) : COPY.noValue}
        />
        <StepFact
          label={COPY.bond}
          value={summary.bond != null ? formatCurrency(summary.bond) : COPY.noValue}
        />
        <StepFact label={COPY.leaseTerm} value={summary.leaseTerm || COPY.noValue} />
        <StepFact label={COPY.starts} value={dateText(summary.startDate)} />
        <StepFact label={COPY.ends} value={dateText(summary.endDate)} />
      </div>
      {showNextSteps ? (
        <div className="mt-3 space-y-1">
          <p className={LEASING_UI.sectionLabel}>{COPY.nextStepsTitle}</p>
          <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
            {COPY.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </StepCard>
  );
}

/** Self-Manage Tenancy step before a tenancy exists: send the agent back to Results. */
export function LeasingSelfManagedTenancyWaiting({ onGoToResults }: { onGoToResults: () => void }) {
  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3">
      <p className="text-muted-foreground text-xs">{COPY.tenancyWaiting}</p>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={LEASING_UI.btnSecondary}
        onClick={onGoToResults}
      >
        {COPY.goToResults}
      </Button>
    </div>
  );
}
