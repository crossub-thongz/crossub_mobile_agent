import type { ApiMaintenanceAttachment, ApiQuotation } from '@/lib/crossub-api/types';
import {
  buildMaintenanceAgentWorkflow,
  MAINTENANCE_AGENT_STEP_TITLE,
  requiresContractorFlow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import { resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';
import {
  formatMaintenanceAuditMessage,
  isMaintenanceEmailSnapshotAudit,
} from '@/lib/maintenance/format-audit-message';
import {
  isTenantRejectedMaintenance,
  tenantRejectionReason,
  TENANT_REJECTED_LABEL,
} from '@/lib/maintenance/tenant-rejected';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import { SOURCE_LABELS } from '@/lib/maintenance-workspace/status-labels';
import type { MaintenanceRequest, Property } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  isRawCaseId,
  workflowCaseReferenceLabel,
} from '@/lib/workflow-case-reference';

export const MAINTENANCE_TASK_STAGE_LABELS = [
  'Reported',
  'Assessed',
  'Quotes requested',
  'Approval',
  'Work order',
  'Job in progress',
  'Completed',
] as const;

export type MaintenanceTaskTab =
  | 'workflow'
  | 'details'
  | 'quotes'
  | 'activity'
  | 'documents'
  | 'notes'
  | 'messages';

export type MaintenanceTaskStageState = 'complete' | 'current' | 'pending';

export function maintenanceTaskReference(
  workspaceCase: MaintenanceWorkspaceCase,
  item?: MaintenanceRequest,
): string {
  const tracking = item?.trackingNumber?.trim();
  if (tracking && !isRawCaseId(tracking)) return tracking;
  const caseRef = workspaceCase.caseRef?.trim();
  if (caseRef && !isRawCaseId(caseRef)) return caseRef;
  return workflowCaseReferenceLabel(workspaceCase.id, 'maintenance');
}

export function resolveMaintenanceTaskStageIndex(
  workspaceCase: MaintenanceWorkspaceCase,
): number {
  switch (workspaceCase.status) {
    case 'under_review':
    case 'pending_evidence':
      return workspaceCase.responsibility ? 1 : 0;
    case 'pending_quotation':
      return 2;
    case 'pending_approval':
      return 3;
    case 'pending_schedule':
      return 4;
    case 'in_progress':
    case 'completed':
      return workspaceCase.status === 'completed' ? 6 : 5;
    case 'closed':
      return 6;
    default:
      return 0;
  }
}

export function buildMaintenanceTaskStages(workspaceCase: MaintenanceWorkspaceCase): {
  label: string;
  state: MaintenanceTaskStageState;
  dateLabel?: string;
}[] {
  const currentIndex = resolveMaintenanceTaskStageIndex(workspaceCase);
  const created = workspaceCase.createdAt ? formatDate(workspaceCase.createdAt) : undefined;

  return MAINTENANCE_TASK_STAGE_LABELS.map((label, index) => {
    let state: MaintenanceTaskStageState = 'pending';
    if (index < currentIndex) state = 'complete';
    else if (index === currentIndex) state = 'current';
    return {
      label,
      state,
      dateLabel: index === 0 ? created : undefined,
    };
  });
}

export function resolveMaintenanceStatusBanner(input: {
  workspaceCase: MaintenanceWorkspaceCase;
  item: MaintenanceRequest;
  quoteAmount?: number;
  contractorName?: string;
  recommendation?: string;
}): {
  title: string;
  subtitle: string;
  needsAction: boolean;
  crosSummary: string[];
} {
  const { workspaceCase, item, quoteAmount, contractorName, recommendation } = input;
  const ctx = { item, workspaceCase };
  const responsibility = resolveMaintenanceResponsibility(ctx);
  const contractorFlow = requiresContractorFlow(ctx);
  const workflow = buildMaintenanceAgentWorkflow(ctx);
  const closed =
    workspaceCase.status === 'closed' ||
    workspaceCase.status === 'completed' ||
    workspaceCase.status === 'deleted';
  const tenantRejected = isTenantRejectedMaintenance(item);
  const quoteReady =
    contractorFlow &&
    quoteAmount != null &&
    (workspaceCase.status === 'pending_quotation' ||
      workspaceCase.status === 'pending_approval');

  const needsAction =
    tenantRejected && !closed
      ? true
      : !responsibility &&
          (workspaceCase.status === 'under_review' ||
            workspaceCase.status === 'pending_evidence')
        ? true
        : workspaceCase.status === 'pending_evidence'
          ? true
          : responsibility === 'tenant' &&
              workspaceCase.status === 'in_progress' &&
              !workspaceCase.tenantApprovalReceived
            ? true
            : Boolean(quoteReady || item.requiresApproval);

  let title = MAINTENANCE_AGENT_STEP_TITLE[workflow.liveStepId];
  let subtitle = workspaceCase.description;

  if (tenantRejected) {
    title = TENANT_REJECTED_LABEL;
    subtitle =
      tenantRejectionReason(item) ||
      'Tenant disagrees with tenant-responsibility — job stays open until an officer decides';
  } else if (closed) {
    title = workspaceCase.status === 'closed' ? 'Job closed' : 'Job completed';
    subtitle =
      responsibility === 'tenant'
        ? 'Tenant-responsible repair closed'
        : responsibility === 'strata'
          ? 'Strata-responsible repair closed'
          : workspaceCase.description;
  } else if (!responsibility) {
    if (workspaceCase.status === 'pending_evidence') {
      title = 'Requesting more evidence';
      subtitle = 'Waiting for tenant photos or video before assigning responsibility';
    } else {
      title = 'Review required';
      subtitle = 'Confirm whether this is tenant, landlord, or strata responsibility';
    }
  } else if (responsibility === 'tenant') {
    if (workspaceCase.status === 'in_progress') {
      title = 'Tenant acknowledgement';
      subtitle = 'Tenant arranges their own repair — record acknowledgement to close';
    }
  } else if (responsibility === 'strata') {
    if (workspaceCase.status === 'in_progress') {
      title = 'Strata coordinating';
      subtitle = 'CROSSUB is coordinating with the strata body';
    }
  } else if (workspaceCase.status === 'pending_approval' && quoteAmount != null) {
    title = 'Quote received';
    subtitle = [contractorName, `${formatCurrency(quoteAmount)} incl. GST`]
      .filter(Boolean)
      .join(' · ');
  } else if (workspaceCase.status === 'pending_quotation' && quoteAmount != null) {
    title = 'Quote received — awaiting your approval';
    subtitle = [contractorName, `${formatCurrency(quoteAmount)} incl. GST`]
      .filter(Boolean)
      .join(' · ');
  } else if (workspaceCase.status === 'pending_quotation') {
    title = 'Awaiting contractor quote';
    subtitle = contractorName
      ? `Waiting on ${contractorName}`
      : 'Contractors invited to quote';
  } else if (workspaceCase.status === 'pending_schedule') {
    title = 'Schedule visit';
    subtitle = contractorName
      ? `Confirm a visit time with ${contractorName}`
      : 'Contractor to propose visit times';
  }

  const crosSummary = [
    recommendation?.trim() || null,
    tenantRejected && !closed
      ? 'Re-open Review if the tenant should not pay, or keep the job parked until the dispute is settled'
      : null,
    !responsibility && !closed
      ? 'Assign tenant, landlord, or strata before the job can advance'
      : null,
    responsibility === 'tenant' && !closed
      ? 'No contractor quote, completion evidence, or invoice — tenant acknowledgement only'
      : null,
    responsibility === 'strata' && !closed
      ? 'Strata handles the repair — confirm contacts and completion with the body'
      : null,
    quoteReady
      ? `Quote of ${formatCurrency(quoteAmount)} is within expected range — approval recommended`
      : null,
    workspaceCase.priority === 'critical' || workspaceCase.priority === 'high'
      ? 'Priority case — respond promptly'
      : null,
  ].filter((line): line is string => Boolean(line));

  return { title, subtitle, needsAction, crosSummary };
}

export function buildMaintenanceJobDetailRows(input: {
  workspaceCase: MaintenanceWorkspaceCase;
  item: MaintenanceRequest;
  property?: Property | null;
}): { label: string; value: string }[] {
  const { workspaceCase, item, property } = input;
  const priorityLabel =
    workspaceCase.priority === 'critical'
      ? 'Urgent'
      : workspaceCase.priority === 'high'
        ? 'High'
        : workspaceCase.priority === 'low'
          ? 'Low'
          : 'Normal';

  return [
    { label: 'Issue', value: item.description || workspaceCase.description || '—' },
    { label: 'Category', value: item.title || workspaceCase.issueType || '—' },
    {
      label: 'Priority',
      value: priorityLabel,
    },
    {
      label: 'Responsibility',
      value: workspaceCase.responsibility
        ? workspaceCase.responsibility.charAt(0).toUpperCase() +
          workspaceCase.responsibility.slice(1)
        : 'Pending review',
    },
    {
      label: 'Reported by',
      value: workspaceCase.tenant?.name || property?.tenantName || 'Tenant',
    },
    {
      label: 'Reported',
      value: workspaceCase.createdAt
        ? formatDateTime(workspaceCase.createdAt)
        : item.createdAt
          ? formatDateTime(item.createdAt)
          : '—',
    },
    {
      label: 'Access',
      value: property?.tenantName && property.tenantName !== 'Vacant'
        ? 'Tenant will be home'
        : '—',
    },
    {
      label: 'Preferred time',
      value: item.scheduleProposal?.availableTimes || '—',
    },
    {
      label: 'Emergency',
      value: workspaceCase.priority === 'critical' ? 'Yes' : 'No',
    },
    {
      label: 'Source',
      value: SOURCE_LABELS[workspaceCase.source] ?? workspaceCase.source,
    },
    {
      label: 'Reference',
      value: maintenanceTaskReference(workspaceCase, item),
    },
  ];
}

export type MaintenanceQuoteCard = {
  id: string;
  contractorName: string;
  amount: number | null;
  status: string;
  recommended: boolean;
  selected: boolean;
};

export function buildMaintenanceQuoteCards(
  workspaceCase: MaintenanceWorkspaceCase,
  contractorName?: string,
  quoteAmount?: number,
): MaintenanceQuoteCard[] {
  const quotes = [...workspaceCase.quotations].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );

  if (quotes.length === 0 && quoteAmount != null) {
    return [
      {
        id: 'primary',
        contractorName: contractorName || 'Contractor',
        amount: quoteAmount,
        status: 'submitted',
        recommended: true,
        selected: true,
      },
    ];
  }

  return quotes.map((quote, index) => {
    const contractorNameFromInvite = workspaceCase.invitedContractors?.find(
      (row) => row.id === quote.contractorId,
    )?.name;
    return {
      id: quote.id,
      contractorName: contractorNameFromInvite || contractorName || 'Contractor',
      amount: quote.price ?? null,
      status: quote.status,
      recommended: index === 0,
      selected: quote.status === 'approved' || quote.status === 'submitted',
    };
  });
}

