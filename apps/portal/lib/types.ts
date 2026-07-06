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

/** Additional landlord or tenant on a property intake form (beyond the primary contact). */
export interface PropertyPartyContact {
  name: string;
  email?: string;
  phone?: string;
}

export type MessageCategory =
  | 'Leasing'
  | 'Maintenance'
  | 'Inspection'
  | 'Accounting'
  | 'Tribunal'
  | 'Others';

export type NeedActionCategory =
  | 'Leasing'
  | 'Maintenance'
  | 'Inspection'
  | 'Accounting'
  | 'Tribunal'
  | 'Others';

export interface Property {
  id: string;
  /** The client agency that owns this property — lets the Agencies screen group by client */
  agencyId?: string;
  intakeMode?: 'new' | 'transfer_in';
  address: string;
  suburb: string;
  state?: string;
  postcode?: string;
  /** Landlord / home owner this property belongs to */
  homeOwnerName: string;
  homeOwnerContact: PropertyContact;
  homeOwnerAddress?: string;
  /** Which agent manages this property — filtered per logged-in agent */
  assignedAgentId: 'agent-1' | 'agent-2';
  tenantName: string;
  tenantContact: PropertyContact;
  additionalLandlords?: PropertyPartyContact[];
  additionalTenants?: PropertyPartyContact[];
  leaseStatus: 'active' | 'periodic' | 'vacating' | 'vacant';
  rentWeekly: number;
  bondAmount?: number;
  bondId?: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  propertyType?: string;
  managementRatePercent?: number;
  insuranceProvider?: string;
  handoverDate?: string;
  previousAgentName?: string;
  previousAgentEmail?: string;
  pmsSource?: string;
  leaseStart?: string;
  leaseEnd?: string;
  nextRentReview?: string;
  openTasks: number;
  inspectionStatus: string;
  maintenanceStatus: string;
}

export type AgencyStatus = 'ONBOARDING' | 'ACTIVE' | 'INACTIVE';

/** A client agency (the AM's "client") the signed-in agent is assigned to manage. */
export interface Agency {
  id: string;
  name: string;
  status: AgencyStatus;
  company?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  /** Properties under this agency in the agent's book — derived from the live `properties`. */
  propertyCount: number;
}

export interface LeasingRecord {
  id: string;
  propertyId: string;
  leaseStart: string;
  leaseEnd: string;
  rentWeekly: number;
  approvedTenant: string;
  openInspectionDate?: string;
  openOfficer?: string;
  attendeeCount?: number;
  applicationCount?: number;
  moveInDate?: string;
  ingoingInspectionId?: string;
  bondAmount?: number;
  depositAmount?: number;
  status: 'current' | 'ended' | 'upcoming';
}

export interface AccountingBill {
  id: string;
  label: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'outstanding';
}

export interface AccountingStatement {
  id: string;
  period: string;
  amount: number;
  href: string;
  downloadUrl?: string;
}

export interface RentIncomeEntry {
  id: string;
  dueDate: string;
  paidDate?: string;
  amount: number;
  description: string;
  status: 'paid' | 'outstanding' | 'overdue';
}

export interface PropertyAccounting {
  propertyId: string;
  propertyAddress: string;
  tenantName: string;
  rentPaidYtd: number;
  rentOutstanding: number;
  currentBalance: number;
  daysInArrears: number;
  arrearsAmount: number;
  rentIncomeHistory?: RentIncomeEntry[];
  bills?: AccountingBill[];
  statements?: AccountingStatement[];
  collectionActivity: {
    id: string;
    at: string;
    type: 'phone' | 'email' | 'sms';
    summary: string;
    detail?: string;
  }[];
}

export interface PropertyNeedAction {
  id: string;
  propertyId: string;
  propertyAddress: string;
  label: string;
  category: NeedActionCategory;
  href: string;
  priority: Priority;
}

export interface NeedActionGroup {
  id: string;
  label: string;
  count: number;
  href: string;
  category: NeedActionCategory;
  items: PropertyNeedAction[];
}

export interface TribunalCase {
  id: string;
  propertyId: string;
  propertyAddress: string;
  tenantName: string;
  status: 'active' | 'closed';
  hearingDate?: string;
  inspector?: string;
  matter: string;
  requiresAction: boolean;
  orders?: string;
  evidence?: string[];
}

