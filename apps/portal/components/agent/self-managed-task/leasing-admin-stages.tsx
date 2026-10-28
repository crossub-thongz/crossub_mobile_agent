'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  FileText,
  KeyRound,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { JobCaseStageEmailHistory } from '@/components/agent/job-case-email-log';
import { LeasingKeyCollectionSchedule } from '@/components/leasing-workflow/leasing-key-collection-schedule';
import { LeasingSelfManagedCreateTenancy } from '@/components/leasing-workflow/leasing-self-managed-create-tenancy';
import { LeasingStepApplicationApproval } from '@/components/leasing-workflow/leasing-step-application-approval';
import { LeasingStepOnboarding } from '@/components/leasing-workflow/leasing-step-onboarding';
import { LeasingStepOpenInspection } from '@/components/leasing-workflow/leasing-step-open-inspection';
import { StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import {
  LeasingSelfManagedTenancySummary,
} from '@/components/leasing-workflow/leasing-self-managed-tenancy-summary';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useOpenInspectionEmailSources } from '@/hooks/use-open-inspection-email-sources';
import { LEASING_KEY_CUSTODY_LABEL, LEASING_ITEM_STATUS, LEASING_LIFECYCLE_STEP } from '@/lib/leasing/constants';
import { deriveStepStatus, getApprovedApplications } from '@/lib/leasing/lifecycle';
import { enrichLeasingEmailRecords } from '@/lib/leasing/agent-workflow-email';
import { leasingStageEmailsWithOpenSupplement } from '@/lib/open-inspection/linked-case-history';
import { resolveRentReviewAgentEmail } from '@/lib/rent-review/agent-email';
import { hasApprovedApplicant } from '@/lib/leasing/self-managed-tenancy';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { cn, formatCurrency, formatDate, formatDateTime } from '@/lib/utils';

const CARD = {
  OPEN: 'open_inspection',
  APPS: 'applications',
  SETUP: 'onboarding',
  KEYS: 'key_handover',
} as const;

type CardId = (typeof CARD)[keyof typeof CARD];

const ORDER: CardId[] = [CARD.OPEN, CARD.APPS, CARD.SETUP, CARD.KEYS];

const TITLE: Record<CardId, string> = {
  open_inspection: 'Open inspection scheduler',
  applications: 'Applications',
  onboarding: 'Lease Setup',
  key_handover: 'Tenant key collection',
};

