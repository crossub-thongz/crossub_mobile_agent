'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Mail, Phone, UserCheck } from 'lucide-react';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import {
  WorkflowProgressRail,
  resolveWorkflowStepState,
} from '@/components/agent/workflow-progress-rail';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { enrichLeasingEmailRecords, leasingEmailRecordsForStep } from '@/lib/leasing/agent-workflow-email';
import { LEASING_LIFECYCLE_STEP } from '@/lib/leasing/constants';
import {
  AGREEMENT_PHASE_LABEL,
  AGREEMENT_PHASE_ORDER,
  confirmedLeaseTerms,
  deriveAgreementPhase,
  onboardingAuditEntries,
  paymentConfirmationLabel,
  resolveOnboardingTenant,
} from '@/lib/leasing/onboarding-display';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { resolveRentReviewAgentEmail } from '@/lib/rent-review/agent-email';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

export function LeasingOnboardingSummaryPanel({ detail }: { detail: LeasingPropertyDetail }) {
  const { properties, agencies } = useAgentData();
  const { user } = useAuth();
  const [auditExpanded, setAuditExpanded] = useState(false);

  const tenant = resolveOnboardingTenant(detail);
  const lease = confirmedLeaseTerms(detail);
  const agreementPhase = deriveAgreementPhase(detail.onboarding.agreement);
  const depositLabel = paymentConfirmationLabel({
    kind: 'deposit',
    status: detail.onboarding.deposit.status,
    timeline: detail.timeline,
    ledgerEntryId: detail.onboarding.deposit.ledgerEntryId,
  });
  const bondLabel = paymentConfirmationLabel({
    kind: 'bond',
    status: detail.onboarding.bond.status,
    timeline: detail.timeline,
    ledgerEntryId: detail.onboarding.bond.ledgerEntryId,
  });

  const property = properties.find((p) => p.id === detail.propertyId);
  const agency = agencies.find((a) => a.id === property?.agencyId);
  const agentEmail = resolveRentReviewAgentEmail({
    userEmail: user?.email,
    agencyContactEmail: agency?.contactEmail ?? detail.agentInfo.email,
  });

  const stageEmails = useMemo(() => {
    const records = leasingEmailRecordsForStep(detail, LEASING_LIFECYCLE_STEP.ONBOARDING);
    if (!tenant?.email) return records;
    const email = tenant.email.trim().toLowerCase();
    return records.filter(
      (record) => !record.toEmail || record.toEmail.trim().toLowerCase() === email,
    );
  }, [detail, tenant?.email]);

  const auditEntries = useMemo(() => onboardingAuditEntries(detail), [detail]);

  if (!tenant) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-5 text-center">
        <p className="text-sm font-medium">No confirmed tenant yet</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Approve an applicant in Reference Check to begin onboarding.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-card px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="bg-secondary flex size-10 shrink-0 items-center justify-center rounded-full">
            <UserCheck className="text-muted-foreground size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Confirmed tenant
            </p>
            <p className="mt-0.5 text-sm font-semibold">{tenant.applicant}</p>
            <div className="text-muted-foreground mt-2 space-y-1 text-[11.5px]">
              {tenant.email ? (
                <p className="flex items-center gap-1.5">
                  <Mail className="size-3.5 shrink-0" />
                  <span className="truncate">{tenant.email}</span>
                </p>
              ) : null}
              {tenant.phone ? (
                <p className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" />
                  <span>{tenant.phone}</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-[10px] uppercase tracking-wide">Rent / week</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {lease.weeklyRent != null ? `${formatCurrency(lease.weeklyRent)}/wk` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] uppercase tracking-wide">Lease start</dt>
            <dd className="mt-0.5 font-medium">
              {lease.startDate ? formatDate(lease.startDate) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-[10px] uppercase tracking-wide">Lease term</dt>
            <dd className="mt-0.5 font-medium">{lease.leaseTerm ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border bg-card px-3 py-3">
        <p className="text-muted-foreground mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide">
          Agreement status
        </p>
        <WorkflowProgressRail
          steps={AGREEMENT_PHASE_ORDER}
          labels={AGREEMENT_PHASE_LABEL}
          currentStep={agreementPhase}
          progressFillIndex={AGREEMENT_PHASE_ORDER.indexOf(agreementPhase)}
          getStepState={(step) => {
            const stepIndex = AGREEMENT_PHASE_ORDER.indexOf(step);
            const currentIndex = AGREEMENT_PHASE_ORDER.indexOf(agreementPhase);
            const isDone = stepIndex < currentIndex;
            const isViewing = step === agreementPhase;
            return resolveWorkflowStepState(isDone, isViewing);
          }}
          isStepCompleted={(step) =>
            AGREEMENT_PHASE_ORDER.indexOf(step) < AGREEMENT_PHASE_ORDER.indexOf(agreementPhase)
          }
          isStepEnabled={() => false}
          size="compact"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <StatusCard title="Bond status" value={bondLabel} />
        <StatusCard title="Deposit status" value={depositLabel} />
      </section>

      <JobCaseStageEmailHistory
        emails={enrichLeasingEmailRecords(stageEmails, agentEmail)}
        title="Email history"
      />

      <div className="rounded-xl border">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
          onClick={() => setAuditExpanded((value) => !value)}
          aria-expanded={auditExpanded}
        >
          <span className="text-sm font-medium">Audit</span>
          <span className="text-muted-foreground flex items-center gap-2 text-[11px]">
            {auditEntries.length} event{auditEntries.length === 1 ? '' : 's'}
            <ChevronDown
              className={cn('size-4 transition-transform', auditExpanded && 'rotate-180')}
            />
          </span>
        </button>
        {auditExpanded ? (
          <ul className="divide-y border-t px-3 py-1">
            {auditEntries.length === 0 ? (
              <li className="text-muted-foreground py-3 text-xs">No onboarding audit events yet.</li>
            ) : (
              auditEntries.map((entry) => (
                <li key={entry.id} className="py-2.5 text-xs">
                  <p className="font-medium">{entry.label}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {entry.actor} · {formatDateTime(entry.at)}
                  </p>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function StatusCard({ title, value }: { title: string; value: string }) {
  const paid = value.startsWith('Paid');
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">{title}</p>
      <p
        className={cn(
          'mt-1 text-sm font-medium',
          paid ? 'text-emerald-700 dark:text-emerald-400' : undefined,
        )}
      >
        {value}
      </p>
    </div>
  );
}
