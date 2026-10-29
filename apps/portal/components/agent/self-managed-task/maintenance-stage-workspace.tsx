'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Building2, Check, CircleCheck, CircleDashed, Inbox, Minus } from 'lucide-react';

import { SelfManagedMaintenancePanel } from '@/components/agent/maintenance-self-managed/self-managed-maintenance-panel';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyDetail } from '@/constants/routes';
import type { ApiMaintenanceAttachment, ApiQuotation } from '@/lib/crossub-api/types';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

const STAGE = {
  CREATED: 'created',
  REVIEW: 'review',
  QUOTE: 'quote',
  APPROVAL: 'approval',
  PROGRESS: 'progress',
  DONE: 'done',
} as const;

type Stage = (typeof STAGE)[keyof typeof STAGE];

const FULL_ORDER: Stage[] = [
  STAGE.CREATED,
  STAGE.REVIEW,
  STAGE.QUOTE,
  STAGE.APPROVAL,
  STAGE.PROGRESS,
  STAGE.DONE,
];

const DIRECT_ORDER: Stage[] = [STAGE.CREATED, STAGE.REVIEW, STAGE.PROGRESS, STAGE.DONE];

const LABEL: Record<Stage, string> = {
  created: 'Reported',
  review: 'Assessment',
  quote: 'Quotes',
  approval: 'Approval',
  progress: 'Work',
  done: 'Completed',
};

const SUBTITLE: Record<Stage, string> = {
  created: 'Case intake',
  review: 'AI assessment & routing',
  quote: 'Supplier quotes & comparison',
  approval: 'Approval & decision',
  progress: 'Job progress tracking',
  done: 'Completion & closure',
};

const HINT: Record<Stage, string> = {
  created: 'Request received and logged',
  review: 'AI classification and responsibility',
  quote: 'Quotes requested from suppliers',
  approval: 'Awaiting agent decision',
  progress: 'Booked and under way',
  done: 'Completed and closed',
};

const NUMBER: Record<Stage, number> = {
  created: 1,
  review: 2,
  quote: 3,
  approval: 4,
  progress: 5,
  done: 6,
};

const SOURCE_LABEL: Record<string, string> = {
  tenant_app: 'Tenant App',
  agent_submission: 'Agent Submission',
  email: 'Email',
  staff_portal: 'Staff Portal',
  system: 'System',
};

const PROGRESS_STEPS = [
  'Work order issued',
  'Accepted by contractor',
  'Scheduled',
  'On site',
  'Completed',
  'Invoice received',
] as const;

const CARD = 'rounded-xl border border-border bg-card p-4';

function contractorFlow(responsibility?: string | null): boolean {
  return responsibility !== 'tenant' && responsibility !== 'strata';
}

function resolveStage(status: string, flow: boolean): Stage {
  const value = status.toLowerCase();
  if (value === 'completed' || value === 'closed' || value === 'deleted' || value === 'cancelled') {
    return STAGE.DONE;
  }
  if (
    value === 'in_progress' ||
    value === 'pending_schedule' ||
    value === 'tenant_rejected' ||
    value === 'scheduled' ||
    value === 'invoiced'
  ) {
    return STAGE.PROGRESS;
  }
  if (value === 'pending_approval' || value === 'approved') {
    return flow ? STAGE.APPROVAL : STAGE.REVIEW;
  }
  if (value === 'pending_quotation' || value === 'quoting') {
    return flow ? STAGE.QUOTE : STAGE.REVIEW;
  }
  if (value === 'under_review') return STAGE.REVIEW;
  return STAGE.CREATED;
}

function stageState(stage: Stage, current: Stage, order: Stage[]): 'done' | 'active' | 'upcoming' {
  const stageIndex = order.indexOf(stage);
  const currentIndex = order.indexOf(current);
  if (stageIndex < 0 || currentIndex < 0) return 'upcoming';
  if (stage === current) return stage === STAGE.DONE ? 'done' : 'active';
  return stageIndex < currentIndex ? 'done' : 'upcoming';
}