const ICON: Record<CardId, LucideIcon> = {
  open_inspection: CalendarDays,
  applications: FileText,
  onboarding: Users,
  key_handover: KeyRound,
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Timeline' },
  { id: 'communication', label: 'Activities' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const SIGNING_LABEL = {
  not_sent: 'Not sent',
  sent: 'Sent for signing',
  viewed: 'Viewed',
  signed: 'Signed',
} as const;

function done(status: string | undefined): boolean {
  return status === LEASING_ITEM_STATUS.DONE;
}

function join(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

function currentCard(detail: LeasingPropertyDetail): CardId {
  const openDone = done(deriveStepStatus(detail, LEASING_LIFECYCLE_STEP.OPEN_INSPECTION));
  const reportDone =
    done(deriveStepStatus(detail, LEASING_LIFECYCLE_STEP.OPEN_REPORT)) || detail.openReport.sentToAgent;
  if (!(openDone && reportDone)) return CARD.OPEN;
  if (
    !detail.tenancyRecordedByAgency &&
    !done(deriveStepStatus(detail, LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL))
  ) {
    return CARD.APPS;
  }
  if (detail.mainStatus === 'key_handover' || done(detail.onboarding.keyCollection.status)) return CARD.KEYS;
  return CARD.SETUP;
}

/**
 * The admin letting workspace: Overview, Timeline, and Activities, with the four stage cards.
 */
export function SelfManagedLeasingStages({
  detail,
  leasingCycleId,
  onOpenInspectionCreated,
}: {
  detail: LeasingPropertyDetail;
  leasingCycleId?: string;
  onOpenInspectionCreated?: (inspectionId: string) => void;
}) {
  const current = currentCard(detail);
  const [tab, setTab] = useState<TabId>('overview');
  const [expanded, setExpanded] = useState<CardId | null>(current);
  const [setupOpen, setSetupOpen] = useState(false);
  const approved = getApprovedApplications(detail);
  const keysStarted = Boolean(detail.onboarding.keyCollection.time) || done(detail.onboarding.keyCollection.status);
  const late =
    current === CARD.SETUP ||
    current === CARD.KEYS ||
    approved.length > 0 ||
    Boolean(detail.tenancyRecordedByAgency) ||
    keysStarted;
  const cards = late ? ORDER : ORDER.filter((id) => id === CARD.OPEN || id === CARD.APPS);

  return (
    <div className="min-w-0">
      <div role="tablist" aria-label="Task sections" className="border-border flex items-center gap-1 border-b">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              '-mb-px border-b-2 px-4 pt-1 pb-2.5 text-sm transition-colors',
              tab === item.id
                ? 'border-violet-600 font-medium text-violet-700 dark:border-violet-400 dark:text-violet-300'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tab === 'activity' ? <ActivityList detail={detail} /> : null}
        {tab === 'communication' ? <ActivitiesMail detail={detail} /> : null}
        {tab === 'overview' ? (
          <div className="space-y-2.5">
            {cards.map((id) => (
              <StageCard
                key={id}
                id={id}
                detail={detail}
                current={current}
                expanded={expanded === id}
                onToggle={() => setExpanded((prev) => (prev === id ? null : id))}
                leasingCycleId={leasingCycleId}
                onOpenInspectionCreated={onOpenInspectionCreated}
                setupOpen={setupOpen}
                onSetupToggle={() => setSetupOpen((open) => !open)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StageCard({
  id,
  detail,
  current,
  expanded,
  onToggle,
  leasingCycleId,
  onOpenInspectionCreated,
  setupOpen,
  onSetupToggle,
}: {
  id: CardId;
  detail: LeasingPropertyDetail;
  current: CardId;
  expanded: boolean;
  onToggle: () => void;
  leasingCycleId?: string;
  onOpenInspectionCreated?: (inspectionId: string) => void;
  setupOpen: boolean;
  onSetupToggle: () => void;
}) {
  const state = cardState(id, detail, current);
  const Icon = ICON[id];
  const summary = cardSummary(id, detail);
  const highlight = state === 'in_progress' && expanded;
  const items = id === CARD.SETUP ? setupItems(detail) : [];
  const doneCount = items.filter((item) => item.done).length;
  return (
    <section className={cn('bg-card overflow-hidden rounded-xl border', highlight ? 'border-violet-500/30' : 'border-border')}>
      <div className={cn('flex items-center gap-3 px-4 py-3', highlight && 'bg-violet-500/[0.06]')}>
        <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {state === 'done' ? (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            </span>
          ) : (
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-full',
                state === 'in_progress' ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300' : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="size-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[14px] font-semibold">{TITLE[id]}</h3>
              {state !== 'in_progress' && state !== 'not_started' ? <StatePill state={state} /> : null}
            </div>
            <p className="text-muted-foreground mt-0.5 truncate text-[12px]">
              {state === 'in_progress' ? `In progress · ${summary}` : summary}
            </p>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          {state === 'in_progress' && items.length > 0 ? (
            <span className="text-[13px] font-medium text-violet-700 tabular-nums dark:text-violet-300">
              {Math.round((doneCount / items.length) * 100)}%
            </span>
          ) : null}
          {state === 'not_started' ? <StatePill state={state} /> : null}
          <button
            type="button"
            onClick={onToggle}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1"
          >
            <ChevronDown className={cn('size-4 transition-transform', expanded ? 'rotate-180' : '-rotate-90')} />
          </button>
        </div>
      </div>
      {expanded ? (
        <div className="border-border/60 border-t px-4 py-3.5">
          {id === CARD.OPEN ? (
            <LeasingStepOpenInspection
              detail={detail}
              leasingCycleId={leasingCycleId}
              onOpenInspectionCreated={onOpenInspectionCreated}
            />
          ) : null}
          {id === CARD.APPS ? (
            (detail.applicationsDetail?.length ?? 0) > 0 ? (
              <LeasingStepApplicationApproval detail={detail} />
            ) : detail.tenancyRecordedByAgency ? null : (
              <LeasingSelfManagedCreateTenancy detail={detail} cycleId={leasingCycleId} />
            )
          ) : null}
          {id === CARD.SETUP ? (
            <div className="space-y-3">
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label} className="grid grid-cols-1 items-center gap-x-4 text-[13px] sm:grid-cols-[13rem_minmax(0,1fr)]">
                    <span className="flex min-w-0 items-center gap-2.5">
                      {item.done ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="border-border size-5 shrink-0 rounded-full border-2" />
                      )}
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="text-muted-foreground pl-7 sm:pl-0">{item.value}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onSetupToggle}
                className="text-xs font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300"
              >
                {setupOpen ? 'Hide Lease Setup details' : 'Work Lease Setup'}
              </button>
              {setupOpen ? (
                detail.tenancyRecordedByAgency ? (
                  <LeasingSelfManagedTenancySummary detail={detail} showNextSteps />
                ) : hasApprovedApplicant(detail) ? (
                  <LeasingStepOnboarding detail={detail} />
                ) : null
              ) : null}
            </div>
          ) : null}
          {id === CARD.KEYS ? <KeyBody detail={detail} leasingCycleId={leasingCycleId} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function cardState(id: CardId, detail: LeasingPropertyDetail, current: CardId): 'done' | 'in_progress' | 'not_started' {
  if (id === CARD.KEYS && done(detail.onboarding.keyCollection.status)) return 'done';
  if (id === CARD.SETUP && done(deriveStepStatus(detail, LEASING_LIFECYCLE_STEP.ONBOARDING))) return 'done';
  if (id === CARD.OPEN) {
    const openDone = done(deriveStepStatus(detail, LEASING_LIFECYCLE_STEP.OPEN_INSPECTION));
    const reportDone =
      done(deriveStepStatus(detail, LEASING_LIFECYCLE_STEP.OPEN_REPORT)) || detail.openReport.sentToAgent;
    if (openDone && reportDone) return 'done';
  }
  if (
    id === CARD.APPS &&
    (detail.tenancyRecordedByAgency ||
      done(deriveStepStatus(detail, LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL)))
  ) {
    return 'done';
  }
  if (id === current) return 'in_progress';
  return ORDER.indexOf(id) < ORDER.indexOf(current) ? 'done' : 'not_started';
}

function cardSummary(id: CardId, detail: LeasingPropertyDetail): string {
  if (id === CARD.OPEN) {
    const when = detail.openInspection.timeProvisional ? null : detail.openInspection.scheduledTime;
    return join([
      detail.openInspection.agentConducted ? 'Run by agent' : when ? formatDate(when) : 'Not scheduled',
      detail.openReport.attendeeCount != null ? `${detail.openReport.attendeeCount} attended` : null,
      detail.openReport.sentToAgent ? 'Report sent to agent' : null,
    ]);
  }
  if (id === CARD.APPS) {
    const apps = detail.applicationsDetail ?? [];
    const chosen = getApprovedApplications(detail)[0];
    if (detail.tenancyRecordedByAgency && apps.length === 0) return 'Agent nominated the tenant';
    if (apps.length === 0) return 'No applications yet';
    return join([
      `${apps.length} application${apps.length === 1 ? '' : 's'}`,
      chosen ? `Approved ${chosen.applicant}` : null,
    ]);
  }
  if (id === CARD.SETUP) {
    const items = setupItems(detail);
    const finished = items.filter((item) => item.done).length;
    return `${finished} of ${items.length} completed`;
  }
  const keys = detail.onboarding.keyCollection;
  if (done(keys.status)) return 'Keys collected';
  if (keys.time) return join([`Scheduled ${formatDateTime(keys.time)}`, keys.location]);
  return 'Not started';
}

function setupItems(detail: LeasingPropertyDetail) {
  const onboarding = detail.onboarding;
  const depositDone = done(onboarding.deposit.status);
  const bondDone = done(onboarding.bond.status);
  const agreementDone = done(onboarding.agreement.status);
  const entryDone = done(onboarding.ingoingInspection.status);
  const approvalDone = done(onboarding.ingoingReportApproval.status);
  return [
    {
      label: 'Holding deposit received',
      done: depositDone,
      value: depositDone
        ? join([
            onboarding.deposit.amount != null ? formatCurrency(onboarding.deposit.amount) : null,
            onboarding.deposit.paidAt ? `Received ${formatDate(onboarding.deposit.paidAt)}` : 'Received',
          ])
        : join(['Pending', onboarding.deposit.amount != null ? formatCurrency(onboarding.deposit.amount) : null]),
    },
    {
      label: 'Bond lodged',
      done: bondDone,
      value: bondDone
        ? join([
            onboarding.bond.amount != null ? formatCurrency(onboarding.bond.amount) : null,
            onboarding.bond.paidAt ? `Lodged ${formatDate(onboarding.bond.paidAt)}` : 'Lodged',
          ])
        : 'Pending',
    },
    {
      label: 'Agreement signed',
      done: agreementDone,
      value: agreementDone ? 'Signed' : SIGNING_LABEL[onboarding.agreement.signingStatus],
    },
    {
      label: 'Entry inspection',
      done: entryDone,
      value: entryDone
        ? 'Completed'
        : join([
            'Pending',
            onboarding.ingoingInspection.scheduledTime
              ? `Due ${formatDate(onboarding.ingoingInspection.scheduledTime)}`
              : null,
          ]),
    },
    {
      label: 'Tenant approved entry report',
      done: approvalDone,
      value: approvalDone ? 'Completed' : 'Pending',
    },
  ];
}

function StatePill({ state }: { state: 'done' | 'in_progress' | 'not_started' }) {
  const label = state === 'done' ? 'Completed' : state === 'in_progress' ? 'In progress' : 'Not started';
  const dot = state === 'done' ? 'bg-emerald-500' : state === 'in_progress' ? 'bg-violet-500' : 'bg-muted-foreground/50';
  const pill =
    state === 'done'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
      : state === 'in_progress'
        ? 'border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-200'
        : 'border-border bg-muted/50 text-muted-foreground';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium', pill)}>
      <span className={cn('size-1.5 rounded-full', dot)} />
      {label}
    </span>
  );
}

function KeyBody({ detail, leasingCycleId }: { detail: LeasingPropertyDetail; leasingCycleId?: string }) {
  const keys = detail.onboarding.keyCollection;
  const proof = (keys.photos?.length ?? 0) > 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StepFact label="Time" value={keys.time ? formatDateTime(keys.time) : 'TBD'} />
        <StepFact label="Location" value={keys.location ?? 'TBD'} />
        <StepFact label="Keys held by" value={LEASING_KEY_CUSTODY_LABEL[detail.agentInfo.keyCustody]} />
      </div>
      {proof ? (
        <p className="text-muted-foreground text-xs">
          {done(keys.status)
            ? 'Key collection complete — tenant collected keys and submitted photo proof.'
            : 'Tenant has submitted key collection proof — schedule is locked.'}
        </p>
      ) : (
        <LeasingKeyCollectionSchedule detail={detail} cycleId={leasingCycleId} />
      )}
    </div>
  );
}

function ActivityList({ detail }: { detail: LeasingPropertyDetail }) {
  const events = [...detail.timeline].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <section className="rounded-xl border bg-card p-4">
      {events.length === 0 ? (
        <p className="text-muted-foreground text-xs">No activity yet.</p>
      ) : (
        <ol className="relative space-y-3 border-l pl-4">
          {events.map((event, index) => (
            <li key={event.id} className="relative">
              <span
                className={cn(
                  'absolute top-1.5 -left-[21px] inline-flex size-2 rounded-full',
                  index === 0 ? 'bg-violet-500 ring-2 ring-violet-400/30' : 'bg-muted-foreground/40',
                )}
              />
              <p className="text-[13px] leading-snug">{event.label}</p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {[formatDateTime(event.at), event.actor].filter(Boolean).join(' · ')}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function ActivitiesMail({ detail }: { detail: LeasingPropertyDetail }) {
  const { properties, agencies, apiConnected } = useAgentData();
  const { user } = useAuth();
  const property = properties.find((row) => row.id === detail.propertyId);
  const agency = agencies.find((row) => row.id === property?.agencyId);
  const agentEmail = resolveRentReviewAgentEmail({
    userEmail: user?.email,
    agencyContactEmail: agency?.contactEmail ?? detail.agentInfo.email,
  });
  const { openSession, poolInspectionRecord } = useOpenInspectionEmailSources({
    enabled: !detail.openInspection.agentConducted,
    apiConnected,
    leasingDetail: detail,
    poll: true,
  });
  const emails = useMemo(
    () =>
      enrichLeasingEmailRecords(
        leasingStageEmailsWithOpenSupplement({
          detail,
          step: LEASING_LIFECYCLE_STEP.ONBOARDING,
          openSession,
          poolInspectionRecord,
        }),
        agentEmail,
        detail.agentInfo.name,
      ),
    [agentEmail, detail, openSession, poolInspectionRecord],
  );
  return (
    <section className="rounded-xl border bg-card p-4">
      <JobCaseStageEmailHistory emails={emails} collapsible={false} defaultOpen title="All email" />
    </section>
  );
}