export function buildMaintenanceActivityEntries(workspaceCase: MaintenanceWorkspaceCase): {
  id: string;
  at: string;
  title: string;
  actor: string;
}[] {
  return [...workspaceCase.auditEntries]
    .filter((entry) => !isMaintenanceEmailSnapshotAudit(entry.action, entry.message))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .map((entry) => ({
      id: entry.id,
      at: entry.timestamp,
      title: formatMaintenanceAuditMessage(entry.message),
      actor: entry.actor || 'CROS System',
    }))
    .filter((entry) => entry.title.length > 0);
}

export function buildMaintenanceWorkflowContext(
  item: MaintenanceRequest,
  workspaceCase: MaintenanceWorkspaceCase,
  evidenceAttachmentCount?: number,
): MaintenanceWorkflowContext {
  return { item, workspaceCase, evidenceAttachmentCount };
}

export function buildMaintenanceWorkflowModel(ctx: MaintenanceWorkflowContext) {
  return buildMaintenanceAgentWorkflow(ctx);
}

export function quotationCount(workspaceCase: MaintenanceWorkspaceCase): number {
  return Math.max(workspaceCase.quotations.length, workspaceCase.quotationIds.length);
}

export const MAINTENANCE_DOCUMENT_TABS = [
  'Completion evidence',
  'Invoice',
  'Quote',
] as const;

