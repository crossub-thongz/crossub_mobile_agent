import type { ApiQuotation } from '@/lib/crossub-api/types';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';
import {
  isLandlordMaintenanceFlow,
  resolveMaintenanceResponsibility,
} from '@/lib/maintenance/infer-responsibility';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import type { MaintenanceRequest } from '@/lib/types';

/** Five-stage maintenance flow (manager Excel spec). */
export const MAINTENANCE_AGENT_STEP = {
  JOB_CREATED: 'job_created',
  REVIEW: 'review',
  GET_QUOTE: 'get_quote',
  IN_PROGRESS: 'in_progress',
  JOB_COMPLETED: 'job_completed',
} as const;

export type MaintenanceAgentStep =
  (typeof MAINTENANCE_AGENT_STEP)[keyof typeof MAINTENANCE_AGENT_STEP];

export const MAINTENANCE_AGENT_STEP_ORDER: MaintenanceAgentStep[] = [
  MAINTENANCE_AGENT_STEP.JOB_CREATED,
  MAINTENANCE_AGENT_STEP.REVIEW,
  MAINTENANCE_AGENT_STEP.GET_QUOTE,
  MAINTENANCE_AGENT_STEP.IN_PROGRESS,
  MAINTENANCE_AGENT_STEP.JOB_COMPLETED,
];

export const MAINTENANCE_AGENT_STEP_LABEL: Record<MaintenanceAgentStep, string> = {
  [MAINTENANCE_AGENT_STEP.JOB_CREATED]: 'Created',
  [MAINTENANCE_AGENT_STEP.REVIEW]: 'Review',
  [MAINTENANCE_AGENT_STEP.GET_QUOTE]: 'Quote',
  [MAINTENANCE_AGENT_STEP.IN_PROGRESS]: 'Progress',
  [MAINTENANCE_AGENT_STEP.JOB_COMPLETED]: 'Done',
};

