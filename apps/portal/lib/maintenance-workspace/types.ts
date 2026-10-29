import type {
  ApiMaintenanceAuditLogEntry,
  ApiMaintenancePriority,
  ApiMaintenanceRequest,
  ApiMaintenanceResponsibility,
  ApiMaintenanceStatus,
  ApiQuotation,
  QuotationReviewRecord,
} from '@/lib/crossub-api/types';

export type MaintenanceWorkspaceStatus = ApiMaintenanceStatus | 'pending_evidence';

export interface MaintenanceWorkspaceParty {
  name: string;
  email?: string;
  phone?: string;
}

export interface MaintenanceWorkspaceCase {
  id: string;
  /** Compact case ref (e.g. M-59034714) — shown in the workspace header. */
  caseRef: string;
  issueType: string;
  description: string;
  address: string;
  priority: ApiMaintenancePriority;
  responsibility?: ApiMaintenanceResponsibility;
  status: MaintenanceWorkspaceStatus;
  createdAt: string;
  dueAt: string;
  source: ApiMaintenanceRequest['source'];
  assignedContractorId?: string;
  invitedContractorIds?: string[];
  invitedContractors?: Array<{ id: string; name: string }>;
  quotationReviews?: QuotationReviewRecord[];
  quotationIds: string[];
  completionEvidenceUploaded?: boolean;
  agentApprovalReceived?: boolean;
  tenantApprovalReceived?: boolean;
  /** Start of the booked visit; absent until the tenant picks a time or the officer records one. */
  scheduledVisitAt?: string;
  /** The booked visit window as agreed, e.g. "Tue 03/11/2026 10:00 – 12:00 AEDT". */
  visitWindow?: string;
  invoiceUploaded?: boolean;
  contractorInvoiceNumber?: string;
  contractorInvoiceAmount?: number;
  contractorInvoiceDate?: string;
  tenant?: MaintenanceWorkspaceParty;
  agent?: MaintenanceWorkspaceParty;
  buildingName?: string | null;
  strataPlanNumber?: string | null;
  buildingManager?: MaintenanceWorkspaceParty;
  strataContact?: MaintenanceWorkspaceParty;
  auditEntries: ApiMaintenanceAuditLogEntry[];
  quotations: ApiQuotation[];
  notifications: {
    id: string;
    title: string;
    message: string;
    channel: 'in_app' | 'email';
    createdAt: string;
    read: boolean;
  }[];
}

export type WorkspaceResponsibility = ApiMaintenanceResponsibility;