export type MaintenanceDocumentTab = (typeof MAINTENANCE_DOCUMENT_TABS)[number];

export type MaintenanceDocumentRow = {
  id: string;
  fileName: string;
  attachment: ApiMaintenanceAttachment;
};

export type MaintenanceDocumentPersonGroup = {
  id: string;
  from: string;
  documents: MaintenanceDocumentRow[];
};

export type MaintenanceDocumentTabGroup = {
  tab: MaintenanceDocumentTab;
  people: MaintenanceDocumentPersonGroup[];
};

function uploadedByLabel(role: ApiMaintenanceAttachment['uploadedByRole']): string {
  switch (role) {
    case 'contractor':
      return 'Contractor';
    case 'agent':
      return 'Agent';
    case 'tenant':
      return 'Tenant';
    case 'strata':
      return 'Strata';
    default:
      return 'CROS System';
  }
}

function groupAttachmentsByUploader(
  attachments: ApiMaintenanceAttachment[],
): MaintenanceDocumentPersonGroup[] {
  const byUploader = new Map<string, MaintenanceDocumentRow[]>();
  const sorted = [...attachments].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
  for (const attachment of sorted) {
    const from = uploadedByLabel(attachment.uploadedByRole);
    const rows = byUploader.get(from) ?? [];
    rows.push({
      id: attachment.id,
      fileName: attachment.fileName,
      attachment,
    });
    byUploader.set(from, rows);
  }
  return [...byUploader.entries()].map(([from, documents]) => ({
    id: from,
    from,
    documents,
  }));
}

