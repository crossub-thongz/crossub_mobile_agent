import type { ApiQuotation } from '@/lib/crossub-api/types';
import {
  buildMaintenanceAgentWorkflow,
  type MaintenanceWorkflowContext,
} from '@/lib/maintenance/agent-workflow-model';
import {
  formatMaintenanceAuditMessage,
  isMaintenanceEmailSnapshotAudit,
} from '@/lib/maintenance/format-audit-message';
import type { MaintenanceWorkspaceCase } from '@/lib/maintenance-workspace/types';
import { SOURCE_LABELS } from '@/lib/maintenance-workspace/status-labels';
import type { MaintenanceRequest, Property } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

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
  return (
    workspaceCase.caseRef ||
    item?.trackingNumber ||
    workflowCaseReferenceLabel(workspaceCase.id, 'maintenance')
  );
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
  const needsAction = item.requiresApproval || workspaceCase.status === 'pending_approval';

  let title = 'Maintenance in progress';
  let subtitle = workspaceCase.description;

  if (workspaceCase.status === 'pending_approval' && quoteAmount != null) {
    title = 'Quote received';
    subtitle = [
      contractorName,
      `${formatCurrency(quoteAmount)} incl. GST`,
    ]
      .filter(Boolean)
      .join(' · ');
  } else if (workspaceCase.status === 'pending_quotation') {
    title = 'Awaiting contractor quote';
    subtitle = contractorName
      ? `Waiting on ${contractorName}`
      : 'Contractors invited to quote';
  } else if (workspaceCase.status === 'under_review') {
    title = 'Review required';
    subtitle = 'Confirm responsibility and next steps';
  }

  const crosSummary = [
    recommendation?.trim() || null,
    needsAction && quoteAmount != null
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
      label: 'Case ref',
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
): MaintenanceWorkflowContext {
  return { item, workspaceCase };
}

export function buildMaintenanceWorkflowModel(ctx: MaintenanceWorkflowContext) {
  return buildMaintenanceAgentWorkflow(ctx);
}

export function quotationCount(workspaceCase: MaintenanceWorkspaceCase): number {
  return Math.max(workspaceCase.quotations.length, workspaceCase.quotationIds.length);
}