export interface DashboardKpis {
  properties: {
    total: number;
    occupied: number;
    vacant: number;
    href: string;
  };
  leasing: {
    upcomingRentReviews: number;
    newLeasing: number;
    leaseRenewals: number;
    href: string;
    rentReviewHref: string;
    newLeasingHref: string;
    leaseRenewalHref: string;
  };
  maintenance: {
    inProgress: number;
    completed: number;
    pendingApproval: number;
    href: string;
    inProgressHref: string;
    completedHref: string;
    approvalHref: string;
  };
  inspection: {
    openPending: number;
    openCompleted: number;
    ingoingPending: number;
    ingoingCompleted: number;
    outgoingPending: number;
    outgoingCompleted: number;
    routinePending: number;
    routineCompleted: number;
    href: string;
    openHref: string;
    ingoingHref: string;
    outgoingHref: string;
    routineHref: string;
  };
  accounting: {
    totalRentalIncome: number;
    propertiesInArrears: number;
    totalArrearsAmount: number;
    outstandingBills: number;
    href: string;
    incomeHref: string;
    arrearsHref: string;
  };
  tribunal: {
    active: number;
    closed: number;
    actionRequired: number;
    href: string;
    activeHref: string;
    closedHref: string;
    actionHref: string;
  };
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
  source?: 'api';
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
  source?: 'api';
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
  /** OPEN inspections only — who runs the viewing */
  openConductedBy?: 'agent' | 'crossub';
  /** OPEN inspections only — occupied vs vacant/new listing */
  openListingContext?: 'occupied' | 'new_listing';
  /** Agent confirmed they notified tenant (self + occupied) */
  agentTenantNotifiedAt?: string;
  agentTenantNotifiedConfirmed?: boolean;
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

export type RentReviewWorkflowState =
  | 'PENDING_CONFIRMATION'
  | 'AGENT_REVIEW'
  | 'TENANT_NOTIFIED'
  | 'NEGOTIATION'
  | 'TENANT_ACCEPTED'
  | 'TENANT_REJECTED'
  | 'ACCOUNTING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'POSTPONED';

export interface InheritedLeaseTerms {
  waterUsage?: string;
  petsAllowed?: boolean;
  electricityTenant?: boolean;
  gasTenant?: boolean;
  furnished?: boolean;
  strataByLaws?: boolean;
  smokeAlarmType?: string;
  parkingSpaces?: number;
  storageLocation?: string;
  maxOccupants?: number;
}

export interface RentReviewCase {
  id: string;
  propertyId: string;
  propertyAddress: string;
  tenantName?: string;
  leaseStart: string;
  leaseEnd: string;
  currentRent: number;
  suggestedRent: number;
  reviewDue: string;
  status: string;
  workflowState?: RentReviewWorkflowState;
  tenantResponse?: 'pending' | 'accepted' | 'rejected' | 'counter' | 'vacating';
  counterOffer?: number;
  requiresApproval: boolean;
  inheritedTerms?: InheritedLeaseTerms;
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
  /**
   * The persisted CROSSUB thread id, when this thread is backed by the live API. For an
   * optimistic thread that has since been persisted, `id` stays the original local id (so
   * an already-open detail route remains valid) while this points at the server thread the
   * reply API targets. Absent for purely device-local (offline) threads.
   */
  serverThreadId?: string;
  propertyId?: string;
  propertyAddress: string;
  homeOwnerName: string;
  homeOwnerContact: PropertyContact;
  tenantName: string;
  tenantContact: PropertyContact;
  subject: string;
  taskType: string;
  messageCategory?: MessageCategory;
  /** Links this thread to a specific maintenance, inspection, tribunal, etc. case */
  relatedCaseId?: string;
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
  mentions?: MessageMention[];
}

export interface MessageMention {
  name: string;
  role: 'tenant' | 'owner' | 'crossub';
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
  source?: 'api';
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

export interface TaskStatusItem {
  id: string;
  propertyAddress: string;
  taskLabel: string;
  status: string;
  href: string;
  module: string;
  tone?: SectionStatus['tone'];
  requiresApproval?: boolean;
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
