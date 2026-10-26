/**
 * Owner decision records (Self-Manage, Daniel 17 Oct 2026): the agent decides, the owner gets an
 * emailed copy from the agency address. A record only — no approve link, no owner portal.
 *
 * Case types and email statuses key on the contract (`AgentOwnerDecisionDto`), so a new server
 * value fails the type-check here. The email preview builders live in `lib/owner-decision.ts`.
 */

import type {
  AgentOwnerDecision,
  AgentOwnerDecisionCaseType,
} from '@/lib/crossub-api/agent-client';

export const OWNER_DECISION_CASE_TYPE = {
  MAINTENANCE: 'MAINTENANCE',
  INSPECTION: 'INSPECTION',
  LEASING: 'LEASING',
  RENT_REVIEW: 'RENT_REVIEW',
  END_LEASING: 'END_LEASING',
  TRUST: 'TRUST',
  GENERAL: 'GENERAL',
} as const satisfies Record<string, AgentOwnerDecisionCaseType>;

/** Server caps (`OWNER_DECISION_*_MAX_LENGTH`). */
export const OWNER_DECISION_DECISION_MAX_LENGTH = 120;
export const OWNER_DECISION_SUMMARY_MAX_LENGTH = 4000;

export type OwnerDecisionEmailStatus = NonNullable<AgentOwnerDecision['emailStatus']>;

export const OWNER_DECISION_EMAIL_STATUS = {
  SENT: 'sent',
  NOT_CONFIGURED: 'not_configured',
  STUB_RECIPIENT: 'stub_recipient',
  BLOCKED_RECIPIENT: 'blocked_recipient',
  BLOCKED_LANDLORD: 'blocked_landlord',
  BLOCKED_ARCHIVED_AGENCY: 'blocked_archived_agency',
  WITHHELD_TEMPLATE: 'withheld_template',
  FAILED: 'failed',
} as const satisfies Record<string, OwnerDecisionEmailStatus>;

/** Pill label per delivery outcome. `null` (no copy sent) uses {@link OWNER_DECISION_RECORD_ONLY_LABEL}. */
export const OWNER_DECISION_EMAIL_STATUS_LABEL: Record<OwnerDecisionEmailStatus, string> = {
  sent: 'Owner copy sent',
  not_configured: 'Email not set up',
  stub_recipient: 'Test address, not delivered',
  blocked_recipient: 'Recipient blocked',
  blocked_landlord: 'Owner email blocked',
  blocked_archived_agency: 'Agency archived, not sent',
  withheld_template: 'Email withheld',
  failed: 'Email failed',
};

export const OWNER_DECISION_RECORD_ONLY_LABEL = 'Record only';

export const OWNER_DECISION_EMAIL_STATUS_TONE: Record<OwnerDecisionEmailStatus, string> = {
  sent: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  not_configured: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  stub_recipient: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  blocked_recipient: 'border-destructive/40 bg-destructive/10 text-destructive',
  blocked_landlord: 'border-destructive/40 bg-destructive/10 text-destructive',
  blocked_archived_agency: 'border-destructive/40 bg-destructive/10 text-destructive',
  withheld_template: 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  failed: 'border-destructive/40 bg-destructive/10 text-destructive',
};

export const OWNER_DECISION_RECORD_ONLY_TONE = 'border-border bg-muted/40 text-muted-foreground';

/** One decision button: what it is called, what gets recorded, and the summary it starts with. */
export type OwnerDecisionOption = {
  id: string;
  label: string;
  decision: string;
  summary: string;
};

/** The modules that show a generic "Record a decision" in Phase 0. Phase 1 wires real actions. */
export const OWNER_DECISION_MODULE = {
  MAINTENANCE: 'maintenance',
  INSPECTIONS: 'inspections',
  LEASING: 'leasing',
  TENANCY_REVIEW: 'tenancy_review',
} as const;
export type OwnerDecisionModule = (typeof OWNER_DECISION_MODULE)[keyof typeof OWNER_DECISION_MODULE];

