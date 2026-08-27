/**
 * Open inspection (prospect viewing) types — mirrors crossub_web
 * `constants/open-inspection-ops.ts` for the shared `/open-viewings` API.
 */

import { LEASING_AGENT_DECISION, type LeasingAgentDecision } from '@/lib/leasing/constants';

export type { LeasingAgentDecision };

export const SessionStatusEnum = {
  SCHEDULED: 'scheduled',
  STAFF_EN_ROUTE: 'staff_en_route',
  OPEN: 'open',
  CLOSED: 'closed',
  CANCELLED: 'cancelled',
} as const;

export type SessionStatus =
  (typeof SessionStatusEnum)[keyof typeof SessionStatusEnum];

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  [SessionStatusEnum.SCHEDULED]: 'Scheduled',
  [SessionStatusEnum.STAFF_EN_ROUTE]: 'Staff en route',
  [SessionStatusEnum.OPEN]: 'Open now',
  [SessionStatusEnum.CLOSED]: 'Closed',
  [SessionStatusEnum.CANCELLED]: 'Cancelled',
};

export const SessionCycleEnum = {
  CURRENT: 'current',
  NEXT: 'next',
} as const;

export type SessionCycle =
  (typeof SessionCycleEnum)[keyof typeof SessionCycleEnum];

export const AttendanceStatusEnum = {
  REGISTERED: 'registered',
  ATTENDED: 'attended',
  NO_SHOW: 'no_show',
} as const;

export type AttendanceStatus =
  (typeof AttendanceStatusEnum)[keyof typeof AttendanceStatusEnum];

export const InterestLevelEnum = {
  HOT: 'hot',
  WARM: 'warm',
  COLD: 'cold',
} as const;

export type InterestLevel =
  (typeof InterestLevelEnum)[keyof typeof InterestLevelEnum];

export const FollowUpStatusEnum = {
  NOT_STARTED: 'not_started',
  CONTACTED: 'contacted',
  AWAITING_APPLICATION: 'awaiting_application',
  APPLICATION_RECEIVED: 'application_received',
  CLOSED: 'closed',
} as const;

export type FollowUpStatus =
  (typeof FollowUpStatusEnum)[keyof typeof FollowUpStatusEnum];

export const RegistrationSourceEnum = {
  QR_PRE_REGISTERED: 'qr_pre_registered',
  TENANT_APP: 'tenant_app',
  WALK_IN: 'walk_in',
} as const;

export type RegistrationSource =
  (typeof RegistrationSourceEnum)[keyof typeof RegistrationSourceEnum];

export interface OpenInspectionAgent {
  id: string;
  name: string;
  role: 'leasing_agent' | 'property_manager' | 'ops_coordinator';
  initials: string;
  phone?: string;
}

export interface OpenInspectionApplication {
  id: string;
  submittedAt: string;
  aiScore?: number;
  aiScoreLevel?: string;
  aiAdvice?: string;
  agentDecision: LeasingAgentDecision;
  decisionAt?: string;
  rejectReason?: string;
  feedback?: string;
  candidateNotified: boolean;
  resultsSentAt?: string;
  tenantLoginProvisioned?: boolean;
}

export interface OpenInspectionVisitor {
  id: string;
  name: string;
  email: string;
  phone: string;
  registrationSource: RegistrationSource;
  attendanceStatus: AttendanceStatus;
  interestLevel: InterestLevel;
  followUpStatus: FollowUpStatus;
  followUpNote?: string;
  /** Prospect-declared lease term at QR check-in. */
  leaseTerm?: string;
  /** Prospect-declared pets at QR check-in. */
  pets?: string;
  /** Prospect comments captured at QR check-in. */
  checkInComments?: string;
  lastContactedAt?: string;
  applyLinkSentAt?: string;
  application?: OpenInspectionApplication;
}

export interface OpenInspectionRental {
  rentPerWeek?: number;
  bond?: number;
  deposit?: number;
  availableFrom?: string;
  moveInDate?: string;
  leaseTerm?: string;
}

export interface OpenInspectionLandlord {
  name?: string;
  email?: string;
  phone?: string;
}

export interface OpenInspectionCurrentTenant {
  name: string;
  email?: string;
  phone?: string;
}

export interface OpenInspectionTimelineEvent {
  id: string;
  label: string;
  kind: string;
  actor: string;
  at: string;
}

/**
 * The OPEN pool job behind a viewing session — the half a viewing row cannot answer.
 *
 * A viewing session carries no inspector of its own; the assignment lives on the linked
 * inspection row. Reading it here is what lets this app tell whether there is anybody to
 * confirm a time *with*, rather than offering a Confirm button over an unstaffed slot.
 */
export interface OpenInspectionPoolJob {
  inspectionId: string;
  /** Every inspector on the job, lead first. Empty while nobody is assigned. */
  inspectors: Array<{ id: string; name: string; isPrimary: boolean }>;
  inspectorAssignedAt: string | null;
  scheduledDate: string | null;
  completedDate: string | null;
  reportUrl: string | null;
  approvedAt: string | null;
  /** When this agent confirmed the scheduled time. Null means not yet — CROSSUB is waiting. */
  agentConfirmedAt: string | null;
  reportSentToAgentAt: string | null;
  /** Prepaid Open fee is still unpaid — inspectors cannot claim or start. */
  awaitingAgentPayment?: boolean;
}

export interface OpenInspectionSession {
  id: string;
  propertyId?: string;
  /** Linked new-leasing cycle when this open was created with / for a letting. */
  leasingCycleId?: string;
  property: string;
  address: string;
  suburb: string;
  state?: string;
  postcode?: string;
  propertyType: string;
  propertyStatus: string;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  landlord?: OpenInspectionLandlord;
  startTime: string;
  endTime: string;
  startedEarly?: boolean;
  startedEarlyAt?: string;
  originalScheduledStart?: string;
  /** When the viewing actually closed (job finished). */
  closedAt?: string;
  createdAt?: string;
  sessionStatus: SessionStatus;
  agent: OpenInspectionAgent;
  cycle: SessionCycle;
  rental?: OpenInspectionRental;
  shortNote?: string;
  /** Public tenant-app URL for guest applications (QR / share link). */
  applyUrl?: string;
  /** Public tenant-app URL for prospect check-in at the viewing. */
  checkInUrl?: string;
  /** Linked OPEN pool inspection (inspector mobile job) for this viewing session. */
  inspectionId?: string;
  /** The linked OPEN pool job in full — inspectors, schedule, report, confirmation. */
  openInspection?: OpenInspectionPoolJob;
  /** True once the linked leasing cycle's open report has been generated. */
  openReportGenerated?: boolean;
  reviewCompletedAt?: string;
  landlordReportEmailedAt?: string;
  landlordReportEmailedTo?: string;
  reportSourceCounts?: {
    tenantApp: number;
    linkOrQr: number;
    walkIn: number;
    totalWithApplication: number;
  };
  visitors: OpenInspectionVisitor[];
  /** Session activity (check-ins, apply-link emails, decisions). */
  timeline?: OpenInspectionTimelineEvent[];
  /** Agent-declared on standalone open inspections (not via new-leasing workflow). */
  tenantMovedOut?: boolean;
  /** Populated when tenantMovedOut is false and the property has a current tenant on file. */
  currentTenant?: OpenInspectionCurrentTenant;
}

export { LEASING_AGENT_DECISION as OPEN_INSPECTION_DECISION };
