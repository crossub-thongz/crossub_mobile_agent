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
  scheduledTime?: string;
  scheduledTimeEnd?: string;
  preferredScheduledTime?: string;
  preferredScheduledTimeEnd?: string;
  preferredNotes?: string;
  viewingSessionId?: string;
  pushedToAgentApp: boolean;
  agentNotifiedToAdvertise: boolean;
  advertising: LeasingAdvertisingStatus;
  advertisingNote?: string;
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
  feedbackSentAt?: string;
  selectedForAgent: boolean;
  sentToAgent: boolean;
  agentDecision: LeasingAgentDecision;
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
}

export interface LeasingBondState {
  status: LeasingItemStatus;
  amount?: number;
  agentLink?: string;
  sentToTenantAt?: string;
  paidAt?: string;
  proofFileName?: string;
  /** Display bond ID (e.g. BOND-00001) — not the internal ledger row id. */
  lodgementRef?: string;
}

export interface LeasingAgreementState {
  status: LeasingItemStatus;
  contract: LeasingContract;
  signingStatus: 'not_sent' | 'sent' | 'viewed' | 'signed';
  signedAt?: string;
  uploadedFileName?: string;
}

export interface LeasingKeyCollectionState {
  status: LeasingItemStatus;
  custody: LeasingKeyCustody;
  time?: string;
  location?: string;
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
}
