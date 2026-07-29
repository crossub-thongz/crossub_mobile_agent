export type AgentPageGuideId =
  | 'dashboard'
  | 'properties'
  | 'tasks'
  | 'messages'
  | 'communications'
  | 'leasing'
  | 'maintenance'
  | 'inspections'
  | 'accounting'
  | 'tribunal'
  | 'archive'
  | 'settings'
  | 'agencies'
  | 'rent-review'
  | 'vacating'
  | 'tenant-selection'
  | 'notifications'
  | 'reports'
  | 'tenants'
  | 'search';

export type AgentPageGuideContent = {
  id: AgentPageGuideId;
  pageName: string;
  eyebrow: string;
  overview: string;
  steps: Array<{ title: string; description: string }>;
  tips: string[];
};

const STORAGE_PREFIX = 'crossub-agent-page-guide:v1:';

export const AGENT_PAGE_GUIDE_STORAGE_PREFIX = STORAGE_PREFIX;

export function resolveAgentPageGuideId(pathname: string): AgentPageGuideId | null {
  const parts = pathname.replace(/\/$/, '').split('/').filter(Boolean);
  if (parts.length !== 1) return null;

  const root = parts[0]!;
  const map: Record<string, AgentPageGuideId> = {
    dashboard: 'dashboard',
    properties: 'properties',
    tasks: 'tasks',
    messages: 'messages',
    communications: 'communications',
    leasing: 'leasing',
    maintenance: 'maintenance',
    inspections: 'inspections',
    accounting: 'accounting',
    tribunal: 'tribunal',
    archive: 'archive',
    settings: 'settings',
    agencies: 'agencies',
    'rent-review': 'rent-review',
    vacating: 'vacating',
    'tenant-selection': 'tenant-selection',
    notifications: 'notifications',
    reports: 'reports',
    tenants: 'tenants',
    search: 'search',
  };
  return map[root] ?? null;
}

