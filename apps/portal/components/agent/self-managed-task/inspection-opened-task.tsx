'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ArrowRight, Building2, CalendarClock, Check, Copy, GitBranch, Home, Mail, Phone, User, Users } from 'lucide-react';

import {
  AdminSideCard,
  AdminTabStrip,
  TaskBreadcrumb,
  TaskLocality,
  TaskMetaChip,
  TaskStatusPill,
} from '@/components/agent/self-managed-task/admin-task-chrome';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { INSPECTION_TYPE_LABEL } from '@/lib/inspections/presentation';
import { ROUTES, propertyDetail } from '@/constants/routes';
import { useAgencyTeamMembers } from '@/hooks/use-agency-team-members';
import { useSelfManagedInspection } from '@/hooks/use-self-managed-inspection';
import { isAssignedInspectorName } from '@/lib/leasing/open-inspection-display';
import type { Inspection } from '@/lib/types';
import { cn, formatDate, formatTimeShort } from '@/lib/utils';
import { agencyTeamMemberLabel } from '@/utils/leasing-relet-decision';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'report', label: 'Report' },
  { id: 'issues', label: 'Issues' },
  { id: 'communication', label: 'Conversation' },
] as const;

type InspectionOpenedTab = (typeof TABS)[number]['id'];

const WORKFLOW_STEPS = [
  { id: 'CREATED', label: 'Created' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'ASSIGNED', label: 'Assigned' },
  { id: 'IN_PROGRESS', label: 'Inspection' },
  { id: 'REPORT_READY', label: 'Report' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CLOSED', label: 'Completed' },
] as const;

type WorkflowStepId = (typeof WORKFLOW_STEPS)[number]['id'] | 'CANCELLED';

function inspectionWorkflowStage(inspection: Inspection): WorkflowStepId {
  const api = (inspection.apiStatus ?? inspection.status ?? '').toLowerCase();
  if (api.includes('cancel') || inspection.cancelReason) return 'CANCELLED';
  if (api === 'completed' || api === 'closed' || inspection.completedAt) return 'CLOSED';
  if (api === 'published' || inspection.reportStatus === 'sent') return 'DELIVERED';
  if (api === 'first_review' || api === 'second_review' || inspection.reportStatus === 'uploaded' || inspection.reportStatus === 'approved') {
    return 'REPORT_READY';
  }
  if (api === 'in_progress') return 'IN_PROGRESS';
  if (inspection.inspector && inspection.scheduledAt) return 'ASSIGNED';
  if (inspection.scheduledAt) return 'SCHEDULED';
  return 'CREATED';
}

function stepDate(inspection: Inspection, step: (typeof WORKFLOW_STEPS)[number]['id']): string | null {
  if (step === 'CREATED') return inspection.createdAt ?? null;
  if (step === 'SCHEDULED' || step === 'ASSIGNED') return inspection.scheduledAt ?? null;
  if (step === 'DELIVERED') return inspection.approvedAt ?? null;
  if (step === 'CLOSED') return inspection.completedAt ?? inspection.approvedAt ?? null;
  return null;
}

const TYPE_BADGE: Record<Inspection['type'], string> = {
  INGOING: 'border-blue-600 bg-blue-600/10 text-blue-600 dark:text-blue-300',
  OUTGOING: 'border-orange-600 bg-orange-600/10 text-orange-600 dark:text-orange-300',
  ROUTINE: 'border-cyan-600 bg-cyan-600/10 text-cyan-600 dark:text-cyan-300',
  OPEN: 'border-violet-600 bg-violet-600/10 text-violet-600 dark:text-violet-300',
};

/**
 * Self-Manage inspection task, laid out like the admin inspection task: type badge, address,
 * Overview / Activity / Report / Issues / Conversation.
 */
export function InspectionOpenedTask({
  inspection,
  address,
  locality,
  reference,
  statusLabel,
  statusTone,
  createdAt,
  createdBy,
  scheduledLabel,
  inspector,
  tenantName,
  tenantPhone,
  tenantEmail,
  landlordName,
  landlordPhone,
  landlordEmail,
  leaseStarts,
  propertyId,
  issues,
  activity,
  report,
  conversation,
  related,
}: {
  inspection: Inspection;
  address: string;
  locality: string;
  reference: string;
  statusLabel: string;
  statusTone: 'active' | 'attention' | 'done' | 'danger';
  createdAt?: string | null;
  createdBy: string;
  scheduledLabel: string;
  inspector: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  landlordName?: string;
  landlordPhone?: string;
  landlordEmail?: string;
  leaseStarts?: string | null;
  propertyId?: string;
  issues: { label: string }[];
  activity: ReactNode;
  report: ReactNode;
  conversation: ReactNode;
  related: ReactNode;
}) {
  const [tab, setTab] = useState<InspectionOpenedTab>('overview');
  const tabs = inspection.type === 'OPEN' ? TABS.filter((item) => item.id !== 'issues') : TABS;
  const assignedInspector = useAssignedInspectorName(inspection, inspector);

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-10">
      <header className="shrink-0 px-6 pt-4 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <TaskBreadcrumb
              href={ROUTES.INSPECTIONS}
              label="Inspections"
              segments={[INSPECTION_TYPE_LABEL[inspection.type], reference]}
            />
            <span
              className={cn(
                'mt-3 inline-flex rounded-md border px-2.5 py-1 text-[11px] font-semibold tracking-wider uppercase',
                TYPE_BADGE[inspection.type],
              )}
            >
              {INSPECTION_TYPE_LABEL[inspection.type]}
            </span>
            <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight lg:text-[28px]">{address}</h1>
            <TaskLocality locality={locality} />
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
              <TaskStatusPill label={statusLabel} tone={statusTone} />
              <span className="text-muted-foreground">
                Case ID <TaskMetaChip>{reference}</TaskMetaChip>
              </span>
              {createdAt ? (
                <span className="text-muted-foreground">
                  Created {formatDate(createdAt)} by <span className="text-foreground font-semibold">{createdBy}</span>
                </span>
              ) : null}
            </div>
          </div>
          {propertyId ? (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link href={propertyDetail(propertyId)}>
                <Building2 className="size-4" />
                View Property
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <AdminTabStrip tabs={tabs} active={tab} onChange={setTab} />

      <div className="min-w-0 px-6 pt-5 lg:px-8">
        {tab === 'overview' ? (
          <InspectionOverview
            inspection={inspection}
            scheduledLabel={scheduledLabel}
            inspector={assignedInspector}
            tenantName={tenantName}
            tenantPhone={tenantPhone}
            tenantEmail={tenantEmail}
            landlordName={landlordName}
            landlordPhone={landlordPhone}
            landlordEmail={landlordEmail}
            leaseStarts={leaseStarts}
            propertyId={propertyId}
            related={related}
            onViewTimeline={() => setTab('activity')}
          />
        ) : null}
        {tab === 'activity' ? activity : null}
        {tab === 'report' ? report : null}
        {tab === 'issues' ? (
          <AdminSideCard title="Issues">
            {issues.length === 0 ? (
              <p className="text-muted-foreground text-sm">No issues recorded on this inspection.</p>
            ) : (
              <ul className="space-y-2">
                {issues.map((issue) => (
                  <li key={issue.label} className="text-sm">
                    {issue.label}
                  </li>
                ))}
              </ul>
            )}
          </AdminSideCard>
        ) : null}
        {tab === 'communication' ? conversation : null}
      </div>
    </div>
  );
}

/** The person assigned to this job: the agency inspector, or the name already on the inspection. */
function useAssignedInspectorName(inspection: Inspection, fallback: string): string {
  const { properties } = useAgentData();
  const agencyId = properties.find((property) => property.id === inspection.propertyId)?.agencyId;
  const { detail } = useSelfManagedInspection(inspection.id);
  const { members } = useAgencyTeamMembers(
    agencyId,
    Boolean(inspection.conductedByAgency && inspection.conductedByUserId),
  );
  const fromDetail = detail?.conductedByName?.trim() ?? '';
  const member = members.find((row) => row.userId === inspection.conductedByUserId);
  const fromTeam = member ? agencyTeamMemberLabel(member) : '';
  const listed = isAssignedInspectorName(inspection.inspector)
    ? inspection.inspector!.trim()
    : isAssignedInspectorName(fallback)
      ? fallback.trim()
      : '';
  return fromDetail || fromTeam || listed;
}

function InspectionOverview({
  inspection,
  scheduledLabel,
  inspector,
  tenantName,
  tenantPhone,
  tenantEmail,
  landlordName,
  landlordPhone,
  landlordEmail,
  leaseStarts,
  propertyId,
  related,
  onViewTimeline,
}: {
  inspection: Inspection;
  scheduledLabel: string;
  inspector: string;
  tenantName: string;
  tenantPhone?: string;
  tenantEmail?: string;
  landlordName?: string;
  landlordPhone?: string;
  landlordEmail?: string;
  leaseStarts?: string | null;
  propertyId?: string;
  related: ReactNode;
  onViewTimeline: () => void;
}) {
  const stage = inspectionWorkflowStage(inspection);
  const cancelled = stage === 'CANCELLED';
  const time =
    inspection.scheduledAt && formatTimeShort(inspection.scheduledAt).toLowerCase() !== '12:00 am'
      ? formatTimeShort(inspection.scheduledAt)
      : null;
  const ready = Boolean(inspection.scheduledAt) && !cancelled;
  const contacts: { role: string; name: string; phone?: string; email?: string }[] = [];
  if (tenantName && tenantName !== '—') {
    contacts.push({ role: 'Tenant', name: tenantName, phone: tenantPhone, email: tenantEmail });
  }
  if (landlordName && landlordName !== '—') {
    contacts.push({
      role: 'Landlord',
      name: landlordName,
      phone: landlordPhone,
      email: landlordEmail,
    });
  }
  const initials = inspector
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
      <div className="grid min-w-0 gap-4">
        <div className="grid min-w-0 gap-4 md:grid-cols-3">
          <section className="rounded-xl border bg-card p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <CalendarClock className="text-muted-foreground size-4" />
              Visit Plan
            </h2>
            <div className="mt-4 flex flex-col gap-3.5">
              <PlanRow label="Inspection date" value={scheduledLabel} />
              {time ? <PlanRow label="Time window" value={time} /> : null}
              {leaseStarts ? <PlanRow label="Lease starts" value={leaseStarts} /> : null}
              {inspection.keyStatus ? <PlanRow label="Key status" value={inspection.keyStatus} /> : null}
            </div>
            <div
              className={cn(
                'mt-4 rounded-lg border px-3 py-2.5 text-[13px]',
                ready
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100'
                  : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
              )}
            >
              <p className="font-medium">{ready ? 'Visit is booked' : cancelled ? 'Cancelled' : 'Not booked yet'}</p>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2">
              <User className="text-muted-foreground size-4" />
              <h3 className="text-sm font-semibold">Inspector</h3>
            </div>
            {inspector && inspector !== 'Unassigned' ? (
              <div className="mt-4 flex items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
                  {initials || '—'}
                </span>
                <p className="truncate text-[15px] font-semibold">{inspector}</p>
              </div>
            ) : (
              <p className="text-muted-foreground mt-4 text-[13px] leading-relaxed">
                Book the routine visit first — an inspector is assigned once a visit exists.
              </p>
            )}
          </section>

          <section className="rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Home className="text-muted-foreground size-4" />
                Contacts
              </h2>
              {propertyId ? (
                <Link
                  href={propertyDetail(propertyId)}
                  className="text-[13px] font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
                >
                  View property
                </Link>
              ) : null}
            </div>
            {contacts.length === 0 ? (
              <p className="text-muted-foreground mt-4 flex items-center gap-2 text-[13px]">
                <Building2 className="size-3.5" />
                No contact details yet
              </p>
            ) : (
              <ul className="mt-4 flex flex-col gap-4">
                {contacts.map((contact) => (
                  <li key={contact.role}>
                    <div className="text-muted-foreground flex items-center gap-2 text-[13px] font-medium">
                      <Users className="size-3.5" />
                      {contact.role}
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{contact.name}</p>
                    {contact.phone || contact.email ? (
                      <div className="mt-1 flex flex-col gap-1">
                        {contact.phone ? <ContactLine kind="phone" value={contact.phone} /> : null}
                        {contact.email ? <ContactLine kind="email" value={contact.email} /> : null}
                      </div>
                    ) : (
                      <p className="text-muted-foreground mt-1 text-[13px]">No contact details yet</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <GitBranch className="text-muted-foreground size-4" />
              Workflow
            </h2>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={onViewTimeline}>
              View full timeline
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
          <div className="mt-5 overflow-x-auto pb-1">
            <ol className="flex min-w-[640px] items-start">
              {WORKFLOW_STEPS.map((step, index) => {
                const activeIndex = WORKFLOW_STEPS.findIndex((row) => row.id === stage);
                const closed = stage === 'CLOSED';
                const done = !cancelled && (index < activeIndex || (closed && index === activeIndex));
                const current = !cancelled && !closed && index === activeIndex;
                const date = stepDate(inspection, step.id);
                const last = index === WORKFLOW_STEPS.length - 1;
                return (
                  <li key={step.id} className="relative flex min-w-0 flex-1 flex-col items-center">
                    {!last ? (
                      <span
                        aria-hidden
                        className={cn(
                          'absolute top-[11px] left-1/2 h-0.5 w-full',
                          done ? 'bg-emerald-500' : 'border-border border-t-2 border-dashed bg-transparent',
                        )}
                      />
                    ) : null}
                    <span
                      className={cn(
                        'relative z-10 flex size-6 items-center justify-center rounded-full border-2 bg-card',
                        done && 'border-emerald-500 bg-emerald-500 text-white',
                        current && 'border-emerald-500',
                        !done && !current && 'border-border',
                      )}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
                    </span>
                    <span
                      className={cn(
                        'mt-2 px-1 text-center text-[13px] font-medium',
                        done || current ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="text-muted-foreground mt-0.5 text-center text-xs tabular-nums">
                      {date ? formatDate(date) : current ? 'In progress' : '—'}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </div>
      <AdminSideCard title="Related tasks">{related}</AdminSideCard>
    </div>
  );
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-[13px]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}

function ContactLine({ kind, value }: { kind: 'phone' | 'email'; value: string }) {
  const [copied, setCopied] = useState(false);
  const Icon = kind === 'phone' ? Phone : Mail;
  return (
    <span className="text-muted-foreground flex min-w-0 items-center gap-2 text-[13px]">
      <Icon className="size-3.5 shrink-0" />
      <a href={kind === 'phone' ? `tel:${value}` : `mailto:${value}`} className="truncate hover:text-foreground">
        {value}
      </a>
      <button
        type="button"
        aria-label={`Copy ${value}`}
        className="hover:bg-secondary hover:text-foreground rounded p-0.5"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
          });
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </span>
  );
}
