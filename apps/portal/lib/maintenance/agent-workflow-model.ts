import type { ApiQuotation } from '@/lib/crossub-api/types';
import { dedupeJobCaseEmails, type JobCaseEmailRecord } from '@/lib/job-case-email';
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

function emailNotifications(
  workspaceCase: MaintenanceWorkspaceCase,
): MaintenanceEmailRecord[] {
  return workspaceCase.notifications
    .filter((n) => n.channel === 'email')
    .map((n) => ({
      id: n.id,
      subject: n.title,
      body: n.message,
      from: 'CROSSUB',
      to: workspaceCase.agent?.email ?? 'Agent',
      at: n.createdAt,
      kind: 'notification',
    }));
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
  return ctx.workspaceCase.responsibility === 'landlord';
}

export function resolveMaintenanceAgentStep(
  ctx: MaintenanceWorkflowContext,
): MaintenanceAgentStep {
  const { workspaceCase } = ctx;
  const status = workspaceCase.status;

  if (status === 'closed' || status === 'completed') {
    return MAINTENANCE_AGENT_STEP.JOB_COMPLETED;
  }

  if (status === 'in_progress') {
    return MAINTENANCE_AGENT_STEP.IN_PROGRESS;
  }

  if (status === 'pending_approval') {
    return MAINTENANCE_AGENT_STEP.IN_PROGRESS;
  }

  if (status === 'pending_quotation' || quoteDeclinedLoopBack(ctx)) {
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
      label: 'Tenant reports repair',
      done: tenantReport,
    },
    {
      id: 'agent_report',
      label: 'Agent reports repair',
      done: agentReport,
    },
    {
      id: 'datetime',
      label: 'Date and time recorded',
      done: hasCreatedAt,
    },
    {
      id: 'email_records',
      label: 'Email records logged',
      done: hasEmailRecords,
    },
  ];
}

function reviewSubProgress(ctx: MaintenanceWorkflowContext): MaintenanceSubProgressItem[] {
  const responsibility = ctx.workspaceCase.responsibility;
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
    return [
      {
        id: 'not_required',
        label: `Not required — ${ctx.workspaceCase.responsibility ?? 'pending'} responsible`,
        done: Boolean(ctx.workspaceCase.responsibility),
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
  ];
}

function jobCompletedSubProgress(ctx: MaintenanceWorkflowContext): MaintenanceSubProgressItem[] {
  return [
    {
      id: 'completion_photos',
      label: 'Completion photos uploaded by handyman',
      done: Boolean(ctx.workspaceCase.completionEvidenceUploaded),
    },
    {
      id: 'sync_invoice',
      label: 'Completion synced and invoice sent to agent',
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

  if (ctx.workspaceCase.status === 'closed') {
    for (const step of steps) {
      step.status = 'done';
    }
  }

  const doneCount = steps.filter((s) => s.status === 'done').length;
  const progressFillIndex =
    ctx.workspaceCase.status === 'closed'
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
  const emails = emailNotifications(ctx.workspaceCase);
  if (emails.length > 0) return emails;

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
  return ctx.workspaceCase.auditEntries.filter((e) =>
    regs.some((r) => r.test(e.message)),
  );
}

function emailRecordsForStepOnly(
  ctx: MaintenanceWorkflowContext,
  step: MaintenanceAgentStep,
): MaintenanceEmailRecord[] {
  switch (step) {
    case MAINTENANCE_AGENT_STEP.JOB_CREATED:
      return buildJobCreatedEmails(ctx);
    case MAINTENANCE_AGENT_STEP.REVIEW:
      return [];
    case MAINTENANCE_AGENT_STEP.GET_QUOTE: {
      const quote = buildQuoteSentToAgentEmail(ctx);
      return quote ? [quote] : [];
    }
    case MAINTENANCE_AGENT_STEP.IN_PROGRESS:
      return buildAcceptanceEmails(ctx);
    case MAINTENANCE_AGENT_STEP.JOB_COMPLETED:
      return emailNotifications(ctx.workspaceCase);
    default:
      return [];
  }
}

export function allMaintenanceEmailRecords(ctx: MaintenanceWorkflowContext): JobCaseEmailRecord[] {
  const records: JobCaseEmailRecord[] = [];
  for (const step of MAINTENANCE_AGENT_STEP_ORDER) {
    records.push(...emailRecordsForStepOnly(ctx, step));
  }
  return dedupeJobCaseEmails(records);
}

export function maintenanceEmailRecordsForStep(
  ctx: MaintenanceWorkflowContext,
  step: MaintenanceAgentStep,
): JobCaseEmailRecord[] {
  if (step === MAINTENANCE_AGENT_STEP.JOB_COMPLETED) {
    return allMaintenanceEmailRecords(ctx);
  }
  return dedupeJobCaseEmails(emailRecordsForStepOnly(ctx, step));
}
