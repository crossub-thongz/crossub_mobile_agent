import type {
  ApiContractor,
  ApiMaintenanceAuditLogEntry,
  ApiMaintenanceNotification,
  ApiMaintenanceRequest,
  ApiQuotation,
} from '@/lib/crossub-api/types';
import { inferInvitedContractorIdsFromAudit, resolveResponsibilityFromSources } from '@/lib/maintenance/infer-responsibility';
import { contractorIdsMatch } from '@/lib/maintenance/resolve-contractor-display';
import {
  formatMaintenanceAuditMessage,
  isMaintenanceEmailSnapshotAudit,
} from '@/lib/maintenance/format-audit-message';
import type { MaintenanceRequest, Priority, TimelineEntry } from '@/lib/types';
import { maintenanceDetail } from '@/constants/routes';
import { MAINTENANCE_STATUS } from '@/constants/api-enums';
import { maintenanceReferenceLabel } from '@/lib/workflow-case-reference';

const STATUS_LABEL: Record<string, string> = {
  under_review: 'Under review',
  pending_evidence: 'Requesting evidence',
  pending_quotation: 'Pending quotation',
  pending_approval: 'Quote approval',
  pending_schedule: 'Schedule visit',
  in_progress: 'In progress',
  completed: 'Completed',
  closed: 'Closed',
  deleted: 'Deleted',
};

const PRIORITY_MAP: Record<string, Priority> = {
  critical: 'urgent',
  high: 'high',
  medium: 'normal',
  low: 'low',
};