/** Documents tab: completion evidence, invoice, then quote files. */
export function buildMaintenanceDocumentGroups(
  attachments: ApiMaintenanceAttachment[] | undefined,
  requestId: string,
): MaintenanceDocumentTabGroup[] {
  const forRequest = (attachments ?? []).filter((row) => row.maintenanceRequestId === requestId);
  const groups: MaintenanceDocumentTabGroup[] = [];

  const evidence = forRequest.filter((row) => row.kind === 'evidence');
  const invoices = forRequest.filter((row) => row.kind === 'invoice');
  const quotes = forRequest.filter((row) => row.kind === 'quote');

  if (evidence.length > 0) {
    groups.push({ tab: 'Completion evidence', people: groupAttachmentsByUploader(evidence) });
  }
  if (invoices.length > 0) {
    groups.push({ tab: 'Invoice', people: groupAttachmentsByUploader(invoices) });
  }
  if (quotes.length > 0) {
    groups.push({ tab: 'Quote', people: groupAttachmentsByUploader(quotes) });
  }

  return groups;
}

export function maintenanceDocumentCount(
  attachments: ApiMaintenanceAttachment[] | undefined,
  requestId: string,
): number {
  return buildMaintenanceDocumentGroups(attachments, requestId).reduce(
    (sum, group) => sum + group.people.reduce((n, person) => n + person.documents.length, 0),
    0,
  );
}