export const AGENT_PAGE_GUIDES: Record<AgentPageGuideId, AgentPageGuideContent> = {
  dashboard: {
    id: 'dashboard',
    pageName: 'Dashboard',
    eyebrow: 'Portfolio overview',
    overview:
      'Your home screen for portfolio KPIs, rent performance, and what needs attention today. Start here each session.',
    steps: [
      {
        title: 'Scan KPI tiles',
        description: 'Occupancy, rent collected, arrears, and open jobs update from your live portfolio.',
      },
      {
        title: 'Jump to need-action',
        description: 'Use the tasks shortcut when something requires approval, a reply, or a decision.',
      },
      {
        title: 'Open a property',
        description: 'Tap any property card to manage leasing, maintenance, inspections, and messages.',
      },
    ],
    tips: ['Pull to refresh after big changes.', 'Customize quick actions from Settings.'],
  },
  properties: {
    id: 'properties',
    pageName: 'Properties',
    eyebrow: 'Your portfolio',
    overview:
      'Every listing you manage lives here. Add properties, resume drafts, and open the full workflow hub per address.',
    steps: [
      {
        title: 'Add a listing',
        description: 'Use + Add property to register a new address under your agency.',
      },
      {
        title: 'Open property hub',
        description: 'Each property links to leasing, maintenance, inspections, documents, and contacts.',
      },
      {
        title: 'Track need-action',
        description: 'The badge on Properties mirrors urgent items waiting on you.',
      },
    ],
    tips: ['Incomplete registry drafts can be resumed from the list.', 'End management when an agency no longer oversees a property.'],
  },
  tasks: {
    id: 'tasks',
    pageName: 'Need-action queue',
    eyebrow: 'Your to-do list',
    overview:
      'Approvals, overdue steps, and portfolio alerts land here so nothing slips through while you are in the field.',
    steps: [
      {
        title: 'Work oldest first',
        description: 'Items are grouped by urgency — quotes, messages, and workflow blockers surface at the top.',
      },
      {
        title: 'Tap through to the case',
        description: 'Each row deep-links to the maintenance job, lease step, or message thread that needs you.',
      },
      {
        title: 'Clear the queue daily',
        description: 'Resolving items here keeps automations and tenant comms moving.',
      },
    ],
    tips: ['Filter by property when you are on-site at one address.'],
  },
  messages: {
    id: 'messages',
    pageName: 'Messages',
    eyebrow: 'Property conversations',
    overview:
      'In-app chat with landlords and tenants, scoped to managed properties. Keep correspondence auditable per listing.',
    steps: [
      {
        title: 'Browse by property',
        description: 'Threads are tied to an address so context stays with the portfolio record.',
      },
      {
        title: 'Start a new thread',
        description: 'Open a property first or use New message when you need a fresh conversation.',
      },
      {
        title: 'Mark as read',
        description: 'Unread counts sync to the header badge — clear them as you respond.',
      },
    ],
    tips: ['For linked Gmail/Yahoo mailboxes, use Communications for full email history.'],
  },
  communications: {
    id: 'communications',
    pageName: 'Communications',
    eyebrow: 'Email & correspondence',
    overview:
      'Linked mailboxes and CROSSUB threads in one timeline. Search and reply without leaving the app.',
    steps: [
      {
        title: 'Connect a mailbox',
        description: 'Link Gmail or Yahoo from Settings so external mail appears beside in-app messages.',
      },
      {
        title: 'Filter by mailbox',
        description: 'Focus on one inbox when you are clearing agency email.',
      },
      {
        title: 'Reply in context',
        description: 'Responses stay attached to the property or case they relate to.',
      },
    ],
    tips: ['Sync mailboxes after connecting them for the first time.'],
  },
  leasing: {
    id: 'leasing',
    pageName: 'Leasing',
    eyebrow: 'New tenancies',
    overview:
      'Active leasing cycles across your portfolio — applicants, open inspections, onboarding, and ingoing handover.',
    steps: [
      {
        title: 'Pick a property cycle',
        description: 'Each row is a property moving through advertise → apply → onboard → move-in.',
      },
      {
        title: 'Advance the lifecycle',
        description: 'Open a property workflow to approve applicants, schedule opens, and complete onboarding.',
      },
      {
        title: 'Watch blockers',
        description: 'Stalled bond, agreement, or key collection steps show here until resolved.',
      },
    ],
    tips: ['Tenant onboarding proofs are reviewed inside the property leasing workflow.'],
  },
  maintenance: {
    id: 'maintenance',
    pageName: 'Maintenance',
    eyebrow: 'Repairs & contractors',
    overview:
      'Log jobs, classify responsibility, compare quotes, approve spend, and track completion with audit trails.',
    steps: [
      {
        title: 'Triage new jobs',
        description: 'Review tenant reports and photos, then assign responsibility (tenant, landlord, or strata).',
      },
      {
        title: 'Approve quotes',
        description: 'Compare contractor pricing and approve or decline from your phone.',
      },
      {
        title: 'Close with evidence',
        description: 'Mark complete when work is verified — history stays on the property record.',
      },
    ],
    tips: ['Urgent jobs notify you immediately.', 'Preferred contractors speed up quote matching.'],
  },
  inspections: {
    id: 'inspections',
    pageName: 'Inspections',
    eyebrow: 'Field inspections',
    overview:
      'Schedule and track ingoing, outgoing, routine, and open inspections with inspector assignment and reports.',
    steps: [
      {
        title: 'Book from a property',
        description: 'Most inspections are created inside the property hub for the right context.',
      },
      {
        title: 'Monitor status',
        description: 'Scheduled, in progress, and completed jobs appear with inspector and date.',
      },
      {
        title: 'Review reports',
        description: 'Open completed inspections for photos, ratings, and bond-risk flags.',
      },
    ],
    tips: ['Routine schedules can be set when registering an occupied property.'],
  },
  accounting: {
    id: 'accounting',
    pageName: 'Accounting',
    eyebrow: 'Rent & reconciliation',
    overview:
      'Rent reconciliation, arrears, and property-level accounting snapshots for your managed book.',
    steps: [
      {
        title: 'Check arrears',
        description: 'See which tenancies are behind and drill into the property ledger.',
      },
      {
        title: 'Run reconciliation',
        description: 'Match expected rent to received payments per property or period.',
      },
      {
        title: 'Hand off disputes',
        description: 'Escalate persistent arrears to tribunal workflows when needed.',
      },
    ],
    tips: ['Accounting views respect your agency assignment scope.'],
  },
  tribunal: {
    id: 'tribunal',
    pageName: 'Tribunal',
    eyebrow: 'Disputes & escalation',
    overview:
      'Formal dispute cases when informal resolution fails — rent chasing, bond, or breach matters.',
    steps: [
      {
        title: 'Open from a property',
        description: 'Most cases start from arrears or vacate workflows with evidence attached.',
      },
      {
        title: 'Track stages',
        description: 'Follow preparation, filing, hearing, and outcome on each case.',
      },
      {
        title: 'Upload evidence',
        description: 'Keep communications and inspection reports linked to the dispute file.',
      },
    ],
    tips: ['Not every arrears matter needs tribunal — try rent review and reminders first.'],
  },
  archive: {
    id: 'archive',
    pageName: 'Archive',
    eyebrow: 'Historical records',
    overview:
      'Cancelled leasing cycles, ended management, and closed rent reviews kept for lookup without cluttering active lists.',
    steps: [
      {
        title: 'Search by property',
        description: 'Find why a cycle was cancelled or when management ended.',
      },
      {
        title: 'Read-only reference',
        description: 'Archived rows cannot be re-opened — create a new workflow if work resumes.',
      },
    ],
    tips: ['Use Archive when auditing a handover to another agency.'],
  },
  settings: {
    id: 'settings',
    pageName: 'Settings',
    eyebrow: 'Account & preferences',
    overview:
      'Profile, notifications, linked mailboxes, portal access level, and app preferences.',
    steps: [
      {
        title: 'Update your profile',
        description: 'Keep contact details current for audit and client visibility.',
      },
      {
        title: 'Tune notifications',
        description: 'Choose which approvals and urgent alerts push to your device.',
      },
      {
        title: 'Connect integrations',
        description: 'Link email and review mailbox sync status here.',
      },
    ],
    tips: ['Sign out from shared devices when you finish a session.'],
  },
  agencies: {
    id: 'agencies',
    pageName: 'Agencies',
    eyebrow: 'Client agencies',
    overview:
      'Agencies you represent in the portal — team members, service level, and portfolio roll-ups.',
    steps: [
      {
        title: 'Open an agency',
        description: 'View properties, portal agents, and billing details for that client.',
      },
      {
        title: 'Invite team members',
        description: 'Principals can add field agents when your tier allows team management.',
      },
    ],
    tips: ['Inspection-only accounts see a reduced feature set by design.'],
  },
  'rent-review': {
    id: 'rent-review',
    pageName: 'Rent review',
    eyebrow: 'Rent increases',
    overview:
      'Periodic and market rent reviews with landlord approval, notice generation, and lease variation.',
    steps: [
      {
        title: 'Select due reviews',
        description: 'Properties approaching review dates appear here and on the property hub.',
      },
      {
        title: 'Run the workflow',
        description: 'Research, propose rent, obtain landlord sign-off, and issue notice to tenant.',
      },
      {
        title: 'Complete accounting handoff',
        description: 'Submit to accounting when the new rent takes effect.',
      },
    ],
    tips: ['AI research drafts can be edited before sending to the landlord.'],
  },
  vacating: {
    id: 'vacating',
    pageName: 'Vacating',
    eyebrow: 'End of tenancy',
    overview:
      'Vacate confirmations, outgoing inspections, bond processing, and maintenance close-out.',
    steps: [
      {
        title: 'Confirm vacate date',
        description: 'Capture tenant notice and intended key return.',
      },
      {
        title: 'Schedule outgoing inspection',
        description: 'Book the final inspection before bond release.',
      },
      {
        title: 'Settle bond',
        description: 'Complete claims and landlord/tenant disbursement when the file is ready.',
      },
    ],
    tips: ['End-leasing workflows on the property link automatically to vacating tasks.'],
  },
  'tenant-selection': {
    id: 'tenant-selection',
    pageName: 'Tenant selection',
    eyebrow: 'Applicant shortlist',
    overview:
      'Compare applicants across properties and move the chosen tenant into leasing onboarding.',
    steps: [
      {
        title: 'Review applications',
        description: 'See reference checks, documents, and agent notes per applicant.',
      },
      {
        title: 'Approve a tenant',
        description: 'Approval starts the onboarding checklist on the property leasing workflow.',
      },
    ],
    tips: ['Open inspections may feed applicants directly into this queue.'],
  },
  notifications: {
    id: 'notifications',
    pageName: 'Notifications',
    eyebrow: 'Alerts & updates',
    overview:
      'System alerts for assignments, approvals, and workflow milestones. Mark read to clear the bell badge.',
    steps: [
      {
        title: 'Tap to navigate',
        description: 'Each notification deep-links to the relevant property or case.',
      },
      {
        title: 'Mark all read',
        description: 'Clear the inbox when you have triaged overnight alerts.',
      },
    ],
    tips: ['Tune categories in Settings if you receive too many updates.'],
  },
  reports: {
    id: 'reports',
    pageName: 'Reports',
    eyebrow: 'Documents & exports',
    overview:
      'Generated reports and downloadable documents across your portfolio when available for your agency tier.',
    steps: [
      {
        title: 'Browse by type',
        description: 'Inspection, leasing, and statement reports appear as they are issued.',
      },
      {
        title: 'Share externally',
        description: 'Download or forward PDFs to landlords when required.',
      },
    ],
    tips: ['Many reports also live on the individual property Documents tab.'],
  },
  tenants: {
    id: 'tenants',
    pageName: 'Tenants',
    eyebrow: 'Portal accounts',
    overview:
      'Provision and manage tenant logins for properties you oversee — credentials and access history.',
    steps: [
      {
        title: 'Provision after approval',
        description: 'Create tenant portal access once onboarding approves the tenancy.',
      },
      {
        title: 'Resend credentials',
        description: 'Rotate passwords securely when a tenant cannot log in.',
      },
    ],
    tips: ['Tenants only see their own tenancy through the mobile tenant app.'],
  },
  search: {
    id: 'search',
    pageName: 'Search',
    eyebrow: 'Find anything',
    overview:
      'Search properties, cases, and contacts across your assigned portfolio from one field.',
    steps: [
      {
        title: 'Type an address or name',
        description: 'Results prioritize active properties and open cases.',
      },
      {
        title: 'Jump directly',
        description: 'Tap a result to open the property or workflow without browsing menus.',
      },
    ],
    tips: ['Use partial suburb names if the street number is unknown.'],
  },
};

export function getAgentPageGuide(id: AgentPageGuideId): AgentPageGuideContent {
  return AGENT_PAGE_GUIDES[id];
}
