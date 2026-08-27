import type {
  LeasingAdvertisingStatus,
  LeasingAgentDecision,
  LeasingApplyPath,
  LeasingItemStatus,
  LeasingKeyCustody,
  LeasingLifecycleStep,
} from '@/lib/leasing/constants';

export interface LeasingAgentInfo {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  keyCustody: LeasingKeyCustody;
}

export interface LeasingRentalInfo {
  rentPerWeek?: number;
  availableFrom?: string;
  moveInDate?: string;
  deposit?: number;
  bond?: number;
  leaseTerm?: string;
  tenantMovedOut?: boolean;
  tenantMovedOutDate?: string;
  lettingNotes?: string;
}

export interface LeasingOpenInspection {
  status: LeasingItemStatus;
  /** OPEN pool inspection row (inspector task pool / agent job case). */
  inspectionId?: string;
  inspectorName?: string;
  inspectorPhone?: string;
  inspectorEmail?: string;
  /**
   * ⚠️ Present even when no time has been decided. A property waiting in the weekly open
   * pool carries a PLACEHOLDER here — the underlying viewing record cannot hold an empty
   * time — and it reads exactly like a real Saturday slot. Never render it without
   * checking `timeProvisional`; use `isOpenTimePending` from `open-inspection-display`.
   */
  scheduledTime?: string;
  scheduledTimeEnd?: string;
  /** TRUE while `scheduledTime` is a placeholder rather than a confirmed open time. */
  timeProvisional?: boolean;
  /** When the inspector confirmed the time. Absent while provisional. */
  timeConfirmedAt?: string;
  /** `YYYY-MM-DD` of the batch Wednesday this request belongs to. */
  batchWeekKey?: string;
  /** What this agent asked for — weighed by the route, never binding. */
  agentPreferredStart?: string;
  /** Position in the assigned inspector's Saturday route (1-based). */
  routeSequence?: number;
  preferredScheduledTime?: string;
  preferredScheduledTimeEnd?: string;
  preferredNotes?: string;
  startedEarly?: boolean;
  startedEarlyAt?: string;
  originalScheduledStart?: string;
  /** When the viewing / open job actually finished. */
  finishedAt?: string;
  viewingSessionId?: string;
  pushedToAgentApp: boolean;
  agentConducted?: boolean;
  agentNotifiedToAdvertise: boolean;
  advertising: LeasingAdvertisingStatus;
  advertisingNote?: string;
  awaitingAgentPayment?: boolean;
}

export interface LeasingViewerInvite {
  id: string;
  email?: string;
  phone?: string;
  channel: 'email' | 'sms';
  body: string;
  sentAt: string;
  commConversationId?: string;
}

export interface LeasingOpenReport {
  status: LeasingItemStatus;
  sentToAgent: boolean;
  sentToAgentAt?: string;
  viewerInvitesSent: boolean;
  invitedCount?: number;
  viewerInvites?: LeasingViewerInvite[];
  applyPaths: LeasingApplyPath[];
  reportViewable: boolean;
  attendeeCount?: number;
}

export interface LeasingApplicantDocument {
  fileName: string;
  url: string;
}

export interface LeasingApplicationDetail {
  id: string;
  applicant: string;
  email?: string;
  phone?: string;
  annualIncome?: number;
  employmentStatus?: string;
  moveInDate?: string;
  submittedAt: string;
  aiScore?: number;
  aiScoreLevel?: 'strong' | 'medium' | 'risk';
  aiAdvice?: string;
  aiAdviceSentToAgent: boolean;
  /** Agent-authored feedback for the applicant (Results step). */
  feedback?: string;
  /** Reference-check recommendation draft (Recommend / Reject). */
  referenceRecommendation?: 'recommend' | 'reject';
  feedbackSentAt?: string;
  selectedForAgent: boolean;
  sentToAgent: boolean;
  agentDecision: LeasingAgentDecision;
  /** Uploaded supporting documents (application forms, ID scans, etc.). */
  documents?: LeasingApplicantDocument[];
}