export const OWNER_DECISION_MODULE_CASE_TYPE: Record<OwnerDecisionModule, AgentOwnerDecisionCaseType> = {
  maintenance: OWNER_DECISION_CASE_TYPE.MAINTENANCE,
  inspections: OWNER_DECISION_CASE_TYPE.INSPECTION,
  leasing: OWNER_DECISION_CASE_TYPE.LEASING,
  tenancy_review: OWNER_DECISION_CASE_TYPE.RENT_REVIEW,
};

export const OWNER_DECISION_MODULE_OPTIONS: Record<OwnerDecisionModule, readonly OwnerDecisionOption[]> = {
  maintenance: [
    {
      id: 'approved',
      label: 'Approve',
      decision: 'Maintenance approved',
      summary: 'We have approved this maintenance work.',
    },
    {
      id: 'declined',
      label: 'Decline',
      decision: 'Maintenance declined',
      summary: 'We have declined this maintenance work.',
    },
    {
      id: 'noted',
      label: 'Note',
      decision: 'Maintenance update',
      summary: 'An update on this maintenance job.',
    },
  ],
  inspections: [
    {
      id: 'approved',
      label: 'Approve',
      decision: 'Inspection report approved',
      summary: 'We have reviewed and approved the inspection report.',
    },
    {
      id: 'declined',
      label: 'Decline',
      decision: 'Inspection report sent back',
      summary: 'We have sent the inspection report back for changes.',
    },
    {
      id: 'noted',
      label: 'Note',
      decision: 'Inspection update',
      summary: 'An update on this inspection.',
    },
  ],
  leasing: [
    {
      id: 'approved',
      label: 'Approve',
      decision: 'Leasing approved',
      summary: 'We have approved the next step of this letting.',
    },
    {
      id: 'declined',
      label: 'Decline',
      decision: 'Leasing declined',
      summary: 'We have declined this step of the letting.',
    },
    {
      id: 'noted',
      label: 'Note',
      decision: 'Leasing update',
      summary: 'An update on this letting.',
    },
  ],
  tenancy_review: [
    {
      id: 'approved',
      label: 'Approve',
      decision: 'Tenancy review approved',
      summary: 'We have approved the new rent and lease terms.',
    },
    {
      id: 'declined',
      label: 'Decline',
      decision: 'Tenancy review declined',
      summary: 'We have declined the proposed rent change.',
    },
    {
      id: 'noted',
      label: 'Note',
      decision: 'Tenancy review update',
      summary: 'An update on this tenancy review.',
    },
  ],
};

export const OWNER_DECISION_COPY = {
  confirmTitle: 'Record this decision',
  confirmDescription: 'The decision is saved on this job.',
  summaryLabel: 'Summary',
  summaryRequired: 'Enter a summary of the decision',
  previewHeading: 'Owner email preview',
  previewTo: 'To',
  previewFrom: 'From',
  previewSubject: 'Subject',
  previewFromSuffix: '(your agency address)',
  recordOnlyHeading: 'No email will be sent',
  recordOnlyNotSelfManaged:
    'This property is not on Self-Manage, so CROSSUB does not email the owner. The decision is recorded only.',
  recordOnlyNoOwnerEmail:
    'There is no owner email on file for this property. The decision is recorded only.',
  confirmSend: 'Record and email owner',
  confirmRecord: 'Record decision',
  cancel: 'Cancel',
  saving: 'Saving…',
  toastSent: 'Decision recorded and a copy emailed to the owner',
  toastRecorded: 'Decision recorded',
  toastNotDelivered: 'Decision recorded, but the owner copy was not delivered',
  toastError: 'Could not record the decision',
  recordedHeading: 'Recorded',
  dismiss: 'Dismiss',
  timelineEmpty: 'No decisions recorded on this job yet.',
  timelineLoading: 'Loading decisions…',
  timelineError: 'Could not load decisions',
  retry: 'Retry',
  sentTo: 'Sent to',
  by: 'by',
} as const;
