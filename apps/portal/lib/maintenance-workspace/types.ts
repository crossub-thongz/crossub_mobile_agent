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
  tenantApprovalReceived?: boolean;
  invoiceUploaded?: boolean;
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
