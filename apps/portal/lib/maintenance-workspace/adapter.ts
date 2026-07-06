import type { MappedMaintenance } from '@/lib/data/map-maintenance';
import type { MaintenanceRequest, Property } from '@/lib/types';
import type { AuthUser } from '@/lib/auth-types';

import type { MaintenanceWorkspaceCase, MaintenanceWorkspaceStatus } from './types';

const REQUEST_STATUS_MAP: Record<string, MaintenanceWorkspaceStatus> = {
  'under review': 'under_review',
  'quote approval': 'pending_approval',
  'pending quotation': 'pending_quotation',
  'in progress': 'in_progress',
  completed: 'completed',
  closed: 'closed',
};

const REQUEST_PRIORITY_MAP: Record<string, MaintenanceWorkspaceCase['priority']> = {
  urgent: 'critical',
  high: 'high',
  normal: 'medium',
  low: 'low',
};

function mapRequestStatus(status: string): MaintenanceWorkspaceStatus {
  return REQUEST_STATUS_MAP[status.toLowerCase()] ?? 'under_review';
}

function mapRequestPriority(priority: string): MaintenanceWorkspaceCase['priority'] {
  return REQUEST_PRIORITY_MAP[priority] ?? 'medium';
}

function timelineToAudit(
  item: MaintenanceRequest,
): MaintenanceWorkspaceCase['auditEntries'] {
  return item.timeline.map((entry) => ({
    id: entry.id,
    maintenanceRequestId: item.id,
    action: 'status_transition',
    message: entry.detail ? `${entry.title} — ${entry.detail}` : entry.title,
    actor:
      entry.actorRole === 'agent'
        ? 'agent'
        : entry.actorRole === 'contractor'
          ? 'contractor'
          : 'system',
    timestamp: entry.at,
  }));
}

export function buildWorkspaceCaseFromApi(
  mapped: MappedMaintenance,
  property?: Property,
  agent?: AuthUser | null,
): MaintenanceWorkspaceCase {
  const req = mapped.apiRequest;
  return {
    id: req.id,
    issueType: req.issueType,
    description: req.description,
    address: req.address,
    priority: req.priority,
    responsibility: req.responsibility,
    status: req.status,
    createdAt: req.createdAt,
    dueAt: req.dueAt,
    source: req.source,
    assignedContractorId: req.assignedContractorId,
    quotationIds: req.quotationIds ?? [],
    completionEvidenceUploaded: req.completionEvidenceUploaded,
    tenantApprovalReceived: req.tenantApprovalReceived,
    invoiceUploaded: req.invoiceUploaded,
    tenant: property
      ? {
          name: property.tenantName,
          email: property.tenantContact.email,
          phone: property.tenantContact.phone,
        }
      : undefined,
    agent: agent
      ? {
          name: [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.email,
          email: agent.email,
          phone: agent.phone ?? undefined,
        }
      : undefined,
    auditEntries: mapped.auditEntries,
    quotations: mapped.apiQuotations,
    notifications: mapped.apiNotifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      channel: n.channel,
      createdAt: n.createdAt,
      read: n.read,
    })),
  };
}

export function buildWorkspaceCaseFromRequest(
  item: MaintenanceRequest,
  property?: Property,
  agent?: AuthUser | null,
): MaintenanceWorkspaceCase {
  const firstTimeline = item.timeline[0]?.at ?? new Date().toISOString();
  const responsibility =
    item.responsibility === 'pending' ? undefined : item.responsibility;

  return {
    id: item.id,
    issueType: item.title,
    description: item.description,
    address: item.propertyAddress,
    priority: mapRequestPriority(item.priority),
    responsibility,
    status: mapRequestStatus(item.status),
    createdAt: firstTimeline,
    dueAt: item.quoteExpiry ?? firstTimeline,
    source: 'agent_submission',
    assignedContractorId: item.contractorName ? `contractor-${item.id}` : undefined,
    quotationIds: item.submittedQuotationId ? [item.submittedQuotationId] : [],
    completionEvidenceUploaded: item.completionEvidenceUploaded,
    invoiceUploaded: item.invoiceUploaded,
    tenant: property
      ? {
          name: property.tenantName,
          email: property.tenantContact.email,
          phone: property.tenantContact.phone,
        }
      : undefined,
    agent: agent
      ? {
          name: [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.email,
          email: agent.email,
          phone: agent.phone ?? undefined,
        }
      : undefined,
    auditEntries: timelineToAudit(item),
    quotations: item.quoteAmount
      ? [
          {
            id: item.submittedQuotationId ?? `quote-${item.id}`,
            maintenanceRequestId: item.id,
            contractorId: `contractor-${item.id}`,
            price: item.quoteAmount,
            currency: 'AUD',
            scope: item.recommendation ?? item.description,
            availableSchedule: item.quoteExpiry ?? firstTimeline,
            submittedAt: firstTimeline,
            status: item.requiresApproval ? 'submitted' : 'approved',
          },
        ]
      : [],
    notifications: item.timeline.map((entry, index) => ({
      id: `timeline-notif-${entry.id}`,
      title: entry.title,
      message: entry.detail ?? entry.title,
      channel: entry.source === 'email' ? ('email' as const) : ('in_app' as const),
      createdAt: entry.at,
      read: index > 0,
    })),
  };
}
