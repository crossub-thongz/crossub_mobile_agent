import type { ApiQuotation } from '@/lib/crossub-api/types';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';
import { formatAgentSender } from '@/lib/job-case-email-sender';
import {
  isLandlordMaintenanceFlow,
  resolveMaintenanceResponsibility,
} from '@/lib/maintenance/infer-responsibility';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import type { MaintenanceRequest } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

function maintenanceAgentSender(
  workspaceCase: MaintenanceWorkspaceCase,
): Pick<JobCaseEmailRecord, 'from' | 'fromEmail'> {
  return formatAgentSender({
    name: workspaceCase.agent?.name,
    email: workspaceCase.agent?.email,
  });
}

/** Five-stage maintenance flow (manager Excel spec). */
export const MAINTENANCE_AGENT_STEP = {
  JOB_CREATED: 'job_created',
  REVIEW: 'review',
  GET_QUOTE: 'get_quote',
  SCHEDULE: 'schedule',
  IN_PROGRESS: 'in_progress',
  JOB_COMPLETED: 'job_completed',
} as const;

export type MaintenanceAgentStep =
  (typeof MAINTENANCE_AGENT_STEP)[keyof typeof MAINTENANCE_AGENT_STEP];

export const MAINTENANCE_AGENT_STEP_ORDER: MaintenanceAgentStep[] = [
  MAINTENANCE_AGENT_STEP.JOB_CREATED,
  MAINTENANCE_AGENT_STEP.REVIEW,
  MAINTENANCE_AGENT_STEP.GET_QUOTE,
  MAINTENANCE_AGENT_STEP.SCHEDULE,
  MAINTENANCE_AGENT_STEP.IN_PROGRESS,
  MAINTENANCE_AGENT_STEP.JOB_COMPLETED,
];

/** Steps shown in the progress rail for this case (tenant/strata skip quote + schedule). */
export function getMaintenanceAgentStepOrder(
  ctx: MaintenanceWorkflowContext,
): MaintenanceAgentStep[] {
  if (!requiresContractorFlow(ctx)) {
    return [
      MAINTENANCE_AGENT_STEP.JOB_CREATED,
      MAINTENANCE_AGENT_STEP.REVIEW,
      MAINTENANCE_AGENT_STEP.IN_PROGRESS,
      MAINTENANCE_AGENT_STEP.JOB_COMPLETED,
    ];
  }
  return [...MAINTENANCE_AGENT_STEP_ORDER];
}

export const MAINTENANCE_AGENT_STEP_LABEL: Record<MaintenanceAgentStep, string> = {
  [MAINTENANCE_AGENT_STEP.JOB_CREATED]: 'Created',
  [MAINTENANCE_AGENT_STEP.REVIEW]: 'Review',
  [MAINTENANCE_AGENT_STEP.GET_QUOTE]: 'Quote',
  [MAINTENANCE_AGENT_STEP.SCHEDULE]: 'Schedule',
  [MAINTENANCE_AGENT_STEP.IN_PROGRESS]: 'Progress',
  [MAINTENANCE_AGENT_STEP.JOB_COMPLETED]: 'Done',
};

export const MAINTENANCE_AGENT_STEP_TITLE: Record<MaintenanceAgentStep, string> = {
  [MAINTENANCE_AGENT_STEP.JOB_CREATED]: 'Job created',
  [MAINTENANCE_AGENT_STEP.REVIEW]: 'Review',
  [MAINTENANCE_AGENT_STEP.GET_QUOTE]: 'Get quote',
  [MAINTENANCE_AGENT_STEP.SCHEDULE]: 'Schedule visit',
  [MAINTENANCE_AGENT_STEP.IN_PROGRESS]: 'In progress',
  [MAINTENANCE_AGENT_STEP.JOB_COMPLETED]: 'Job completed',
};

export interface MaintenanceSubProgressItem {
  id: string;
  label: string;
  done: boolean;
}

export interface MaintenanceAgentStepState {
  id: MaintenanceAgentStep;
  label: string;
  status: 'done' | 'active' | 'upcoming';
  subProgress: MaintenanceSubProgressItem[];
  workflowName: string;
}

export interface MaintenanceAgentWorkflowModel {
  steps: MaintenanceAgentStepState[];
  stepOrder: MaintenanceAgentStep[];
  liveStepId: MaintenanceAgentStep;
  progressFillIndex: number;
  requiresContractorFlow: boolean;
  latestQuotation: ApiQuotation | undefined;
}

export interface MaintenanceWorkflowContext {
  item: MaintenanceRequest;
  workspaceCase: MaintenanceWorkspaceCase;
  /** Initial/evidence attachments on the shared workflow board (live sync). */
  evidenceAttachmentCount?: number;
}

export interface MaintenanceEmailRecord {
  id: string;
  subject: string;
  body: string;
  from: string;
  to: string;
  at: string;
  kind: string;
}

const ELECTRICAL_ISSUE_PATTERN =
  /electrical|appliance|washing machine|dryer|air conditioning|hot water/i;

function stepIndex(step: MaintenanceAgentStep, order: MaintenanceAgentStep[] = MAINTENANCE_AGENT_STEP_ORDER): number {
  return order.indexOf(step);
}

function normalizeAgentStepForOrder(
  stepId: MaintenanceAgentStep,
  ctx: MaintenanceWorkflowContext,
  stepOrder: MaintenanceAgentStep[],
): MaintenanceAgentStep {
  if (stepOrder.includes(stepId)) return stepId;
  if (
    stepId === MAINTENANCE_AGENT_STEP.GET_QUOTE ||
    stepId === MAINTENANCE_AGENT_STEP.SCHEDULE
  ) {
    const status = ctx.workspaceCase.status;
    if (status === 'in_progress') return MAINTENANCE_AGENT_STEP.IN_PROGRESS;
    if (status === 'closed' || status === 'completed' || status === 'deleted') {
      return MAINTENANCE_AGENT_STEP.JOB_COMPLETED;
    }
    return MAINTENANCE_AGENT_STEP.REVIEW;
  }
  return stepOrder[0] ?? stepId;
}