function dedupeAuditEntries(
  entries: ApiMaintenanceAuditLogEntry[],
): ApiMaintenanceAuditLogEntry[] {
  const seen = new Set<string>();
  return entries.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

/** Newest live submitted quote — prefer the assigned contractor when several are on the board. */
export function pickLatestSubmittedQuote(
  quotations: ApiQuotation[],
  req: Pick<ApiMaintenanceRequest, 'id' | 'quotationIds' | 'assignedContractorId'>,
): ApiQuotation | undefined {
  const ids = req.quotationIds ?? [];
  const submitted = quotations
    .filter(
      (q) =>
        q.maintenanceRequestId === req.id &&
        q.status === 'submitted' &&
        (ids.length === 0 || ids.includes(q.id)),
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  if (req.assignedContractorId) {
    const forAssigned = submitted.find((q) =>
      contractorIdsMatch(q.contractorId, req.assignedContractorId!),
    );
    if (forAssigned) return forAssigned;
  }
  return submitted[0];
}

function pickLatestQuote(
  quotations: ApiQuotation[],
  req: Pick<ApiMaintenanceRequest, 'id' | 'quotationIds'>,
  status: ApiQuotation['status'],
): ApiQuotation | undefined {
  const ids = req.quotationIds ?? [];
  return quotations
    .filter(
      (q) =>
        q.maintenanceRequestId === req.id &&
        q.status === status &&
        (ids.length === 0 || ids.includes(q.id)),
    )
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
}

function auditToTimeline(entries: ApiMaintenanceAuditLogEntry[]): TimelineEntry[] {
  return entries
    .filter((e) => !isMaintenanceEmailSnapshotAudit(e.action, e.message))
    .map((e) => ({
      id: e.id,
      at: e.timestamp,
      actor: e.actor === 'agent' ? 'Agent' : e.actor === 'admin' ? 'CROSSUB' : e.actor,
      actorRole:
        e.actor === 'agent'
          ? 'agent'
          : e.actor === 'contractor'
            ? 'contractor'
            : 'crossub',
      title: formatMaintenanceAuditMessage(e.message),
      source: e.actor === 'system' ? 'system' : 'app',
      staffAssisted:
        e.actor === 'admin' &&
        (e.message.toLowerCase().includes('on behalf') ||
          e.message.toLowerCase().includes('staff assisted') ||
          e.action.includes('assisted')),
    }));
}

export interface MappedMaintenance extends MaintenanceRequest {
  /** Set below and read via the workspace adapter — the agent-approval completion gate. */
  agentApprovalReceived?: boolean;
  source: 'api';
  submittedQuotationId?: string;
  invoiceUploaded?: boolean;
  completionEvidenceUploaded?: boolean;
  auditTimeline: TimelineEntry[];
  apiNotifications: ApiMaintenanceNotification[];
  apiRequest: ApiMaintenanceRequest;
  auditEntries: ApiMaintenanceAuditLogEntry[];
  apiQuotations: ApiQuotation[];
  invitedContractorIds?: string[];
}

export function mapApiMaintenanceRequest(
  req: ApiMaintenanceRequest,
  contractors: ApiContractor[],
  quotations: ApiQuotation[],
  auditLog: ApiMaintenanceAuditLogEntry[],
  notifications: ApiMaintenanceNotification[],
): MappedMaintenance {
  const submittedQuote = pickLatestSubmittedQuote(quotations, req);
  const approvedQuote = pickLatestQuote(quotations, req, 'approved');
  const latestQuote =
    submittedQuote ??
    approvedQuote ??
    quotations
      .filter(
        (q) =>
          q.maintenanceRequestId === req.id &&
          (req.quotationIds ?? []).includes(q.id),
      )
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];
  const contractorId =
    req.assignedContractorId ??
    approvedQuote?.contractorId ??
    submittedQuote?.contractorId ??
    latestQuote?.contractorId;
  const contractor = contractors.find((c) => contractorIdsMatch(c.id, contractorId ?? ''));

  const reqAudit = dedupeAuditEntries(
    auditLog.filter((a) => a.maintenanceRequestId === req.id),
  );
  const reqNotifications = notifications.filter(
    (n) => n.maintenanceRequestId === req.id,
  );
  const resolvedResponsibility =
    resolveResponsibilityFromSources({
      explicit: req.responsibility,
      auditEntries: reqAudit,
      notifications: reqNotifications,
      status: req.status,
      assignedContractorId: req.assignedContractorId,
      invitedContractorIds: req.invitedContractorIds,
      quotationIds: req.quotationIds,
      quotationsCount: quotations.filter((q) => q.maintenanceRequestId === req.id).length,
      contractorName: contractor?.name,
      requiresApproval: req.status === 'pending_approval',
    }) ?? 'pending';
  const resolvedInvitedContractorIds =
    req.invitedContractorIds?.length
      ? req.invitedContractorIds
      : inferInvitedContractorIdsFromAudit(reqAudit);

  return {
    id: req.id,
    trackingNumber: maintenanceReferenceLabel(req.orderNumber, req.id),
    propertyId: req.id,
    propertyAddress: req.address,
    title: req.issueType,
    description: req.description,
    status: STATUS_LABEL[req.status] ?? req.status,
    apiStatus: req.status === 'deleted' ? MAINTENANCE_STATUS.CANCELLED : undefined,
    priority: PRIORITY_MAP[req.priority] ?? 'normal',
    responsibility: resolvedResponsibility,
    contractorName: contractor?.name,
    quoteAmount: approvedQuote?.price ?? submittedQuote?.price ?? latestQuote?.price,
    quoteExpiry: (approvedQuote ?? submittedQuote)?.availableSchedule,
    recommendation:
      resolvedResponsibility === 'landlord' && submittedQuote
        ? submittedQuote.scope
        : undefined,
    contractorStatus: contractor
      ? submittedQuote
        ? 'pending'
        : req.status === 'in_progress'
          ? 'accepted'
          : 'pending'
      : undefined,
    quoteDocumentUrl: submittedQuote ? `#quote-${submittedQuote.id}` : undefined,
    requiresApproval:
      resolvedResponsibility === 'landlord' &&
      !!submittedQuote &&
      (req.status === 'pending_approval' || req.status === 'pending_quotation'),
    timeline: auditToTimeline(reqAudit),
    source: 'api',
    submittedQuotationId: submittedQuote?.id,
    invoiceUploaded: req.invoiceUploaded,
    completionEvidenceUploaded: req.completionEvidenceUploaded,
    tenantResponsibilityResponse: req.tenantResponsibilityResponse,
    agentApprovalReceived: req.agentApprovalReceived,
    auditTimeline: auditToTimeline(reqAudit),
    apiNotifications: reqNotifications,
    apiRequest: req,
    auditEntries: reqAudit,
    apiQuotations: quotations.filter((q) => q.maintenanceRequestId === req.id),
    invitedContractorIds: resolvedInvitedContractorIds.length
      ? resolvedInvitedContractorIds
      : undefined,
    invitedContractors: req.invitedContractors,
    deleteReason: req.deleteReason,
    deletedAt: req.deletedAt,
    scheduleStepStartedAt: req.scheduleStepStartedAt,
    scheduleProposal: req.scheduleProposal,
    scheduleEscalated: req.scheduleEscalated,
    endLeasingLandlordResp: req.endLeasingLandlordResp,
    endLeasingMaintenance: req.endLeasingMaintenance,
  };
}

export function maintenanceNotificationsToAgent(
  notifications: ApiMaintenanceNotification[],
  requests: ApiMaintenanceRequest[],
) {
  return (notifications ?? []).flatMap((n) => {
    const req = requests.find((r) => r.id === n.maintenanceRequestId);
    if (req?.endLeasingMaintenance || req?.issueType?.trim().toLowerCase() === 'end of lease') {
      return [];
    }
    return [
      {
        id: n.id,
        type: n.title.toLowerCase().includes('declin')
          ? ('update' as const)
          : n.title.toLowerCase().includes('quotation')
            ? ('approval' as const)
            : ('update' as const),
        title: n.title,
        body: n.message,
        propertyAddress: req?.address ?? n.maintenanceRequestId,
        taskType: 'Maintenance',
        status: 'Active',
        at: n.createdAt,
        read: n.read,
        href: maintenanceDetail(n.maintenanceRequestId),
        actionRequired: n.title.includes('Quotation') ? 'Review quote' : undefined,
        source: 'api' as const,
      },
    ];
  });
}
