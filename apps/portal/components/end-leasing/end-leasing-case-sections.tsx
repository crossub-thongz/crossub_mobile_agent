'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { TerminationKeyReturnDateDialog } from '@/components/end-leasing/termination-key-return-date-dialog';
import { TerminationVacateDateDialog } from '@/components/end-leasing/termination-vacate-date-dialog';
import {
  breachStatusLabel,
  endLeasingKeyReturnDate,
  endLeasingKeyReturnTo,
  endLeasingVacateDate,
  isBreachLease,
} from '@/lib/end-leasing/agent-workflow-model';
import {
  actualDaysNoticeToVacate,
  agreementRemainingPercent,
  daysNotifyInAdvanceLabel,
  endLeasingLeaseTypeLabel,
  tenantNoticeDate,
} from '@/lib/end-leasing/vacate-display';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import type { TerminationCaseDetail } from '@/lib/end-leasing/types';
import { formatCurrency, formatDate } from '@/lib/utils';

function SummaryField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium leading-snug">{children}</dd>
    </div>
  );
}

function SectionCard({
  title,
  children,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function EndLeasingTenancyDetailsSection({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const vacateDate = endLeasingVacateDate(caseData);
  const breach = isBreachLease(caseData);
  const noticeDate = tenantNoticeDate(caseData);
  const actualDays = actualDaysNoticeToVacate(caseData);
  const remainingPct = agreementRemainingPercent(caseData);

  return (
    <SectionCard title="Tenant details">
      <dl className="grid gap-4 sm:grid-cols-2">
        <SummaryField label="Lease end date">
          {caseData.leaseEndDate ? formatDate(caseData.leaseEndDate) : '—'}
        </SummaryField>
        <SummaryField label="Notice date">
          {noticeDate ? formatDate(noticeDate) : '—'}
        </SummaryField>
        <SummaryField label="Days notify in advance">
          {daysNotifyInAdvanceLabel(caseData)}
          {actualDays != null && !breach ? (
            <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
              Actual: {actualDays} day{actualDays === 1 ? '' : 's'} notice given
            </span>
          ) : null}
        </SummaryField>
        <SummaryField label="Lease type">{endLeasingLeaseTypeLabel(caseData)}</SummaryField>
        <SummaryField label="Vacate date">
          {vacateDate ? formatDate(vacateDate) : 'Not confirmed'}
        </SummaryField>
        <SummaryField label="Breach lease">
          <span className={breach ? 'text-destructive' : 'text-foreground'}>
            {breach ? 'Yes' : 'No'}
          </span>
          {breach ? (
            <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
              {breachStatusLabel(caseData)}
            </span>
          ) : null}
        </SummaryField>
        <SummaryField label="Bond amount">{formatCurrency(caseData.bondHeld)}</SummaryField>
        {breach && remainingPct != null ? (
          <SummaryField label="% of agreement remaining">
            {remainingPct}% of lease term not completed
          </SummaryField>
        ) : null}
      </dl>
    </SectionCard>
  );
}

export function EndLeasingKeysReturnSection({
  caseData,
}: {
  caseData: TerminationCaseDetail;
}) {
  const applyCase = useEndLeasingStore((s) => s.applyCase);
  const [vacateDialogOpen, setVacateDialogOpen] = useState(false);
  const [keyReturnDialogOpen, setKeyReturnDialogOpen] = useState(false);

  const expectedVacate = endLeasingVacateDate(caseData) ?? '';
  const keyReturnDate = endLeasingKeyReturnDate(caseData);
  const keyReturnDateSet = Boolean(keyReturnDate);

  return (
    <>
      <SectionCard
        title="Keys return"
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              disabled={keyReturnDateSet}
              onClick={() => setKeyReturnDialogOpen(true)}
            >
              Set key return date
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => setVacateDialogOpen(true)}
            >
              Change vacate date
            </Button>
          </div>
        }
      >
        <dl className="grid gap-4 sm:grid-cols-2">
          <SummaryField label="Keys return date">
            {keyReturnDate ? formatDate(keyReturnDate) : 'Not set'}
          </SummaryField>
          <SummaryField label="Keys return address">{endLeasingKeyReturnTo(caseData)}</SummaryField>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground text-xs">
              {caseData.vacate.keysReturned
                ? 'Keys have been returned and recorded.'
                : 'Awaiting tenant key return.'}
            </p>
          </div>
        </dl>
      </SectionCard>

      <TerminationVacateDateDialog
        open={vacateDialogOpen}
        onOpenChange={setVacateDialogOpen}
        caseId={caseData.id}
        initialDate={expectedVacate.slice(0, 10)}
        onSaved={(updated) => {
          if (updated) applyCase(updated);
        }}
      />

      <TerminationKeyReturnDateDialog
        open={keyReturnDialogOpen}
        onOpenChange={setKeyReturnDialogOpen}
        caseId={caseData.id}
        initialDate={(keyReturnDate || expectedVacate).slice(0, 10)}
        keysReturned={caseData.vacate.keysReturned}
        onSaved={(updated) => {
          if (updated) applyCase(updated);
        }}
      />
    </>
  );
}