export function getLatestMaintenanceQuotation(
  workspaceCase: MaintenanceWorkspaceCase,
): ApiQuotation | undefined {
  return [...workspaceCase.quotations].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  )[0];
}

export function getMaintenanceQuotationsForCase(
  workspaceCase: MaintenanceWorkspaceCase,
): ApiQuotation[] {
  return [...workspaceCase.quotations].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

export function getSubmittedMaintenanceQuotation(
  workspaceCase: MaintenanceWorkspaceCase,
): ApiQuotation | undefined {
  const quote = getLatestMaintenanceQuotation(workspaceCase);
  return quote?.status === 'submitted' ? quote : undefined;
}

function latestQuotation(workspaceCase: MaintenanceWorkspaceCase): ApiQuotation | undefined {
  return getLatestMaintenanceQuotation(workspaceCase);
}

function auditMatches(
  workspaceCase: MaintenanceWorkspaceCase,
  pattern: RegExp,
): boolean {
  return workspaceCase.auditEntries.some((e) => pattern.test(e.message.toLowerCase()));
}

function auditAt(
  workspaceCase: MaintenanceWorkspaceCase,
  pattern: RegExp,
): string | null {
  const hit = [...workspaceCase.auditEntries]
    .reverse()
    .find((e) => pattern.test(e.message.toLowerCase()));
  return hit?.timestamp ?? null;
}

function responsibilityRecipientLabel(
  responsibility: MaintenanceWorkspaceCase['responsibility'],
  workspaceCase: MaintenanceWorkspaceCase,
): string {
  if (responsibility === 'strata') return 'Strata';
  if (responsibility === 'tenant') {
    return workspaceCase.tenant?.email ?? workspaceCase.tenant?.name ?? 'Tenant';
  }
  if (responsibility === 'landlord') {
    return workspaceCase.tenant?.email ?? 'Landlord';
  }
  return 'Recipient';
}

function mapEmailNotification(
  n: MaintenanceWorkspaceCase['notifications'][number],
  workspaceCase: MaintenanceWorkspaceCase,
  kind: string,
  to?: string,
): MaintenanceEmailRecord {
  const responsibility = workspaceCase.responsibility;
  return {
    id: n.id,
    subject: n.title,
    body: n.message,
    ...maintenanceAgentSender(workspaceCase),
    to:
      to ??
      (/responsibility determined/i.test(n.title)
        ? responsibilityRecipientLabel(responsibility, workspaceCase)
        : workspaceCase.tenant?.email ?? 'Recipient'),
    at: n.createdAt,
    kind,
  };
}

function emailNotifications(
  workspaceCase: MaintenanceWorkspaceCase,
): MaintenanceEmailRecord[] {
  return workspaceCase.notifications
    .filter((n) => n.channel === 'email')
    .map((n) => mapEmailNotification(n, workspaceCase, 'notification'));
}

function parseReviewEmailFromAudit(
  entry: MaintenanceWorkspaceCase['auditEntries'][number],
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord | null {
  if (entry.action !== 'responsibility_set') return null;

  const msg = entry.message;
  if (msg.startsWith('Review email sent')) {
    const subjectMatch = msg.match(/Review email sent\s*\(([^)]+)\)/i);
    const subject = subjectMatch?.[1]?.trim() ?? 'Review email';
    const parts = msg.split(/\r?\n\r?\n/);
    const body = parts.length >= 2 ? parts.slice(1).join('\n\n').trim() : '';
    if (!body) return null;
    return {
      id: entry.id,
      subject,
      body,
      ...maintenanceAgentSender(ctx.workspaceCase),
      to: responsibilityRecipientLabel(ctx.workspaceCase.responsibility, ctx.workspaceCase),
      at: entry.timestamp,
      kind: 'responsibility_review',
    };
  }

  if (!/^Responsibility set to \w+\./i.test(msg)) return null;
  const responsibility = ctx.workspaceCase.responsibility;
  if (!responsibility) return null;

  const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
  const common = [
    `Job: ${ctx.workspaceCase.caseRef}`,
    `Issue: ${ctx.workspaceCase.issueType}`,
    `Address: ${ctx.workspaceCase.address}`,
    '',
    'Details:',
    ctx.workspaceCase.description,
  ].join('\n');
  const tenantName = ctx.workspaceCase.tenant?.name ?? 'Tenant';
  const subject = `Responsibility Determined · ${cap(responsibility)}`;
  const body =
    responsibility === 'tenant'
      ? `Hi ${tenantName},\n\n${common}\n\nThis maintenance request has been classified as Tenant responsibility. Please proceed with the next steps.`
      : responsibility === 'landlord'
        ? `Hi ${tenantName},\n\n${common}\n\nWe are moving forward with the quotation workflow to resolve the issue under Landlord responsibility.`
        : `Hello Strata,\n\nWe need your approval/follow-up regarding the following maintenance issue:\n- Job: ${ctx.workspaceCase.caseRef}\n- Issue: ${ctx.workspaceCase.issueType}\n- Description: ${ctx.workspaceCase.description || '—'}\n- Address: ${ctx.workspaceCase.address || '—'}\n\nPlease advise next steps and any required evidence.\n\nThank you.`;

  return {
    id: `synthetic-email-responsibility-${entry.id}`,
    subject,
    body,
    ...maintenanceAgentSender(ctx.workspaceCase),
    to: responsibilityRecipientLabel(responsibility, ctx.workspaceCase),
    at: entry.timestamp,
    kind: 'responsibility_review',
  };
}

/** Responsibility confirmation emails (tenant / strata / landlord review step). */
export function buildResponsibilityReviewEmails(
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord[] {
  const byId = new Map<string, MaintenanceEmailRecord>();

  for (const n of ctx.workspaceCase.notifications) {
    if (n.channel !== 'email') continue;
    if (!/responsibility determined/i.test(n.title)) continue;
    byId.set(n.id, mapEmailNotification(n, ctx.workspaceCase, 'responsibility_review'));
  }

  for (const entry of ctx.workspaceCase.auditEntries) {
    const parsed = parseReviewEmailFromAudit(entry, ctx);
    if (parsed) byId.set(parsed.id, parsed);
  }

  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}

function isElectricalIssue(ctx: MaintenanceWorkflowContext): boolean {
  const text = `${ctx.workspaceCase.issueType} ${ctx.workspaceCase.description}`;
  return ELECTRICAL_ISSUE_PATTERN.test(text);
}

function hasApplianceDetails(ctx: MaintenanceWorkflowContext): boolean {
  const text = `${ctx.workspaceCase.description} ${ctx.item.description}`;
  return /\b(model|serial|size|kw|watt|brand)\b/i.test(text);
}

function hasMediaEvidence(ctx: MaintenanceWorkflowContext): boolean {
  return (
    (ctx.evidenceAttachmentCount ?? 0) > 0 ||
    auditMatches(ctx.workspaceCase, /photo|video|evidence|upload|media|image/) ||
    ctx.workspaceCase.auditEntries.length > 1
  );
}

function quoteDeclinedLoopBack(ctx: MaintenanceWorkflowContext): boolean {
  const quote = latestQuotation(ctx.workspaceCase);
  return (
    quote?.status === 'declined' &&
    (ctx.workspaceCase.status === 'pending_quotation' ||
      ctx.workspaceCase.status === 'pending_approval')
  );
}

export function requiresContractorFlow(ctx: MaintenanceWorkflowContext): boolean {
  return isLandlordMaintenanceFlow(ctx);
}

export function resolveMaintenanceAgentStep(
  ctx: MaintenanceWorkflowContext,
): MaintenanceAgentStep {
  const { workspaceCase } = ctx;
  const status = workspaceCase.status;
  const landlordFlow = requiresContractorFlow(ctx);

  if (status === 'closed' || status === 'completed' || status === 'deleted') {
    return MAINTENANCE_AGENT_STEP.JOB_COMPLETED;
  }

  if (status === 'in_progress') {
    return MAINTENANCE_AGENT_STEP.IN_PROGRESS;
  }

  if (landlordFlow) {
    if (status === 'pending_schedule') {
      return MAINTENANCE_AGENT_STEP.SCHEDULE;
    }
    if (
      status === 'pending_approval' ||
      status === 'pending_quotation' ||
      quoteDeclinedLoopBack(ctx)
    ) {
      return MAINTENANCE_AGENT_STEP.GET_QUOTE;
    }
  }

  if (status === 'under_review' || status === 'pending_evidence') {
    return MAINTENANCE_AGENT_STEP.REVIEW;
  }

  if (!landlordFlow) {
    if (
      status === 'pending_schedule' ||
      status === 'pending_approval' ||
      status === 'pending_quotation'
    ) {
      return status === 'pending_schedule'
        ? MAINTENANCE_AGENT_STEP.IN_PROGRESS
        : MAINTENANCE_AGENT_STEP.REVIEW;
    }
    return MAINTENANCE_AGENT_STEP.REVIEW;
  }

  return MAINTENANCE_AGENT_STEP.JOB_CREATED;
}

function jobCreatedSubProgress(ctx: MaintenanceWorkflowContext): MaintenanceSubProgressItem[] {
  const source = ctx.workspaceCase.source;
  const tenantReport = source === 'tenant_app';
  const agentReport = source === 'agent_submission' || source === 'email';
  const systemReport = source === 'system';
  const hasCreatedAt = Boolean(ctx.workspaceCase.createdAt);
  const hasEmailRecords =
    emailNotifications(ctx.workspaceCase).length > 0 ||
    ctx.workspaceCase.notifications.some((n) => n.channel === 'email') ||
    ctx.workspaceCase.auditEntries.some(
      (e) =>
        e.action === 'maintenance_job_created_email' ||
        e.action === 'maintenance_job_created_agent_email',
    );

  return [
    {
      id: 'tenant_report',
      label: 'Tenant Requested',
      done: tenantReport,
    },
    {
      id: 'agent_report',
      label: 'Agent Created',
      done: agentReport,
    },
    {
      id: 'system_report',
      label: 'System Created',
      done: systemReport,
    },
    {
      id: 'datetime',
      label: 'Date and time created',
      done: hasCreatedAt,
    },
    {
      id: 'email_records',
      label: 'Email',
      done: hasEmailRecords,
    },
  ];
}

function reviewSubProgress(ctx: MaintenanceWorkflowContext): MaintenanceSubProgressItem[] {
  const responsibility = resolveMaintenanceResponsibility(ctx);
  const electrical = isElectricalIssue(ctx);

  return [
    {
      id: 'responsibility',
      label: 'Responsibility check (landlord / tenant / strata)',
      done: Boolean(responsibility),
    },
    {
      id: 'media',
      label: 'Photos and videos verified for clarity',
      done: hasMediaEvidence(ctx) || Boolean(responsibility),
    },
    {
      id: 'appliance',
      label: electrical
        ? 'Appliance size and model recorded (electrical)'
        : 'Appliance details (if electrical)',
      done: !electrical || hasApplianceDetails(ctx) || Boolean(responsibility),
    },
  ];
}

function getQuoteSubProgress(ctx: MaintenanceWorkflowContext): MaintenanceSubProgressItem[] {
  const quote = latestQuotation(ctx.workspaceCase);
  const landlordFlow = requiresContractorFlow(ctx);

  if (!landlordFlow) {
    const responsibility = resolveMaintenanceResponsibility(ctx);
    return [
      {
        id: 'not_required',
        label: `Not required — ${responsibility ?? 'pending'} responsible`,
        done: Boolean(responsibility),
      },
    ];
  }

  const scope = quote?.scope?.toLowerCase() ?? '';
  const hasBreakdown =
    Boolean(quote) &&
    (scope.includes('labour') ||
      scope.includes('labor') ||
      scope.includes('call') ||
      scope.includes('parts') ||
      scope.includes('material'));

  return [
    { id: 'handyman_quote', label: 'Handyman quote obtained', done: Boolean(quote) },
    { id: 'description', label: 'Quote description recorded', done: Boolean(quote?.scope?.trim()) },
    {
      id: 'breakdown',
      label: 'Cost breakdown (labour, call-out, parts)',
      done: hasBreakdown || quote?.status === 'approved',
    },
    {
      id: 'pricing_type',
      label: 'Pricing type noted (fixed / hourly / call-out + repair)',
      done: Boolean(quote),
    },
    { id: 'gst', label: 'GST inclusion confirmed', done: Boolean(quote) },
    {
      id: 'quote_display',
      label: 'Quote shows total, handyman contact, and breakdown',
      done: quote?.status === 'submitted' || quote?.status === 'approved',
    },
    {
      id: 'agent_approval',
      label: 'Agent accepts or rejects quote',
      done:
        quote?.status === 'approved' ||
        ['in_progress', 'completed', 'closed'].includes(ctx.workspaceCase.status),
    },
    {
      id: 'sent_to_agent',
      label: 'Quotation report sent to agent',
      done:
        quote?.status === 'submitted' ||
        quote?.status === 'approved' ||
        ctx.workspaceCase.status === 'pending_approval' ||
        ['in_progress', 'completed', 'closed'].includes(ctx.workspaceCase.status),
    },
  ];
}

function scheduleSubProgress(ctx: MaintenanceWorkflowContext): MaintenanceSubProgressItem[] {
  const proposal = ctx.item.scheduleProposal;
  const agentScheduleApproval = ctx.item.endLeasingLandlordResp === true;
  return [
    {
      id: 'contractor_contacted',
      label: agentScheduleApproval
        ? 'Contractor emailed with agent contact'
        : 'Contractor emailed with tenant contact',
      done: ctx.workspaceCase.status === 'pending_schedule' || Boolean(proposal),
    },
    {
      id: 'availability',
      label: 'Contractor submitted visit availability',
      done: Boolean(proposal?.availableTimes?.trim()),
    },
    {
      id: 'tenant_confirm',
      label: agentScheduleApproval
        ? proposal?.tenantDecision === 'declined'
          ? 'Agent declined visit time'
          : 'Agent approved visit time'
        : proposal?.tenantDecision === 'declined'
          ? 'Tenant declined visit time'
          : 'Tenant approved visit time',
      done:
        proposal?.tenantDecision === 'approved' ||
        proposal?.tenantDecision === 'declined',
    },
  ];
}

function tenantSignOffGateApplies(ctx: MaintenanceWorkflowContext): boolean {
  return ctx.item.endLeasingMaintenance !== true;
}

function tenantSignOffSubProgressItem(
  ctx: MaintenanceWorkflowContext,
): MaintenanceSubProgressItem | null {
  if (!tenantSignOffGateApplies(ctx)) return null;
  return {
    id: 'tenant_signoff',
    label: 'Tenant Sign-Off Received',
    done: Boolean(ctx.workspaceCase.tenantApprovalReceived),
  };
}

function inProgressSubProgress(ctx: MaintenanceWorkflowContext): MaintenanceSubProgressItem[] {
  const quote = latestQuotation(ctx.workspaceCase);
  const landlordFlow = requiresContractorFlow(ctx);
  const approved =
    quote?.status === 'approved' ||
    ctx.workspaceCase.status === 'in_progress' ||
    ctx.workspaceCase.status === 'completed' ||
    ctx.workspaceCase.status === 'closed';
  const declined = quote?.status === 'declined';
  const awaitingDecision = ctx.item.requiresApproval;

  if (!landlordFlow) {
    if (ctx.workspaceCase.responsibility === 'tenant') {
      return [
        {
          id: 'tenant_acknowledgement',
          label: 'Tenant acknowledgement received',
          done:
            Boolean(ctx.workspaceCase.tenantApprovalReceived) ||
            ctx.workspaceCase.status === 'closed',
        },
      ];
    }
    return [
      {
        id: 'direct_resolution',
        label: `${ctx.workspaceCase.responsibility ?? 'Responsible party'} handles repair directly`,
        done: ['in_progress', 'completed', 'closed'].includes(ctx.workspaceCase.status),
      },
      {
        id: 'completion_evidence',
        label: 'Completion evidence uploaded',
        done: Boolean(ctx.workspaceCase.completionEvidenceUploaded),
      },
      {
        id: 'agent_approval',
        label: 'Agent approval received',
        done: Boolean(ctx.workspaceCase.agentApprovalReceived),
      },
      ...(tenantSignOffSubProgressItem(ctx) ? [tenantSignOffSubProgressItem(ctx)!] : []),
      {
        id: 'invoice',
        label: 'Invoice Uploaded',
        done: Boolean(ctx.workspaceCase.invoiceUploaded),
      },
    ];
  }

  return [
    {
      id: 'agent_decision',
      label: 'Agent accepts or rejects quote',
      done: approved || declined,
    },
    {
      id: 'accept_emails',
      label: 'Handyman and tenant notified on acceptance',
      done:
        approved &&
        (auditMatches(ctx.workspaceCase, /email|notif|contact|arrang/) ||
          ctx.workspaceCase.status === 'in_progress'),
    },
    {
      id: 'reject_reason',
      label: 'Rejection reason recorded (if declined)',
      done: declined ? Boolean(quote?.declineReason?.trim()) : !awaitingDecision || approved,
    },
    {
      id: 'requote_loop',
      label: 'Price too high — return to get quote (if applicable)',
      done:
        !declined ||
        ctx.workspaceCase.status !== 'pending_quotation' ||
        quoteDeclinedLoopBack(ctx),
    },
    {
      id: 'landlord_fix',
      label: 'Landlord self-repair — close job (if applicable)',
      done: ctx.workspaceCase.status === 'closed' && declined,
    },
    {
      id: 'on_site',
      label: 'Repair work in progress on site',
      done: ['in_progress', 'completed', 'closed'].includes(ctx.workspaceCase.status),
    },
    {
      id: 'completion_evidence',
      label: 'Completion evidence uploaded',
      done: Boolean(ctx.workspaceCase.completionEvidenceUploaded),
    },
    {
      id: 'agent_approval',
      label: 'Agent approval received',
      done: Boolean(ctx.workspaceCase.agentApprovalReceived),
    },
    ...(tenantSignOffSubProgressItem(ctx) ? [tenantSignOffSubProgressItem(ctx)!] : []),
    {
      id: 'invoice',
      label: 'Invoice Uploaded',
      done: Boolean(ctx.workspaceCase.invoiceUploaded),
    },
  ];
}

function jobCompletedSubProgress(ctx: MaintenanceWorkflowContext): MaintenanceSubProgressItem[] {
  if (ctx.workspaceCase.status === 'deleted') {
    const reason = ctx.item.deleteReason?.trim();
    return [
      {
        id: 'deleted',
        label: reason ? `Deleted: ${reason}` : 'Job deleted by staff',
        done: true,
      },
    ];
  }

  const landlordFlow = requiresContractorFlow(ctx);
  if (!landlordFlow) {
    if (ctx.workspaceCase.responsibility === 'tenant') {
      return [
        {
          id: 'tenant_acknowledgement',
          label: 'Tenant acknowledgement received',
          done:
            Boolean(ctx.workspaceCase.tenantApprovalReceived) ||
            ctx.workspaceCase.status === 'closed',
        },
        {
          id: 'closed',
          label: 'Job closed',
          done: ctx.workspaceCase.status === 'closed',
        },
      ];
    }
    return [
      {
        id: 'completion_evidence',
        label: 'Completion evidence uploaded',
        done: Boolean(ctx.workspaceCase.completionEvidenceUploaded),
      },
      {
        id: 'agent_approval',
        label: 'Agent approval received',
        done: Boolean(ctx.workspaceCase.agentApprovalReceived),
      },
      ...(tenantSignOffSubProgressItem(ctx) ? [tenantSignOffSubProgressItem(ctx)!] : []),
      {
        id: 'invoice',
        label: 'Invoice Uploaded',
        done: Boolean(ctx.workspaceCase.invoiceUploaded),
      },
      {
        id: 'closed',
        label: 'Job closed',
        done: ctx.workspaceCase.status === 'closed',
      },
    ];
  }

  return [
    {
      id: 'completion_photos',
      label: 'Completion evidence uploaded',
      done: Boolean(ctx.workspaceCase.completionEvidenceUploaded),
    },
    {
      id: 'agent_approval',
      label: 'Agent approval received',
      done: Boolean(ctx.workspaceCase.agentApprovalReceived),
    },
    ...(tenantSignOffSubProgressItem(ctx) ? [tenantSignOffSubProgressItem(ctx)!] : []),
    {
      id: 'sync_invoice',
      label: 'Invoice Uploaded',
      done: Boolean(ctx.workspaceCase.invoiceUploaded),
    },
    {
      id: 'payment',
      label: 'Agent confirms invoice paid',
      done:
        ctx.workspaceCase.status === 'closed' ||
        auditMatches(ctx.workspaceCase, /paid|payment|invoice.*confirm/),
    },
    {
      id: 'closed',
      label: 'Job status set to completed',
      done: ctx.workspaceCase.status === 'closed' || ctx.workspaceCase.status === 'completed',
    },
  ];
}

function subProgressForStep(
  step: MaintenanceAgentStep,
  ctx: MaintenanceWorkflowContext,
): MaintenanceSubProgressItem[] {
  switch (step) {
    case MAINTENANCE_AGENT_STEP.JOB_CREATED:
      return jobCreatedSubProgress(ctx);
    case MAINTENANCE_AGENT_STEP.REVIEW:
      return reviewSubProgress(ctx);
    case MAINTENANCE_AGENT_STEP.GET_QUOTE:
      return getQuoteSubProgress(ctx);
    case MAINTENANCE_AGENT_STEP.SCHEDULE:
      return scheduleSubProgress(ctx);
    case MAINTENANCE_AGENT_STEP.IN_PROGRESS:
      return inProgressSubProgress(ctx);
    case MAINTENANCE_AGENT_STEP.JOB_COMPLETED:
      return jobCompletedSubProgress(ctx);
    default:
      return [];
  }
}

export function buildMaintenanceAgentWorkflow(
  ctx: MaintenanceWorkflowContext,
): MaintenanceAgentWorkflowModel {
  const stepOrder = getMaintenanceAgentStepOrder(ctx);
  const rawLiveStepId = resolveMaintenanceAgentStep(ctx);
  const liveStepId = normalizeAgentStepForOrder(rawLiveStepId, ctx, stepOrder);
  const liveIdx = Math.max(0, stepIndex(liveStepId, stepOrder));
  const quote = latestQuotation(ctx.workspaceCase);

  const steps: MaintenanceAgentStepState[] = stepOrder.map((id, idx) => ({
    id,
    label: MAINTENANCE_AGENT_STEP_LABEL[id],
    status: idx < liveIdx ? 'done' : idx === liveIdx ? 'active' : 'upcoming',
    subProgress: subProgressForStep(id, ctx),
    workflowName: 'Maintenance',
  }));

  if (ctx.workspaceCase.status === 'closed' || ctx.workspaceCase.status === 'deleted') {
    for (const step of steps) {
      step.status = 'done';
    }
  }

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const progressFillIndex =
    ctx.workspaceCase.status === 'closed' || ctx.workspaceCase.status === 'deleted'
      ? steps.length - 1
      : Math.max(0, doneCount - 0.5);

  return {
    steps,
    stepOrder,
    liveStepId,
    progressFillIndex,
    requiresContractorFlow: requiresContractorFlow(ctx),
    latestQuotation: quote,
  };
}

/** Job-created acknowledgment + agent notification emails from the audit trail. */
export function buildJobCreatedEmails(
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord[] {
  const byId = new Map<string, MaintenanceEmailRecord>();

  for (const entry of ctx.workspaceCase.auditEntries) {
    const parsed = parseJobCreatedEmailFromAudit(entry, ctx);
    if (parsed) byId.set(parsed.id, parsed);
  }

  for (const n of ctx.workspaceCase.notifications) {
    if (n.channel !== 'email') continue;
    if (!/maintenance job|repair request|received your maintenance|new maintenance job/i.test(n.title)) {
      continue;
    }
    const kind = /agent|managing agent/i.test(`${n.title} ${n.message}`)
      ? 'job_created_agent'
      : 'job_created_tenant_ack';
    byId.set(n.id, mapEmailNotification(n, ctx.workspaceCase, kind));
  }

  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}

function parseJobCreatedEmailFromAudit(
  entry: MaintenanceWorkspaceCase['auditEntries'][number],
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord | null {
  if (
    entry.action !== 'maintenance_job_created_email' &&
    entry.action !== 'maintenance_job_created_agent_email'
  ) {
    return null;
  }

  const msg = entry.message.trim();
  const match = msg.match(/^(.+?)\s+email sent\s*\(([^)]+)\)\.(?:[^\n]*\n)*\n+([\s\S]+)$/i);
  if (!match) return null;

  const body = match[3]?.trim() ?? '';
  if (!body) return null;

  const isAgent = entry.action === 'maintenance_job_created_agent_email';

  return {
    id: entry.id,
    subject: match[2]?.trim() || 'Maintenance email',
    body,
    ...maintenanceAgentSender(ctx.workspaceCase),
    to: isAgent
      ? ctx.workspaceCase.agent?.email ?? 'Managing agent'
      : ctx.workspaceCase.tenant?.email ?? ctx.workspaceCase.tenant?.name ?? 'Tenant',
    at: entry.timestamp,
    kind: isAgent ? 'job_created_agent' : 'job_created_tenant_ack',
  };
}

const IMPORTANT_MAINTENANCE_EMAIL_KINDS = new Set([
  'responsibility_review',
  'responsibility_set',
  'job_created_tenant_ack',
  'job_created_agent',
  'rfq',
  'contractor_assigned',
  'quotation_submitted',
  'requote',
  'counter_offer',
  'quotation_approved',
  'quotation_declined',
  'landlord_quotation',
  'contractor_feedback',
  'quotation_landlord_email',
  'quotation_contractor_feedback',
  'quotation_counter_offer',
  'quotation_resubmitted',
  'quotation_created',
  'quotation_review_decision',
  'contractor_evidence_requested',
  'contractor_evidence_fulfilled',
  'contractor_rfq_accepted',
  'contractor_rfq_declined',
]);

function isImportantMaintenanceEmail(record: {
  subject: string;
  body: string;
  kind?: string;
}): boolean {
  if (record.kind && IMPORTANT_MAINTENANCE_EMAIL_KINDS.has(record.kind)) return true;
  const hay = `${record.subject} ${record.body}`.toLowerCase();
  if (/status updated|attachment|evidence received|invoice received|job created/i.test(hay)) {
    return false;
  }
  return (
    /responsibility|rfq|quotation|quote|requote|counter offer|declin|approv|landlord|contractor feedback/i.test(
      hay,
    )
  );
}

function parseGenericMaintenanceEmailFromAudit(
  entry: MaintenanceWorkspaceCase['auditEntries'][number],
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord | null {
  if (
    entry.action === 'maintenance_job_created_email' ||
    entry.action === 'maintenance_job_created_agent_email'
  ) {
    return null;
  }

  const msg = entry.message.trim();
  const match = msg.match(/^(.+?)\s+email sent\s*\(([^)]+)\)\.(?:[^\n]*\n)*\n+([\s\S]+)$/i);
  if (!match) return null;

  const body = match[3]?.trim() ?? '';
  if (!body) return null;

  return {
    id: entry.id,
    subject: match[2]?.trim() || 'Maintenance email',
    body,
    ...maintenanceAgentSender(ctx.workspaceCase),
    to: inferMaintenanceEmailRecipient(entry.action, ctx),
    at: entry.timestamp,
    kind: entry.action,
  };
}

function inferMaintenanceEmailRecipient(
  action: MaintenanceWorkspaceCase['auditEntries'][number]['action'],
  ctx: MaintenanceWorkflowContext,
): string {
  if (action === 'quotation_landlord_email') return 'Landlord';
  if (
    action === 'quotation_contractor_feedback' ||
    action === 'quotation_counter_offer'
  ) {
    return ctx.item.contractorName ?? 'Contractor';
  }
  if (action === 'responsibility_set') {
    return responsibilityRecipientLabel(ctx.workspaceCase.responsibility, ctx.workspaceCase);
  }
  return ctx.workspaceCase.tenant?.email ?? ctx.workspaceCase.tenant?.name ?? 'Recipient';
}

/** Every email captured on the maintenance audit trail (sent + responsibility notices). */
function buildAuditTrailMaintenanceEmails(
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord[] {
  const byId = new Map<string, MaintenanceEmailRecord>();
  for (const entry of ctx.workspaceCase.auditEntries) {
    const parsed =
      parseReviewEmailFromAudit(entry, ctx) ??
      parseQuotationWorkflowEmailFromAudit(entry, ctx) ??
      parseGenericMaintenanceEmailFromAudit(entry, ctx);
    if (parsed) byId.set(parsed.id, parsed);
  }
  return [...byId.values()];
}

function parseQuotationWorkflowEmailFromAudit(
  entry: MaintenanceWorkspaceCase['auditEntries'][number],
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord | null {
  const msg = entry.message;
  const patterns: Array<{
    pattern: RegExp;
    kind: string;
    to: (ctx: MaintenanceWorkflowContext) => string;
    from?: (ctx: MaintenanceWorkflowContext) => { from: string; fromEmail?: string };
  }> = [
    {
      pattern: /^Landlord quotation email sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
      kind: 'landlord_quotation',
      to: () => 'Landlord',
    },
    {
      pattern: /^Contractor feedback email sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
      kind: 'contractor_feedback',
      to: () => 'Contractor',
    },
    {
      pattern: /^Counter offer sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
      kind: 'counter_offer',
      to: () => 'Contractor',
    },
    {
      pattern: /^Revised quotation email sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
      kind: 'requote',
      to: (c) => c.workspaceCase.agent?.email ?? 'Managing agent',
      from: (c) => ({
        from: c.item.contractorName ?? 'Contractor',
      }),
    },
    {
      pattern: /^Contractor quotation email sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
      kind: 'quotation_submitted',
      to: (c) => c.workspaceCase.agent?.email ?? 'Managing agent',
      from: (c) => ({
        from: c.item.contractorName ?? 'Contractor',
      }),
    },
    {
      pattern: /^RFQ email sent to .+? \(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
      kind: 'rfq',
      to: () => 'Contractor',
    },
    {
      pattern: /^Quotation approved email sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
      kind: 'quotation_approved',
      to: (c) => c.workspaceCase.agent?.email ?? 'Managing agent',
    },
    {
      pattern: /^Quotation declined email sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
      kind: 'quotation_declined',
      to: (c) => c.workspaceCase.agent?.email ?? 'Managing agent',
    },
  ];
  for (const { pattern, kind, to, from } of patterns) {
    const match = msg.match(pattern);
    if (!match) continue;
    const subject = match[1]?.trim() ?? 'Maintenance quotation';
    const body = match[2]?.trim() ?? '';
    if (!body) return null;
    return {
      id: entry.id,
      subject,
      body,
      ...(from?.(ctx) ?? maintenanceAgentSender(ctx.workspaceCase)),
      to: to(ctx),
      at: entry.timestamp,
      kind,
    };
  }
  return null;
}

export function buildQuotationWorkflowEmails(
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord[] {
  const byId = new Map<string, MaintenanceEmailRecord>();

  for (const n of ctx.workspaceCase.notifications) {
    if (n.channel !== 'email') continue;
    if (
      /landlord|quotation feedback|repair quotation|counter offer|revised quotation|requote/i.test(
        `${n.title} ${n.message}`,
      )
    ) {
      const kind = /counter offer/i.test(`${n.title} ${n.message}`)
        ? 'counter_offer'
        : /revised quotation|requote/i.test(`${n.title} ${n.message}`)
          ? 'requote'
          : 'quotation_submitted';
      const to =
        kind === 'counter_offer'
          ? ctx.item.contractorName ?? 'Contractor'
          : kind === 'requote'
            ? ctx.workspaceCase.agent?.email ?? 'Managing agent'
            : /landlord/i.test(`${n.title} ${n.message}`)
              ? 'Landlord'
              : undefined;
      const mapped = mapEmailNotification(n, ctx.workspaceCase, kind, to);
      if (kind === 'requote') {
        mapped.from = ctx.item.contractorName ?? 'Contractor';
      }
      byId.set(n.id, mapped);
    }
  }

  for (const entry of ctx.workspaceCase.auditEntries) {
    const parsed = parseQuotationWorkflowEmailFromAudit(entry, ctx);
    if (parsed) byId.set(parsed.id, parsed);
  }

  const quote = buildQuoteSentToAgentEmail(ctx);
  if (quote) byId.set(quote.id, quote);

  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
}

export function buildQuoteSentToAgentEmail(
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord | null {
  const quote = latestQuotation(ctx.workspaceCase);
  if (!quote) return null;

  return {
    id: `${quote.id}-agent-quote`,
    subject: `Handyman quotation — ${ctx.workspaceCase.caseRef}`,
    from: ctx.item.contractorName ?? 'Handyman',
    to: ctx.workspaceCase.agent?.email ?? 'Managing agent',
    at: quote.submittedAt,
    kind: 'quotation_submitted',
    body: [
      `Quotation submitted for review.`,
      ``,
      `Total: ${formatCurrency(quote.price)} AUD`,
      `Scope: ${quote.scope}`,
      `Available: ${quote.availableSchedule}`,
      ``,
      `Please accept or reject in the agent portal.`,
    ].join('\n'),
  };
}

export function buildAcceptanceEmails(
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord[] {
  const quote = latestQuotation(ctx.workspaceCase);
  if (!quote || quote.status !== 'approved') return [];

  const contractor = ctx.item.contractorName ?? 'Handyman';
  const tenant = ctx.workspaceCase.tenant;

  return [
    {
      id: `${ctx.item.id}-handyman-accept`,
      subject: `Job approved — arrange repair`,
      ...maintenanceAgentSender(ctx.workspaceCase),
      to: contractor,
      at:
        auditAt(ctx.workspaceCase, /approv|accept/) ??
        quote.submittedAt,
      kind: 'handyman_notified',
      body: [
        `Your quotation has been approved.`,
        ``,
        `Tenant contact: ${tenant?.name ?? '—'}`,
        tenant?.phone ? `Phone: ${tenant.phone}` : '',
        tenant?.email ? `Email: ${tenant.email}` : '',
        ``,
        `Please arrange the repair and upload completion photos when finished.`,
      ]
        .filter(Boolean)
        .join('\n'),
    },
    {
      id: `${ctx.item.id}-tenant-accept`,
      subject: `Repair contractor assigned`,
      ...maintenanceAgentSender(ctx.workspaceCase),
      to: tenant?.email ?? 'Tenant',
      at:
        auditAt(ctx.workspaceCase, /approv|accept|tenant/) ??
        quote.submittedAt,
      kind: 'tenant_notified',
      body: [
        `A contractor has been approved for your maintenance request.`,
        ``,
        `Contractor: ${contractor}`,
        `Approved quote: ${formatCurrency(quote.price)} AUD`,
        ``,
        `They will contact you to arrange access.`,
      ].join('\n'),
    },
  ];
}

export function auditEntriesForStep(
  ctx: MaintenanceWorkflowContext,
  step: MaintenanceAgentStep,
): MaintenanceWorkspaceCase['auditEntries'] {
  const patterns: Record<MaintenanceAgentStep, RegExp[]> = {
    job_created: [/job created|opened|submitted|report/i],
    review: [/review|responsibility|evidence|media|appliance/i],
    get_quote: [/quotation|quote|contractor|handyman/i],
    // `SCHEDULE` sits between GET_QUOTE and IN_PROGRESS in MAINTENANCE_AGENT_STEP and was
    // missing here, so `patterns[step]` returned undefined and `regs.some(...)` below threw
    // a TypeError whenever the Schedule step's audit entries were read. Terms taken from the
    // API's own scheduling audit lines ("Agent approved proposed schedule…", "…scheduling",
    // availability and visit wording), not invented.
    schedule: [/schedul|availabilit|visit|appointment|attend/i],
    in_progress: [/approv|declin|reject|in progress|on site|email|notif/i],
    job_completed: [/complete|evidence|invoice|paid|closed/i],
  };

  const regs = patterns[step];
  const seen = new Set<string>();
  return ctx.workspaceCase.auditEntries.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return regs.some((r) => r.test(e.message));
  });
}

function emailRecordsForStepOnly(
  ctx: MaintenanceWorkflowContext,
  step: MaintenanceAgentStep,
): MaintenanceEmailRecord[] {
  switch (step) {
    case MAINTENANCE_AGENT_STEP.JOB_CREATED:
      return buildJobCreatedEmails(ctx);
    case MAINTENANCE_AGENT_STEP.REVIEW:
      return buildResponsibilityReviewEmails(ctx).filter(isImportantMaintenanceEmail);
    case MAINTENANCE_AGENT_STEP.GET_QUOTE:
      return buildQuotationWorkflowEmails(ctx).filter(isImportantMaintenanceEmail);
    case MAINTENANCE_AGENT_STEP.SCHEDULE:
      return emailNotifications(ctx.workspaceCase).filter(
        (e) =>
          isImportantMaintenanceEmail(e) &&
          /schedule|visit availability|visit time|tenant contact/i.test(
            `${e.subject} ${e.body}`,
          ),
      );
    case MAINTENANCE_AGENT_STEP.IN_PROGRESS:
      // Acceptance synthetics (handyman/tenant notified) are not real sends — skip.
      return [];
    case MAINTENANCE_AGENT_STEP.JOB_COMPLETED:
      return emailNotifications(ctx.workspaceCase).filter(isImportantMaintenanceEmail);
    default:
      return [];
  }
}

function accumulateEmailRecordsThroughStep(
  ctx: MaintenanceWorkflowContext,
  throughStep: MaintenanceAgentStep,
): JobCaseEmailRecord[] {
  const endIndex = stepIndex(throughStep);
  const byId = new Map<string, JobCaseEmailRecord>();
  for (let i = 0; i <= endIndex; i++) {
    const stepId = MAINTENANCE_AGENT_STEP_ORDER[i]!;
    for (const record of emailRecordsForStepOnly(ctx, stepId)) {
      byId.set(record.id, record);
    }
  }
  return dedupeJobCaseEmails([...byId.values()]);
}

export function allMaintenanceEmailRecords(ctx: MaintenanceWorkflowContext): JobCaseEmailRecord[] {
  const byId = new Map<string, JobCaseEmailRecord>();

  for (const record of accumulateEmailRecordsThroughStep(
    ctx,
    MAINTENANCE_AGENT_STEP.JOB_COMPLETED,
  )) {
    if (isImportantMaintenanceEmail(record)) byId.set(record.id, record);
  }

  for (const record of buildAuditTrailMaintenanceEmails(ctx)) {
    if (isImportantMaintenanceEmail(record)) byId.set(record.id, record);
  }

  for (const record of emailNotifications(ctx.workspaceCase)) {
    if (isImportantMaintenanceEmail(record)) byId.set(record.id, record);
  }

  return dedupeJobCaseEmails([...byId.values()]);
}

export function maintenanceEmailRecordsForStep(
  ctx: MaintenanceWorkflowContext,
  step: MaintenanceAgentStep,
): JobCaseEmailRecord[] {
  if (step === MAINTENANCE_AGENT_STEP.JOB_COMPLETED) {
    return allMaintenanceEmailRecords(ctx);
  }
  return accumulateEmailRecordsThroughStep(ctx, step);
}