function titleCase(value?: string | null): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll('_', ' ');
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className="min-w-0 truncate text-right text-sm">{value}</span>
    </div>
  );
}

function BoardHeading({ stage }: { stage: Stage }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-sm font-semibold text-emerald-800 tabular-nums dark:text-emerald-200">
        {NUMBER[stage]}
      </span>
      <div className="min-w-0">
        <h2 className="text-base font-semibold">{LABEL[stage]}</h2>
        <p className="text-muted-foreground text-xs">{SUBTITLE[stage]}</p>
      </div>
    </div>
  );
}

function EmptyBoard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
      <div className="bg-secondary/50 flex size-12 items-center justify-center rounded-full">
        <Inbox className="text-muted-foreground size-6" />
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{body}</p>
    </div>
  );
}

function supplierName(workspace: MaintenanceWorkspaceCase, contractorId: string, fallback?: string | null) {
  return (
    workspace.invitedContractors?.find((row) => row.id === contractorId)?.name ||
    fallback ||
    'Supplier'
  );
}

export function MaintenanceStageWorkspace({
  requestId,
  propertyId,
  onChanged,
  workspace,
  contractorName,
  recommendation,
  quoteExpiry,
  attachments,
  activity,
}: {
  requestId: string;
  propertyId: string;
  onChanged?: () => void;
  workspace: MaintenanceWorkspaceCase;
  contractorName?: string | null;
  recommendation?: string | null;
  quoteExpiry?: string | null;
  attachments: ApiMaintenanceAttachment[];
  activity: { id: string; at: string; title: string; actor?: string }[];
}) {
  const { properties } = useAgentData();
  const agencyId = properties.find((property) => property.id === propertyId)?.agencyId ?? null;
  const flow = contractorFlow(workspace.responsibility);
  const order = flow ? FULL_ORDER : DIRECT_ORDER;
  const current = resolveStage(workspace.status, flow);
  const [selected, setSelected] = useState<Stage>(current);

  useEffect(() => {
    setSelected(current);
  }, [current]);

  const photos = attachments.filter(
    (file) =>
      file.maintenanceRequestId === requestId &&
      file.kind === 'initial_evidence' &&
      Boolean(file.previewUrl),
  );
  const completionPhotos = attachments.filter(
    (file) =>
      file.maintenanceRequestId === requestId && file.kind === 'evidence' && Boolean(file.previewUrl),
  );
  const quotes = useMemo(
    () => [...workspace.quotations].sort((a, b) => a.price - b.price),
    [workspace.quotations],
  );
  const invited = workspace.invitedContractors?.length ?? workspace.invitedContractorIds?.length ?? 0;
  const received = quotes.length;
  const responsePct = invited > 0 ? Math.round((received / invited) * 100) : null;
  const approved = quotes.find((quote) => quote.status === 'approved') ?? quotes[0] ?? null;
  const workingName = approved
    ? supplierName(workspace, approved.contractorId, contractorName)
    : contractorName || 'Contractor';

  return (
    <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        {selected === STAGE.APPROVAL && !approved ? (
          <EmptyBoard
            title="No quote to approve yet"
            body="Quotes appear here once a supplier responds."
          />
        ) : (
          <BoardHeading stage={selected} />
        )}
        <StageBoard
          stage={selected}
          workspace={workspace}
          photos={photos}
          completionPhotos={completionPhotos}
          quotes={quotes}
          invited={invited}
          received={received}
          responsePct={responsePct}
          approved={approved}
          workingName={workingName}
          contractorName={contractorName}
          recommendation={recommendation}
          quoteExpiry={quoteExpiry}
          activity={activity}
        />
        {selected === current ? (
          <SelfManagedMaintenancePanel
            requestId={requestId}
            agencyId={agencyId}
            onChanged={onChanged}
            stage={selected}
          />
        ) : null}
      </div>
      <div className="min-w-0 space-y-4">
        <section className={CARD}>
          <h2 className="text-sm font-semibold">Timeline</h2>
          <ol className="mt-3">
            {order.map((stage, index) => {
              const state = stageState(stage, current, order);
              const last = index === order.length - 1;
              const active = stage === selected;
              const hint =
                stage === STAGE.QUOTE && invited > 0
                  ? `Quotes received (${received}/${invited})`
                  : stage === STAGE.DONE && current === STAGE.DONE
                    ? 'Completed and closed'
                    : HINT[stage];
              return (
                <li key={stage} className="relative flex gap-3 pb-4 last:pb-0">
                  <button
                    type="button"
                    onClick={() => setSelected(stage)}
                    aria-pressed={active}
                    aria-label={LABEL[stage]}
                    className={cn(
                      'absolute -inset-x-1.5 -top-1.5 bottom-1.5 z-20 rounded-lg border transition-colors',
                      active
                        ? 'border-emerald-500/50 bg-emerald-500/[0.06]'
                        : 'border-transparent hover:bg-muted/60',
                    )}
                  />
                  {!last ? (
                    <span
                      className={cn(
                        'absolute top-6 left-[11px] h-[calc(100%-1rem)] w-px',
                        state === 'done' ? 'bg-emerald-500' : 'bg-border',
                      )}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={cn(
                      'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums',
                      state === 'done' && 'border-emerald-500 bg-emerald-500 text-white',
                      state === 'active' && 'border-emerald-500 text-emerald-700 dark:text-emerald-300',
                      state === 'upcoming' && 'border-border bg-muted text-muted-foreground',
                    )}
                  >
                    {state === 'done' ? <Check className="size-3.5" /> : NUMBER[stage]}
                  </span>
                  <div className="relative z-10 min-w-0 flex-1">
                    <p className={cn('text-sm font-medium', state === 'upcoming' && 'text-muted-foreground')}>
                      {LABEL[stage]}
                    </p>
                    <p className="text-muted-foreground text-xs">{hint}</p>
                    {stage === STAGE.CREATED && workspace.createdAt ? (
                      <p className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
                        {formatDateTime(workspace.createdAt)}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        {propertyId ? (
          <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
            <Link href={propertyDetail(propertyId)}>
              <Building2 className="size-4" />
              View property
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function StageBoard({
  stage,
  workspace,
  photos,
  completionPhotos,
  quotes,
  invited,
  received,
  responsePct,
  approved,
  workingName,
  contractorName,
  recommendation,
  quoteExpiry,
  activity,
}: {
  stage: Stage;
  workspace: MaintenanceWorkspaceCase;
  photos: ApiMaintenanceAttachment[];
  completionPhotos: ApiMaintenanceAttachment[];
  quotes: ApiQuotation[];
  invited: number;
  received: number;
  responsePct: number | null;
  approved: ApiQuotation | null;
  workingName: string;
  contractorName?: string | null;
  recommendation?: string | null;
  quoteExpiry?: string | null;
  activity: { id: string; at: string; title: string; actor?: string }[];
}) {
  if (stage === STAGE.CREATED) {
    return (
      <>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={CARD}>
            <h3 className="text-sm font-semibold">Issue Details</h3>
            <div className="divide-border mt-2 divide-y">
              <Field label="Issue" value={workspace.issueType || '—'} />
              <Field label="Reported by" value={workspace.agent?.name || 'CROSSUB'} />
              <Field label="Reported on" value={workspace.createdAt ? formatDateTime(workspace.createdAt) : '—'} />
              <Field label="Channel" value={SOURCE_LABEL[workspace.source] ?? titleCase(workspace.source)} />
            </div>
            {workspace.description ? (
              <p className="text-muted-foreground mt-2 border-t pt-2 text-xs leading-relaxed">
                {workspace.description}
              </p>
            ) : null}
          </section>
          <PhotoCard title="Photos / Videos" files={photos} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <AssessmentCard workspace={workspace} />
          <PropertyCard workspace={workspace} />
        </div>
      </>
    );
  }

  if (stage === STAGE.REVIEW) {
    return (
      <section className={CARD}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">AI Assessment</h3>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-800 uppercase dark:text-emerald-200">
            Auto assessment
          </span>
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <AssessmentFields workspace={workspace} />
          {recommendation ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] p-3">
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">AI Recommendation</p>
              <p className="mt-1.5 text-sm">{recommendation}</p>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  if (stage === STAGE.QUOTE) {
    return (
      <>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile value={String(invited)} label="Invited" />
          <StatTile value={String(received)} label="Quotes received" />
          <StatTile value={responsePct != null ? `${responsePct}%` : '—'} label="Response rate" />
        </div>
        {quotes.length === 0 && invited === 0 ? (
          <EmptyBoard
            title="No suppliers invited yet"
            body="Invite contractors from Quick Actions to start collecting quotes."
          />
        ) : (
          <div className="space-y-3">
            {(workspace.invitedContractors ?? []).map((contractor) => {
              const quote = quotes.find((row) => row.contractorId === contractor.id);
              return (
                <QuoteRow
                  key={contractor.id}
                  name={contractor.name}
                  quote={quote}
                  quoteExpiry={quoteExpiry}
                />
              );
            })}
            {quotes
              .filter(
                (quote) =>
                  !(workspace.invitedContractors ?? []).some((row) => row.id === quote.contractorId),
              )
              .map((quote) => (
                <QuoteRow
                  key={quote.id}
                  name={supplierName(workspace, quote.contractorId, contractorName)}
                  quote={quote}
                  quoteExpiry={quoteExpiry}
                />
              ))}
          </div>
        )}
      </>
    );
  }

  if (stage === STAGE.APPROVAL) {
    if (!approved) return null;
    return (
      <section className={CARD}>
        <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">Selected quote</p>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {supplierName(workspace, approved.contractorId, contractorName)}
            </p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              Responded {formatDateTime(approved.submittedAt)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-semibold tabular-nums">{formatCurrency(approved.price)}</p>
            <p className="text-muted-foreground text-xs">inc. GST</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <Fact label="Availability" value={approved.availableSchedule || '—'} />
          <Fact label="Duration" value="—" />
          <Fact label="Warranty" value="—" />
          <Fact label="Quote valid until" value={quoteExpiry ? formatDateTime(quoteExpiry) : '—'} />
        </div>
        {approved.scope ? <p className="text-muted-foreground mt-3 text-xs">{approved.scope}</p> : null}
        <p className="text-muted-foreground mt-3 text-xs">
          {workspace.agentApprovalReceived ? 'Agent approved' : 'Awaiting agent decision'}
        </p>
      </section>
    );
  }

  if (stage === STAGE.PROGRESS) {
    const statusLabel =
      workspace.status === 'pending_schedule'
        ? 'Awaiting schedule'
        : workspace.status === 'in_progress'
          ? 'In progress'
          : titleCase(workspace.status);
    const progressIndex = completionPhotos.length
      ? 4
      : workspace.invoiceUploaded
        ? 5
        : workspace.assignedContractorId
          ? 0
          : -1;
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="space-y-4">
          <section className={CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{workingName}</p>
                <p className="text-muted-foreground truncate text-xs tabular-nums">
                  Work order: {workspace.caseRef}
                </p>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
                {statusLabel}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <Fact
                label="Scheduled date"
                value={workspace.scheduledVisitAt ? formatDateTime(workspace.scheduledVisitAt) : 'Not scheduled'}
              />
              <Fact label="Time window" value={workspace.visitWindow || '—'} />
              <Fact label="Status" value={statusLabel} />
              <Fact label="Tenant confirmed" value={workspace.tenantApprovalReceived ? 'Yes' : 'Pending'} />
            </div>
            <ol className="mt-4 flex gap-2 overflow-x-auto">
              {PROGRESS_STEPS.map((label, index) => {
                const done = progressIndex >= 0 && index < progressIndex;
                const currentStep = index === progressIndex;
                return (
                  <li
                    key={label}
                    className={cn(
                      'shrink-0 text-[11px] font-medium',
                      done || currentStep ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {done ? '✓ ' : currentStep ? '● ' : ''}
                    {label}
                  </li>
                );
              })}
            </ol>
          </section>
          <section className={CARD}>
            <p className="text-sm font-semibold">Activity timeline</p>
            {activity.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-xs">No activity yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {activity.slice(0, 8).map((entry) => (
                  <li key={entry.id}>
                    <p className="text-sm">{entry.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(entry.at)}
                      {entry.actor ? ` · ${entry.actor}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <section className={CARD}>
          <p className="text-sm font-semibold">Job information</p>
          <div className="mt-3 space-y-2">
            <Field label="Issue" value={workspace.issueType || '—'} />
            <Field label="Property" value={workspace.address || '—'} />
            <Field label="Tenant" value={workspace.tenant?.name || '—'} />
            <Field label="Priority" value={titleCase(workspace.priority)} />
          </div>
        </section>
      </div>
    );
  }

  const approvedAmount = approved?.price ?? null;
  const invoiceAmount = workspace.contractorInvoiceAmount ?? null;
  const difference =
    approvedAmount != null && invoiceAmount != null ? invoiceAmount - approvedAmount : null;
  // A job closed by the officer (handled outside the system, cancelled) has no work, photos or
  // invoice on file; say it was closed rather than completed.
  const workRecorded =
    Boolean(workspace.completionEvidenceUploaded) || completionPhotos.length > 0 || Boolean(workspace.invoiceUploaded);
  return (
    <>
      <section
        className={cn(
          'rounded-xl border p-4',
          workRecorded ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-border bg-muted/30',
        )}
      >
        <div className="flex items-center gap-2">
          {workRecorded ? (
            <CircleCheck className="size-5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <CircleDashed className="text-muted-foreground size-5" />
          )}
          <div>
            <p className="text-sm font-semibold">{workRecorded ? 'Job completed successfully' : 'Job closed'}</p>
            {workspace.status === 'completed' || workspace.status === 'closed' ? (
              <p className="text-muted-foreground text-xs">
                {workRecorded ? 'Completed and closed' : 'Closed without completion photos or an invoice on file'}
              </p>
            ) : null}
          </div>
        </div>
        <ul className="mt-3 divide-y divide-emerald-500/20">
          <CheckRow label="Work completed by contractor" done={Boolean(workspace.completionEvidenceUploaded)} />
          <CheckRow label="Completion photos received" done={completionPhotos.length > 0} />
          <CheckRow label="Invoice received and matched" done={Boolean(workspace.invoiceUploaded)} />
          <CheckRow label="Tenant notified" done={Boolean(workspace.tenantApprovalReceived)} />
          <CheckRow label="Warranty recorded" done={false} />
          <CheckRow label="No outstanding actions" done={workspace.status === 'completed' || workspace.status === 'closed'} />
        </ul>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={CARD}>
          <h3 className="text-sm font-semibold">Financial Summary</h3>
          <div className="divide-border mt-2 divide-y">
            <Field label="Approved amount" value={approvedAmount != null ? formatCurrency(approvedAmount) : '—'} />
            <Field label="Invoice amount" value={invoiceAmount != null ? formatCurrency(invoiceAmount) : '—'} />
            <Field label="Difference" value={difference != null ? formatCurrency(difference) : '—'} />
            <Field label="Status" value={workspace.invoiceUploaded ? 'Recorded' : 'Pending'} />
          </div>
        </section>
        <PhotoCard title="Completion Photos" files={completionPhotos} />
      </div>
    </>
  );
}

function AssessmentCard({ workspace }: { workspace: MaintenanceWorkspaceCase }) {
  return (
    <section className={CARD}>
      <h3 className="text-sm font-semibold">AI Preliminary Assessment</h3>
      <AssessmentFields workspace={workspace} />
    </section>
  );
}

function AssessmentFields({ workspace }: { workspace: MaintenanceWorkspaceCase }) {
  return (
    <div className="divide-border divide-y">
      <div className="flex items-center justify-between gap-2 py-1.5">
        <span className="text-muted-foreground text-xs">Issue type</span>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200">
          {workspace.issueType || '—'}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 py-1.5">
        <span className="text-muted-foreground text-xs">Trade</span>
        <span className="text-sm">{workspace.issueType || 'Not classified'}</span>
      </div>
      <div className="flex items-center justify-between gap-2 py-1.5">
        <span className="text-muted-foreground text-xs">Responsibility</span>
        <span className="text-sm">{titleCase(workspace.responsibility)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 py-1.5">
        <span className="text-muted-foreground text-xs">Urgency</span>
        <span className="text-sm">{titleCase(workspace.priority)}</span>
      </div>
      <div className="flex items-center justify-between gap-2 py-1.5">
        <span className="text-muted-foreground text-xs">Confidence</span>
        <span className="text-xs font-medium tabular-nums">—</span>
      </div>
    </div>
  );
}

function PropertyCard({ workspace }: { workspace: MaintenanceWorkspaceCase }) {
  return (
    <section className={CARD}>
      <h3 className="text-sm font-semibold">Property &amp; Tenancy</h3>
      <div className="divide-border mt-2 divide-y">
        <Field label="Address" value={workspace.address || '—'} />
        <Field label="Tenant" value={workspace.tenant?.name || 'No tenant on file'} />
        {workspace.buildingName ? <Field label="Building" value={workspace.buildingName} /> : null}
      </div>
    </section>
  );
}

function PhotoCard({ title, files }: { title: string; files: ApiMaintenanceAttachment[] }) {
  return (
    <section className={CARD}>
      <h3 className="text-sm font-semibold">
        {title} — <span className="tabular-nums">{files.length}</span> item{files.length === 1 ? '' : 's'}
      </h3>
      {files.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-xs">No photos on file.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {files.slice(0, 6).map((file) => (
            <li key={file.id} className="bg-muted aspect-square overflow-hidden rounded-lg">
              {file.previewUrl && file.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={file.previewUrl} alt={file.fileName} className="size-full object-cover" />
              ) : (
                <span className="text-muted-foreground flex size-full items-center p-1 text-center text-[10px]">
                  {file.fileName}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className={CARD}>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-muted-foreground mt-0.5 truncate text-xs">{label}</p>
    </div>
  );
}

function QuoteRow({
  name,
  quote,
  quoteExpiry,
}: {
  name: string;
  quote?: ApiQuotation;
  quoteExpiry?: string | null;
}) {
  return (
    <section className={`${CARD} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {quote ? `Responded ${formatDateTime(quote.submittedAt)}` : 'Awaiting quote'}
        </p>
        {quote?.scope ? <p className="text-muted-foreground mt-1 text-xs">{quote.scope}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{quote ? formatCurrency(quote.price) : '—'}</p>
        <p className="text-muted-foreground text-[11px]">
          {quote ? titleCase(quote.status) : quoteExpiry ? `Valid until ${formatDateTime(quoteExpiry)}` : 'Pending'}
        </p>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg border px-2.5 py-2">
      <p className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</p>
      <p className="mt-0.5 truncate font-medium tabular-nums">{value}</p>
    </div>
  );
}

function CheckRow({ label, done }: { label: string; done: boolean }) {
  return (
    <li className={cn('flex items-center gap-2 py-1.5 text-sm', !done && 'text-muted-foreground')}>
      {done ? (
        <Check className="size-4 shrink-0 text-emerald-600" />
      ) : (
        <Minus className="text-muted-foreground/60 size-4 shrink-0" />
      )}
      <span className="flex-1">{label}</span>
      {done ? null : <span className="text-xs">Not recorded</span>}
    </li>
  );
}
