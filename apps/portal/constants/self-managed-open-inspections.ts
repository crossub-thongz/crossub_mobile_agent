import type { components } from '@crossub-thongz/api-contract';

import type { StatusBadgeVariant } from '@/components/agent/status-badge';

/**
 * Self-Manage open inspections (Daniel, Self-Manage Leasing, 26 Oct 2026): the agency runs as
 * many opens as it needs until the property is leased, each with its own applicant links and
 * report. Status values are typed off the contract, so a new server value fails the type-check.
 */

type OpenStatus = components['schemas']['AgentLettingOpenInspectionDto']['status'];

export const LETTING_OPEN_STATUS = {
  SCHEDULED: 'scheduled',
  STARTING: 'staff_en_route',
  RUNNING: 'open',
  FINISHED: 'closed',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, OpenStatus>;

export const LETTING_OPEN_STATUS_LABEL: Record<OpenStatus, string> = {
  [LETTING_OPEN_STATUS.SCHEDULED]: 'Scheduled',
  [LETTING_OPEN_STATUS.STARTING]: 'Starting',
  [LETTING_OPEN_STATUS.RUNNING]: 'Running',
  [LETTING_OPEN_STATUS.FINISHED]: 'Finished',
  [LETTING_OPEN_STATUS.CANCELLED]: 'Cancelled',
};

export const LETTING_OPEN_STATUS_BADGE: Record<OpenStatus, StatusBadgeVariant> = {
  [LETTING_OPEN_STATUS.SCHEDULED]: 'default',
  [LETTING_OPEN_STATUS.STARTING]: 'approval',
  [LETTING_OPEN_STATUS.RUNNING]: 'approval',
  [LETTING_OPEN_STATUS.FINISHED]: 'success',
  [LETTING_OPEN_STATUS.CANCELLED]: 'default',
};

/** Statuses an open can still be started, finished or cancelled from. */
export const LETTING_OPEN_LIVE_STATUSES: readonly OpenStatus[] = [
  LETTING_OPEN_STATUS.SCHEDULED,
  LETTING_OPEN_STATUS.STARTING,
  LETTING_OPEN_STATUS.RUNNING,
];

/** Default length of a new open, in minutes. */
export const LETTING_OPEN_DEFAULT_MINUTES = 30;
/** Default start hour (local) of a new open. */
export const LETTING_OPEN_DEFAULT_START_HOUR = 11;
export const LETTING_OPEN_NOTES_MAX = 2000;
export const LETTING_OPEN_CANCEL_REASON_MAX = 500;
/** How often the open list refreshes while it is on screen. */
export const LETTING_OPEN_POLL_MS = 15_000;

export const SELF_MANAGED_OPEN_COPY = {
  listTitle: 'Open inspections',
  listHint:
    'You run these yourself. Add as many as you need until the property is leased. Each open has its own applicant links and report.',
  empty: 'No open inspection yet. Schedule one when you are ready to show the property.',
  add: 'Add open inspection',
  addTitle: 'Schedule an open inspection',
  addDescription: 'You or a team member run it. Prospects check in and apply from its own links.',
  start: 'Start date & time',
  end: 'End date & time',
  host: 'Run by',
  hostDefault: 'Default inspector on this letting',
  notes: 'Notes (optional)',
  notesPlaceholder: 'Keys, parking, access',
  save: 'Schedule open',
  dismiss: 'Close',
  saving: 'Scheduling…',
  added: 'Open inspection scheduled',
  windowRequired: 'Choose a start and an end time.',
  windowOrder: 'The end time must be after the start time.',
  addBlocked: 'No more opens can be added.',
  startOpen: 'Start open',
  started: 'Open inspection started',
  finishOpen: 'Finish open',
  finished: 'Open inspection finished',
  cancelOpen: 'Cancel open',
  cancelTitle: 'Cancel this open inspection?',
  cancelDescription: 'Only this open is cancelled. Your other opens stay as they are.',
  cancelReason: 'Reason (optional)',
  cancelKeep: 'Keep open',
  cancelConfirm: 'Cancel open',
  cancelled: 'Open inspection cancelled',
  links: 'Applicant links & QR',
  hideLinks: 'Hide links',
  generateReport: 'Generate report',
  generating: 'Generating…',
  generated: 'Open report generated',
  downloadReport: 'Download report',
  downloading: 'Downloading…',
  reportPending: 'Generate the report once the open has started.',
  reportHint: 'The report is generated when you ask for it, never on its own.',
  counts: (attendees: number, checkedIn: number, applications: number) =>
    `${attendees} registered · ${checkedIn} checked in · ${applications} applied`,
  runBy: (name: string) => `Run by ${name}`,
  current: 'Current',
  showCancelled: (count: number) => `Show ${count} cancelled`,
  hideCancelled: 'Hide cancelled',
  reportsTitle: 'Open inspection reports',
  reportsHint: 'One report per open inspection.',
  reportsEmpty: 'No open inspection has been held yet.',
  reportGeneratedAt: (when: string) => `Report generated ${when}`,
  reportFilename: (date: string) => `open-inspection-report-${date}.pdf`,
} as const;
