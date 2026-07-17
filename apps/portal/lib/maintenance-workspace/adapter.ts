import type { ApiMaintenanceParty } from '@/lib/crossub-api/types';
import type { MappedMaintenance } from '@/lib/data/map-maintenance';
import {
  inferInvitedContractorIdsFromAudit,
  inferResponsibilityFromAudit,
} from '@/lib/maintenance/infer-responsibility';
import type { MaintenanceRequest, Property } from '@/lib/types';
import type { AuthUser } from '@/lib/auth-types';
import { MAINTENANCE_STATUS } from '@/constants/api-enums';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

import type { MaintenanceWorkspaceCase, MaintenanceWorkspaceParty, MaintenanceWorkspaceStatus } from './types';

const REQUEST_STATUS_MAP: Record<string, MaintenanceWorkspaceStatus> = {
  'under review': 'under_review',
  'quote approval': 'pending_approval',
  'pending quotation': 'pending_quotation',
  'in progress': 'in_progress',
  completed: 'completed',
  closed: 'closed',
  deleted: 'deleted',
};

const API_MAINTENANCE_STATUS_MAP: Record<string, MaintenanceWorkspaceStatus> = {
  [MAINTENANCE_STATUS.OPEN]: 'under_review',
  [MAINTENANCE_STATUS.APPROVED]: 'pending_quotation',
  [MAINTENANCE_STATUS.QUOTING]: 'pending_approval',
  [MAINTENANCE_STATUS.SCHEDULED]: 'in_progress',
  [MAINTENANCE_STATUS.INVOICED]: 'in_progress',
  [MAINTENANCE_STATUS.COMPLETED]: 'completed',
  [MAINTENANCE_STATUS.CANCELLED]: 'deleted',
};

function mapRequestStatus(status: string, apiStatus?: string): MaintenanceWorkspaceStatus {
  if (apiStatus && API_MAINTENANCE_STATUS_MAP[apiStatus]) {
    return API_MAINTENANCE_STATUS_MAP[apiStatus];
  }
  return REQUEST_STATUS_MAP[status.toLowerCase()] ?? 'under_review';
}

const REQUEST_PRIORITY_MAP: Record<string, MaintenanceWorkspaceCase['priority']> = {
  urgent: 'critical',
  high: 'high',
  normal: 'medium',
  low: 'low',
};

function mapRequestPriority(priority: string): MaintenanceWorkspaceCase['priority'] {
  return REQUEST_PRIORITY_MAP[priority] ?? 'medium';
}

function tenantFromProperty(property: Property): MaintenanceWorkspaceParty {
  return {
    name: property.tenantName,
    email: property.tenantContact.email,
    phone: property.tenantContact.phone,
  };
}

function resolveWorkspaceTenant(
  fromRequest?: ApiMaintenanceParty,
  property?: Property,
): MaintenanceWorkspaceParty | undefined {
  const fromProperty = property ? tenantFromProperty(property) : undefined;
  if (!fromRequest && !fromProperty) return undefined;
  return {
    name: fromRequest?.name?.trim() || fromProperty?.name || '—',
    email: fromRequest?.email?.trim() || fromProperty?.email,
    phone: fromRequest?.phone?.trim() || fromProperty?.phone,
  };
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
  const responsibility =
    (mapped.responsibility !== 'pending' ? mapped.responsibility : undefined) ??
    req.responsibility ??
    inferResponsibilityFromAudit(mapped.auditEntries);
  const invitedContractorIds =
    req.invitedContractorIds?.length
      ? req.invitedContractorIds
      : inferInvitedContractorIdsFromAudit(mapped.auditEntries);
  return {
    id: req.id,
    caseRef: workflowCaseReferenceLabel(req.id, 'maintenance'),
    issueType: req.issueType,
    description: req.description,
    address: req.address,
    priority: req.priority,
    responsibility,
    status: req.status,
    createdAt: req.createdAt,
    dueAt: req.dueAt,
    source: req.source,
    assignedContractorId: req.assignedContractorId,
    invitedContractorIds: invitedContractorIds.length ? invitedContractorIds : undefined,
    invitedContractors: req.invitedContractors,
    quotationReviews: req.quotationReviews,
    quotationIds: req.quotationIds ?? [],
    completionEvidenceUploaded: req.completionEvidenceUploaded,
    tenantApprovalReceived: req.tenantApprovalReceived,
    invoiceUploaded: req.invoiceUploaded,
    tenant: resolveWorkspaceTenant(req.tenant, property),
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
  const auditEntries = timelineToAudit(item);
  const responsibility =
    item.responsibility === 'pending'
      ? inferResponsibilityFromAudit(auditEntries)
      : item.responsibility;
  const invitedContractorIds =
    item.invitedContractorIds?.length
      ? item.invitedContractorIds
      : inferInvitedContractorIdsFromAudit(auditEntries);

  return {
    id: item.id,
    caseRef: workflowCaseReferenceLabel(item.id, 'maintenance'),
    issueType: item.title,
    description: item.description,
    address: item.propertyAddress,
    priority: mapRequestPriority(item.priority),
    responsibility,
    status: mapRequestStatus(item.status, item.apiStatus),
    createdAt: firstTimeline,
    dueAt: item.quoteExpiry ?? firstTimeline,
    source: 'agent_submission',
    assignedContractorId: item.contractorName ? `contractor-${item.id}` : undefined,
    invitedContractorIds: invitedContractorIds.length ? invitedContractorIds : undefined,
    quotationIds: item.submittedQuotationId ? [item.submittedQuotationId] : [],
    completionEvidenceUploaded: item.completionEvidenceUploaded,
    invoiceUploaded: item.invoiceUploaded,
    tenant: resolveWorkspaceTenant(undefined, property),
    agent: agent
      ? {
          name: [agent.firstName, agent.lastName].filter(Boolean).join(' ') || agent.email,
          email: agent.email,
          phone: agent.phone ?? undefined,
        }
      : undefined,
    auditEntries,
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
