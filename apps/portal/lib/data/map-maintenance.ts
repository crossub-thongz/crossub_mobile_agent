import type {
  ApiContractor,
  ApiMaintenanceAuditLogEntry,
  ApiMaintenanceNotification,
  ApiMaintenanceRequest,
  ApiQuotation,
} from '@/lib/crossub-api/types';
import type { MaintenanceRequest, Priority, TimelineEntry } from '@/lib/types';
import { maintenanceDetail } from '@/constants/routes';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

const STATUS_LABEL: Record<string, string> = {
  under_review: 'Under review',
  pending_quotation: 'Pending quotation',
  pending_approval: 'Quote approval',
  in_progress: 'In progress',
  completed: 'Completed',
  closed: 'Closed',
};

const PRIORITY_MAP: Record<string, Priority> = {
  critical: 'urgent',
  high: 'high',
  medium: 'normal',
  low: 'low',
};

function auditToTimeline(entries: ApiMaintenanceAuditLogEntry[]): TimelineEntry[] {
  return entries.map((e) => ({
    id: e.id,
    at: e.timestamp,
    actor: e.actor === 'agent' ? 'Agent' : e.actor === 'admin' ? 'CROSSUB' : e.actor,
    actorRole:
      e.actor === 'agent'
        ? 'agent'
        : e.actor === 'contractor'
          ? 'contractor'
          : 'crossub',
    title: e.message,
    source: e.actor === 'system' ? 'system' : 'app',
    staffAssisted:
      e.actor === 'admin' &&
      (e.message.toLowerCase().includes('on behalf') ||
        e.message.toLowerCase().includes('staff assisted') ||
        e.action.includes('assisted')),
  }));
}

export interface MappedMaintenance extends MaintenanceRequest {
  source: 'api';
  submittedQuotationId?: string;
  invoiceUploaded?: boolean;
  completionEvidenceUploaded?: boolean;
  auditTimeline: TimelineEntry[];
  apiNotifications: ApiMaintenanceNotification[];
  apiRequest: ApiMaintenanceRequest;
  auditEntries: ApiMaintenanceAuditLogEntry[];
  apiQuotations: ApiQuotation[];
}

export function mapApiMaintenanceRequest(
  req: ApiMaintenanceRequest,
  contractors: ApiContractor[],
  quotations: ApiQuotation[],
  auditLog: ApiMaintenanceAuditLogEntry[],
  notifications: ApiMaintenanceNotification[],
): MappedMaintenance {
  const submittedQuote = quotations.find(
    (q) =>
      q.maintenanceRequestId === req.id &&
      q.status === 'submitted' &&
      (req.quotationIds ?? []).includes(q.id),
  );
  const latestQuote = quotations.find(
    (q) =>
      q.maintenanceRequestId === req.id &&
      (req.quotationIds ?? []).includes(q.id),
  );
  const contractorId =
    req.assignedContractorId ?? submittedQuote?.contractorId ?? latestQuote?.contractorId;
  const contractor = contractors.find((c) => c.id === contractorId);

  const reqAudit = auditLog.filter((a) => a.maintenanceRequestId === req.id);
  const reqNotifications = notifications.filter(
    (n) => n.maintenanceRequestId === req.id,
  );

  return {
    id: req.id,
    trackingNumber: workflowCaseReferenceLabel(req.id, 'maintenance'),
    propertyId: req.id,
    propertyAddress: req.address,
    title: req.issueType,
    description: req.description,
    status: STATUS_LABEL[req.status] ?? req.status,
    priority: PRIORITY_MAP[req.priority] ?? 'normal',
    responsibility: req.responsibility ?? 'pending',
    contractorName: contractor?.name,
    quoteAmount: submittedQuote?.price ?? latestQuote?.price,
    quoteExpiry: submittedQuote?.availableSchedule,
    recommendation:
      req.responsibility === 'landlord' && submittedQuote
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
      req.status === 'pending_approval' &&
      req.responsibility === 'landlord' &&
      !!submittedQuote,
    timeline: auditToTimeline(reqAudit),
    source: 'api',
    submittedQuotationId: submittedQuote?.id,
    invoiceUploaded: req.invoiceUploaded,
    completionEvidenceUploaded: req.completionEvidenceUploaded,
    auditTimeline: auditToTimeline(reqAudit),
    apiNotifications: reqNotifications,
    apiRequest: req,
    auditEntries: reqAudit,
    apiQuotations: quotations.filter((q) => q.maintenanceRequestId === req.id),
  };
}

export function maintenanceNotificationsToAgent(
  notifications: ApiMaintenanceNotification[],
  requests: ApiMaintenanceRequest[],
) {
  return (notifications ?? []).map((n) => {
    const req = requests.find((r) => r.id === n.maintenanceRequestId);
    return {
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
    };
  });
}
