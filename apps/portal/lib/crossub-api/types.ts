/** Types mirrored from crossub_web apps/api maintenance module */

export type ApiMaintenanceStatus =
  | 'under_review'
  | 'pending_quotation'
  | 'pending_approval'
  | 'in_progress'
  | 'completed'
  | 'closed';

export type ApiMaintenancePriority = 'low' | 'medium' | 'high' | 'critical';
export type ApiMaintenanceResponsibility = 'tenant' | 'landlord' | 'strata';
export type ApiMaintenanceUserRole =
  | 'tenant'
  | 'agent'
  | 'admin'
  | 'contractor'
  | 'strata';

export interface ApiContractor {
  id: string;
  name: string;
  rating: number;
  distanceKm?: number;
}

export interface ApiQuotation {
  id: string;
  maintenanceRequestId: string;
  contractorId: string;
  price: number;
  currency: 'AUD';
  scope: string;
  availableSchedule: string;
  submittedAt: string;
  status: 'submitted' | 'approved' | 'declined';
  declineReason?: string;
  lineItems?: QuotationLineItem[];
  comments?: string;
}

export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPriceExGst: number;
  gst: number;
  amountIncGst: number;
}

export interface ApiMaintenanceParty {
  name: string;
  email?: string;
  phone?: string;
}

export interface ApiMaintenanceRequest {
  id: string;
  propertyId?: string;
  agencyId?: string;
  issueType: string;
  description: string;
  address: string;
  priority: ApiMaintenancePriority;
  responsibility?: ApiMaintenanceResponsibility;
  status: ApiMaintenanceStatus;
  createdAt: string;
  dueAt: string;
  source: 'tenant_app' | 'agent_submission' | 'email';
  tenant?: ApiMaintenanceParty;
  agent?: ApiMaintenanceParty;
  assignedContractorId?: string;
  assignedContractor?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  invitedContractorIds?: string[];
  quotationIds: string[];
  completionEvidenceUploaded?: boolean;
  tenantApprovalReceived?: boolean;
  invoiceUploaded?: boolean;
  timeline: { status: ApiMaintenanceStatus; enteredAt: string; exitedAt?: string }[];
}

export interface ApiMaintenanceAuditLogEntry {
  id: string;
  maintenanceRequestId: string;
  action: string;
  message: string;
  actor: 'system' | 'admin' | 'agent' | 'contractor';
  timestamp: string;
}

export interface ApiMaintenanceNotification {
  id: string;
  maintenanceRequestId: string;
  channel: 'in_app' | 'email';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface ApiMaintenanceAttachment {
  id: string;
  maintenanceRequestId: string;
  quotationId?: string;
  kind: 'initial_evidence' | 'evidence' | 'invoice' | 'quote';
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByRole: ApiMaintenanceUserRole;
  previewUrl?: string;
}

export interface ApiMaintenanceState {
  maintenanceRequests: ApiMaintenanceRequest[];
  contractors: ApiContractor[];
  quotations: ApiQuotation[];
  maintenanceAuditLog: ApiMaintenanceAuditLogEntry[];
  maintenanceNotifications: ApiMaintenanceNotification[];
  maintenanceAttachments?: ApiMaintenanceAttachment[];
  maintenanceReminders: {
    id: string;
    maintenanceRequestId: string;
    type: 'reminder' | 'escalation';
    dueAt: string;
  }[];
  lastMaintenanceError: string | null;
}

export interface ApiMaintenanceKpis {
  total: number;
  overdue: number;
  breachRate: number;
}