export const MAINTENANCE_AGENT_STEP_TITLE: Record<MaintenanceAgentStep, string> = {
  [MAINTENANCE_AGENT_STEP.JOB_CREATED]: 'Job created',
  [MAINTENANCE_AGENT_STEP.REVIEW]: 'Review',
  [MAINTENANCE_AGENT_STEP.GET_QUOTE]: 'Get quote',
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

function stepIndex(step: MaintenanceAgentStep): number {
  return MAINTENANCE_AGENT_STEP_ORDER.indexOf(step);
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
    from: workspaceCase.agent?.email ?? 'Managing agent',
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
      from: ctx.workspaceCase.agent?.email ?? 'Managing agent',
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
    from: ctx.workspaceCase.agent?.email ?? 'Managing agent',
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

  if (status === 'closed' || status === 'completed' || status === 'deleted') {
    return MAINTENANCE_AGENT_STEP.JOB_COMPLETED;
  }

  if (status === 'in_progress') {
    return MAINTENANCE_AGENT_STEP.IN_PROGRESS;
  }

  if (status === 'pending_approval' || status === 'pending_quotation' || quoteDeclinedLoopBack(ctx)) {
    return MAINTENANCE_AGENT_STEP.GET_QUOTE;
  }

  if (status === 'under_review' || status === 'pending_evidence') {
    return MAINTENANCE_AGENT_STEP.REVIEW;
  }

  if (workspaceCase.responsibility && !requiresContractorFlow(ctx)) {
    if (status === 'in_progress') return MAINTENANCE_AGENT_STEP.IN_PROGRESS;
    return MAINTENANCE_AGENT_STEP.REVIEW;
  }

  return MAINTENANCE_AGENT_STEP.JOB_CREATED;
}

function jobCreatedSubProgress(ctx: MaintenanceWorkflowContext): MaintenanceSubProgressItem[] {
  const source = ctx.workspaceCase.source;
  const tenantReport = source === 'tenant_app';
  const agentReport = source === 'agent_submission' || source === 'email';
  const hasCreatedAt = Boolean(ctx.workspaceCase.createdAt);
  const hasEmailRecords =
    emailNotifications(ctx.workspaceCase).length > 0 ||
    ctx.workspaceCase.notifications.length > 0;

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
    return [
      {
        id: 'direct_resolution',
        label: `${ctx.workspaceCase.responsibility ?? 'Responsible party'} handles repair directly`,
        done: ['in_progress', 'completed', 'closed'].includes(ctx.workspaceCase.status),
      },
      {
        id: 'completion_evidence',
        label: 'Completion Evidence Uploaded',
        done: Boolean(ctx.workspaceCase.completionEvidenceUploaded),
      },
      {
        id: 'tenant_signoff',
        label: 'Tenant Sign-Off Received',
        done: Boolean(ctx.workspaceCase.tenantApprovalReceived),
      },
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
      label: 'Completion Evidence Uploaded',
      done: Boolean(ctx.workspaceCase.completionEvidenceUploaded),
    },
    {
      id: 'tenant_signoff',
      label: 'Tenant Sign-Off Received',
      done: Boolean(ctx.workspaceCase.tenantApprovalReceived),
    },
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
    return [
      {
        id: 'completion_evidence',
        label: 'Completion Evidence Uploaded',
        done: Boolean(ctx.workspaceCase.completionEvidenceUploaded),
      },
      {
        id: 'tenant_signoff',
        label: 'Tenant Sign-Off Received',
        done: Boolean(ctx.workspaceCase.tenantApprovalReceived),
      },
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
      label: 'Completion Evidence Uploaded',
      done: Boolean(ctx.workspaceCase.completionEvidenceUploaded),
    },
    {
      id: 'tenant_signoff',
      label: 'Tenant Sign-Off Received',
      done: Boolean(ctx.workspaceCase.tenantApprovalReceived),
    },
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
  const liveStepId = resolveMaintenanceAgentStep(ctx);
  const liveIdx = stepIndex(liveStepId);
  const quote = latestQuotation(ctx.workspaceCase);

  const steps: MaintenanceAgentStepState[] = MAINTENANCE_AGENT_STEP_ORDER.map((id, idx) => ({
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
    liveStepId,
    progressFillIndex,
    requiresContractorFlow: requiresContractorFlow(ctx),
    latestQuotation: quote,
  };
}

export function buildJobCreatedEmails(ctx: MaintenanceWorkflowContext): MaintenanceEmailRecord[] {
  const sourceLabel =
    ctx.workspaceCase.source === 'tenant_app'
      ? 'Tenant'
      : ctx.workspaceCase.source === 'agent_submission'
        ? 'Agent'
        : 'Email';

  return [
    {
      id: `${ctx.item.id}-created`,
      subject: `Maintenance job created — ${ctx.workspaceCase.caseRef}`,
      from: sourceLabel,
      to: ctx.workspaceCase.agent?.email ?? 'Managing agent',
      at: ctx.workspaceCase.createdAt,
      kind: 'job_created',
      body: [
        `A new maintenance job has been logged.`,
        ``,
        `Issue: ${ctx.workspaceCase.issueType}`,
        `Description: ${ctx.workspaceCase.description}`,
        `Priority: ${ctx.workspaceCase.priority}`,
        `Property: ${ctx.workspaceCase.address}`,
      ].join('\n'),
    },
  ];
}

function parseQuotationWorkflowEmailFromAudit(
  entry: MaintenanceWorkspaceCase['auditEntries'][number],
  ctx: MaintenanceWorkflowContext,
): MaintenanceEmailRecord | null {
  const msg = entry.message;
  const patterns = [
    /^Landlord quotation email sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
    /^Contractor feedback email sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
    /^Counter offer sent\s*\(([^)]+)\)\.\s*\n\n([\s\S]+)$/i,
  ];
  for (const pattern of patterns) {
    const match = msg.match(pattern);
    if (!match) continue;
    const subject = match[1]?.trim() ?? 'Maintenance quotation';
    const body = match[2]?.trim() ?? '';
    if (!body) return null;
    const kind =
      /landlord quotation/i.test(msg)
        ? 'landlord_quotation'
        : /contractor feedback/i.test(msg)
          ? 'contractor_feedback'
          : 'counter_offer';
    return {
      id: entry.id,
      subject,
      body,
      from: ctx.workspaceCase.agent?.email ?? 'Managing agent',
      to: kind === 'landlord_quotation' ? 'Landlord' : 'Contractor',
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
    if (/counter offer/i.test(`${n.title} ${n.message}`)) continue;
    if (
      /landlord|quotation feedback|repair quotation/i.test(
        `${n.title} ${n.message}`,
      )
    ) {
      byId.set(n.id, mapEmailNotification(n, ctx.workspaceCase, 'quotation_submitted'));
    }
  }

  for (const entry of ctx.workspaceCase.auditEntries) {
    const parsed = parseQuotationWorkflowEmailFromAudit(entry, ctx);
    if (parsed && parsed.kind !== 'counter_offer') byId.set(parsed.id, parsed);
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
      `Total: $${quote.price.toLocaleString()} AUD`,
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
      from: ctx.workspaceCase.agent?.email ?? 'Managing agent',
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
      from: ctx.workspaceCase.agent?.email ?? 'Managing agent',
      to: tenant?.email ?? 'Tenant',
      at:
        auditAt(ctx.workspaceCase, /approv|accept|tenant/) ??
        quote.submittedAt,
      kind: 'tenant_notified',
      body: [
        `A contractor has been approved for your maintenance request.`,
        ``,
        `Contractor: ${contractor}`,
        `Approved quote: $${quote.price.toLocaleString()} AUD`,
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
      return buildResponsibilityReviewEmails(ctx);
    case MAINTENANCE_AGENT_STEP.GET_QUOTE:
      return buildQuotationWorkflowEmails(ctx);
    case MAINTENANCE_AGENT_STEP.IN_PROGRESS:
      return buildAcceptanceEmails(ctx);
    case MAINTENANCE_AGENT_STEP.JOB_COMPLETED:
      return emailNotifications(ctx.workspaceCase);
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
  return accumulateEmailRecordsThroughStep(ctx, MAINTENANCE_AGENT_STEP.JOB_COMPLETED);
}

export function maintenanceEmailRecordsForStep(
  ctx: MaintenanceWorkflowContext,
  step: MaintenanceAgentStep,
): JobCaseEmailRecord[] {
  return accumulateEmailRecordsThroughStep(ctx, step);
}
