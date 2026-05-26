export type Priority = 'urgent' | 'high' | 'normal' | 'low';

export type TaskModule =
  | 'maintenance'
  | 'inspection'
  | 'rent_review'
  | 'vacating'
  | 'message';

export type ApprovalAction = 'approve' | 'decline' | 'requote' | 'comment';

export interface TimelineEntry {
  id: string;
  at: string;
  actor: string;
  actorRole: 'agent' | 'crossub' | 'tenant' | 'contractor' | 'system';
  title: string;
  detail?: string;
  source: 'manual' | 'system' | 'email' | 'app';
  staffAssisted?: boolean;
}

export interface PropertyContact {
  email?: string;
  phone?: string;
}

export interface Property {
  id: string;
  address: string;
  suburb: string;
  /** Landlord / home owner this property belongs to */
  homeOwnerName: string;
  homeOwnerContact: PropertyContact;
  /** Which agent manages this property — filtered per logged-in agent */
  assignedAgentId: 'agent-1' | 'agent-2';
  tenantName: string;
  tenantContact: PropertyContact;
  leaseStatus: 'active' | 'periodic' | 'vacating' | 'vacant';
  rentWeekly: number;
  nextRentReview?: string;
  openTasks: number;
  inspectionStatus: string;
  maintenanceStatus: string;
}

export interface DashboardItem {
  id: string;
  module: TaskModule;
  propertyId: string;
  propertyAddress: string;
  title: string;
  subtitle: string;
  priority: Priority;
  status: string;
  dueAt?: string;
  overdueHours?: number;
  requiresApproval: boolean;
  href: string;
  updatedAt: string;
  source?: 'api' | 'demo';
}

export interface MaintenanceRequest {
  id: string;
  trackingNumber: string;
  propertyId: string;
  propertyAddress: string;
  title: string;
  description: string;
  status: string;
  priority: Priority;
  responsibility: 'landlord' | 'tenant' | 'strata' | 'pending';
  contractorName?: string;
  quoteAmount?: number;
  quoteExpiry?: string;
  recommendation?: string;
  contractorStatus?: 'pending' | 'accepted' | 'declined' | 'no_response';
  quoteDocumentUrl?: string;
  requiresApproval: boolean;
  timeline: TimelineEntry[];
  source?: 'api' | 'demo';
  submittedQuotationId?: string;
  invoiceUploaded?: boolean;
  completionEvidenceUploaded?: boolean;
}

export interface Inspection {
  id: string;
  trackingNumber: string;
  type: 'INGOING' | 'OUTGOING' | 'ROUTINE' | 'OPEN';
  propertyId: string;
  propertyAddress: string;
  inspector?: string;
  scheduledAt?: string;
  status: string;
  reportStatus: 'pending' | 'uploaded' | 'approved' | 'sent';
  keyStatus?: string;
  tenantAck?: 'pending' | 'confirmed' | 'disputed';
  timeline: TimelineEntry[];
  areaOutcomes?: { area: string; outcome: string; note?: string }[];
  maintenanceEscalations?: { label: string; severity: Priority }[];
  routineMode?: 'self' | 'in_person';
  nextDueDate?: string;
  visitorCount?: number;
  reportUrl?: string;
  imageComparisons?: {
    area: string;
    ingoingLabel: string;
    outgoingLabel: string;
    issueNote?: string;
  }[];
}

export interface RentReviewCase {
  id: string;
  propertyId: string;
  propertyAddress: string;
  leaseStart: string;
  leaseEnd: string;
  currentRent: number;
  suggestedRent: number;
  reviewDue: string;
  status: string;
  tenantResponse?: 'pending' | 'accepted' | 'rejected' | 'counter' | 'vacating';
  counterOffer?: number;
  requiresApproval: boolean;
  timeline: TimelineEntry[];
  negotiationHistory?: { at: string; party: string; amount: number; note?: string }[];
}

export interface VacatingCase {
  id: string;
  propertyId: string;
  propertyAddress: string;
  vacateDate: string;
  reason: string;
  checklistProgress: number;
  bondStatus: string;
  outgoingInspectionStatus: string;
  requiresApproval: boolean;
  checklist: { label: string; status: 'done' | 'pending' | 'dispute' }[];
  bondBreakdown: { label: string; amount: number }[];
  timeline: TimelineEntry[];
}

export interface MessageThread {
  id: string;
  assignedAgentId: 'agent-1' | 'agent-2';
  propertyId?: string;
  propertyAddress: string;
  homeOwnerName: string;
  homeOwnerContact: PropertyContact;
  tenantName: string;
  tenantContact: PropertyContact;
  subject: string;
  taskType: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
  channel: 'app' | 'email' | 'mixed';
  messages: ThreadMessage[];
}

export interface ThreadMessage {
  id: string;
  at: string;
  from: string;
  body: string;
  channel: 'app' | 'email';
  sentByAgent?: boolean;
}

export interface AgentNotification {
  id: string;
  type: 'approval' | 'urgent' | 'update' | 'report' | 'reminder';
  title: string;
  body: string;
  propertyAddress: string;
  taskType: string;
  status: string;
  at: string;
  read: boolean;
  href: string;
  actionRequired?: string;
  source?: 'api' | 'demo';
  overdueHours?: number;
  escalationNote?: string;
}

export interface TenantSelectionCase {
  id: string;
  propertyId: string;
  propertyAddress: string;
  applicantName: string;
  proposedRent: number;
  leaseTerm: string;
  status: string;
  requiresApproval: boolean;
  documents: string[];
  timeline: TimelineEntry[];
}

export interface SectionStatus {
  id: string;
  label: string;
  href: string;
  statusLabel: string;
  tone: 'neutral' | 'warning' | 'urgent' | 'ok';
  count?: number;
}

export interface AgentDocument {
  id: string;
  title: string;
  propertyAddress: string;
  category: 'inspection' | 'rent_review' | 'maintenance' | 'lease' | 'vacating';
  uploadedAt: string;
  href: string;
  downloadUrl?: string;
}