export interface LeasingContractCondition {
  id: string;
  text: string;
}

export interface LeasingContract {
  contractId: string;
  template: string;
  leaseTerm: string;
  startDate?: string;
  endDate?: string;
  weeklyRent?: number;
  bond?: number;
  deposit?: number;
  paymentReference?: string;
  petsAllowed?: boolean;
  waterChargedSeparately?: boolean;
  specialConditions: LeasingContractCondition[];
  confirmed: boolean;
}

export interface LeasingDepositState {
  status: LeasingItemStatus;
  amount?: number;
  paidAt?: string;
  proofFileName?: string;
  proofUrl?: string;
  ledgerEntryId?: string;
}

export interface LeasingBondState {
  status: LeasingItemStatus;
  amount?: number;
  agentLink?: string;
  sentToTenantAt?: string;
  paidAt?: string;
  proofFileName?: string;
  proofUrl?: string;
  ledgerEntryId?: string;
  /** Display bond ID (e.g. BOND-00001) — not the internal ledger row id. */
  lodgementRef?: string;
}

export interface LeasingAgreementState {
  status: LeasingItemStatus;
  contract: LeasingContract;
  signingStatus: 'not_sent' | 'sent' | 'viewed' | 'signed';
  signedAt?: string;
  uploadedFileName?: string;
  signedProofUrl?: string;
  signedProofFileName?: string;
}

export interface LeasingKeyCollectionTenantReport {
  submittedAt?: string;
  tagNumber?: string | null;
  keysCount?: number | null;
  entryDoorCount?: number | null;
  windowSlidingCount?: number | null;
  fobsCount?: number | null;
  remoteControlCount?: number | null;
  mailboxCount?: number | null;
  othersCount?: number | null;
}

export interface LeasingKeyCollectionState {
  status: LeasingItemStatus;
  custody: LeasingKeyCustody;
  time?: string;
  timeEnd?: string;
  location?: string;
  photos?: string[];
  tenantReport?: LeasingKeyCollectionTenantReport | null;
}

export interface LeasingIngoingDispute {
  id: string;
  area: string;
  description: string;
  raisedAt: string;
  routedToMaintenance: boolean;
}

export interface LeasingIngoingInspectionState {
  status: LeasingItemStatus;
  scheduledTime?: string;
  assignee?: string;
  inspectionId?: string;
  reportAvailable: boolean;
  tenantConfirmed: boolean;
  disputes: LeasingIngoingDispute[];
  awaitingAgentPayment?: boolean;
}

export interface LeasingIngoingApprovalState {
  status: LeasingItemStatus;
  tenantApproved: boolean;
  approvedAt?: string;
}

export interface LeasingOnboardingState {
  deposit: LeasingDepositState;
  bond: LeasingBondState;
  agreement: LeasingAgreementState;
  keyCollection: LeasingKeyCollectionState;
  ingoingInspection: LeasingIngoingInspectionState;
  ingoingReportApproval: LeasingIngoingApprovalState;
}

export interface LeasingTimelineEvent {
  id: string;
  label: string;
  kind: string;
  actor: string;
  at: string;
}

export interface LeasingPropertyDetail {
  propertyId: string;
  propertyAddress: string;
  /** Server `LeasingCycle` id when loaded from the API. */
  cycleId?: string;
  /** False when the agent NL case closed after applicant results were sent. */
  cycleActive?: boolean;
  agentInfo: LeasingAgentInfo;
  rental: LeasingRentalInfo;
  activeStepHint: LeasingLifecycleStep;
  openInspection: LeasingOpenInspection;
  openReport: LeasingOpenReport;
  applicationsDetail: LeasingApplicationDetail[];
  onboarding: LeasingOnboardingState;
  timeline: LeasingTimelineEvent[];
}
