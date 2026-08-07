/** Types mirrored from crossub_web apps/api maintenance module */

export type ApiMaintenanceStatus =
  | 'under_review'
  | 'pending_evidence'
  | 'pending_quotation'
  | 'pending_approval'
  | 'pending_schedule'
  | 'in_progress'
  | 'completed'
  | 'closed'
  | 'deleted';

export interface ApiMaintenanceScheduleProposal {
  contractorId: string;
  availableTimes: string;
  submittedAt: string;
  tenantDecision?: 'approved' | 'declined';
  tenantDecidedAt?: string;
  tenantDeclineReason?: string;
}

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
  declinedBy?: 'contractor' | 'admin' | 'agent';
  lineItems?: QuotationLineItem[];
  comments?: string;
}

export type QuotationLineGstMode = 'include' | 'exclude';

export interface QuotationLineItem {
  id: string;
  description: string;
  quantity: number;
  gstMode?: QuotationLineGstMode;
  gstPercent?: number;
  unitPriceExGst: number;
  gst: number;
  amountIncGst: number;
}

export interface QuotationCounterOffer {
  id: string;
  quotationId: string;
  contractorId: string;
  counterPrice: number;
  message?: string;
  sentAt: string;
  sentBy: 'admin' | 'agent';
}

export interface QuotationReviewRecord {
  quotationId: string;
  contractorId: string;
  decision?: 'approved' | 'declined';
  declineReason?: string;
  decidedAt?: string;
  decidedBy?: 'admin' | 'agent';
  landlordEmailSentAt?: string;
  contractorFeedbackSentAt?: string;
  counterOffers: QuotationCounterOffer[];
  contractorRequotedAt?: string;
  contractorRequoteQuotationId?: string;
}

export interface ApiMaintenanceParty {
  name: string;
  email?: string;
  phone?: string;
}

export interface ApiMaintenanceRequest {
  id: string;
  /** Human order number (`MR-00057`); absent on rows that predate order numbering. */
  orderNumber?: string;
  /** The tenant's answer on a tenant-responsibility job — `agreed: false` means Tenant rejected. */
  tenantResponsibilityResponse?: {
    agreed: boolean;
    respondedAt: string;
    reason?: string;
    auto?: boolean;
  };
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
  source: 'tenant_app' | 'agent_submission' | 'email' | 'staff_portal' | 'system';
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
  invitedContractors?: Array<{ id: string; name: string }>;
  quotationReviews?: QuotationReviewRecord[];
  quotationIds: string[];
  completionEvidenceUploaded?: boolean;
  agentApprovalReceived?: boolean;
  tenantApprovalReceived?: boolean;
  invoiceUploaded?: boolean;
  deleteReason?: string;
  deletedAt?: string;
  buildingName?: string;
  strataPlanNumber?: string;
  buildingManager?: ApiMaintenanceParty;
  strataContact?: ApiMaintenanceParty;
  timeline: { status: ApiMaintenanceStatus; enteredAt: string; exitedAt?: string }[];
  rfqReminderRound?: number;
  rfqRoundStartedAt?: string;
  rfqExcludedContractorIds?: string[];
  contractorRfqResponses?: Array<{
    contractorId: string;
    action: 'accept' | 'decline' | 'request_more_pictures';
    at: string;
    declineReason?: string;
    message?: string;
  }>;
  contractorEvidenceRequests?: Array<{
    id: string;
    contractorId: string;
    message: string;
    requestedAt: string;
    status: 'pending' | 'fulfilled';
    fulfilledAt?: string;
    fulfilledBy?: ApiMaintenanceUserRole;
    fulfillmentNote?: string;
  }>;
  quotationApprovalRoundStartedAt?: string;
  quotationApprovalReminderRound?: number;
  scheduleStepStartedAt?: string;
  scheduleProposal?: ApiMaintenanceScheduleProposal;
  scheduleEscalated?: boolean;
  contractorInvoiceNumber?: string;
  contractorInvoiceAmount?: number;
  contractorInvoiceDate?: string;
  invoiceEmailedToAgentAt?: string;
  /** Pre-uploaded intake photo URLs from staff/tenant create (R2). */
  intakePhotoUrls?: string[];
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
    status?: ApiMaintenanceStatus;
    type: 'reminder' | 'escalation';
    dueAt: string;
    sentAt?: string;
    contractorId?: string;
    rfqRound?: number;
    quotationApprovalRound?: number;
  }[];
  lastMaintenanceError: string | null;
}

export interface ApiMaintenanceKpis {
  total: number;
  overdue: number;
  breachRate: number;
}
