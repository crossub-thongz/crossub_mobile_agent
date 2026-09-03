import { ROUTES } from '@/constants/routes';

export type AgentTutorialModuleId = 'properties' | 'tasks' | 'history';

export type AgentTutorialItem = {
  title: string;
  description: string;
};

export type AgentTutorialModule = {
  id: AgentTutorialModuleId;
  pageName: string;
  href: string;
  eyebrow: string;
  overview: string;
  steps: AgentTutorialItem[];
  functions: AgentTutorialItem[];
  tips: string[];
};

export const AGENT_MODULE_TUTORIALS: Record<AgentTutorialModuleId, AgentTutorialModule> = {
  properties: {
    id: 'properties',
    pageName: 'Properties',
    href: ROUTES.PROPERTIES,
    eyebrow: 'Your portfolio',
    overview:
      'Properties is your live list of every address you manage. Add listings, find a tenancy fast, preview a property, open the full profile, and archive or restore management — without leaving this page.',
    steps: [
      {
        title: 'Open Properties',
        description:
          'Use Properties in the sidebar. The list is your working portfolio. Archived addresses also appear here when you choose the Archived filter, or in History.',
      },
      {
        title: 'Add a listing',
        description:
          'Tap Add property (top right on desktop, or above the search on mobile). Complete registration for the address, owner, and tenancy. Unfinished drafts stay on the list so you can continue later.',
      },
      {
        title: 'Find the right property',
        description:
          'Search by address, suburb, tenant, or owner. Then use the chips — All, Occupied, Vacant, Needs attention, and Archived. Arrears appears when your agency has full management access.',
      },
      {
        title: 'Preview, then open',
        description:
          'On desktop, click a row once to load the preview panel on the right (overview, jobs CROS is handling, upcoming items). Click the selected row again, double-click, or use Open profile to enter the full property hub.',
      },
      {
        title: 'Use the row menu',
        description:
          'The three-dot menu on a live property opens the profile or starts Archive. On a draft it offers Continue registration or Delete draft. On an archived row it offers Restore.',
      },
    ],
    functions: [
      {
        title: 'Add property',
        description:
          'Starts property registration. You enter the address and parties. Until registration is finished the row shows as a draft — open it to continue, or delete the draft if it was created by mistake.',
      },
      {
        title: 'Search',
        description:
          'Filters the current list as you type. Matches street address, suburb, tenant names (including extra household tenants), owner, agency, and property manager.',
      },
      {
        title: 'All / Occupied / Vacant',
        description:
          'All shows every live listing. Occupied is currently tenanted. Vacant is available to let. Counts on each chip are for the live list, not the search results.',
      },
      {
        title: 'Arrears',
        description:
          'Full-management agencies only. Shows properties with outstanding rent, bills, or bond recorded on the portfolio. Open the property Financials tab to chase or record arrears.',
      },
      {
        title: 'Needs attention',
        description:
          'Properties that have at least one item waiting on you — quote approval, application decision, inspection follow-up, or similar. The red number on Tasks in the sidebar is the portfolio total of those items.',
      },
      {
        title: 'Archived filter',
        description:
          'Shows properties you have archived off the live list. Restore from the row menu to bring one back. Permanent deletes never appear here.',
      },
      {
        title: 'Sort',
        description:
          'Newest to oldest, oldest to newest, A–Z, or Z–A by address. Sorting applies after search and filters.',
      },
      {
        title: 'List and Map',
        description:
          'List is the table (property, tenancy, rent, lease expiry, status, open tasks). Map plots the same filtered set. Selecting a pin or row still drives the desktop preview.',
      },
      {
        title: 'Tenancy column',
        description:
          'Shows the primary tenant. If there are co-tenants, the info icon lists the other names on hover. Vacant properties show as vacant instead of a tenant name.',
      },
      {
        title: 'Status and Tasks columns',
        description:
          'Status is occupancy and health (including new, draft, arrears, or needs attention). Tasks summarises open maintenance, leasing, and inspection work on that address.',
      },
      {
        title: 'Preview panel',
        description:
          'Desktop only. After you select a row, the right-hand panel shows current tenancy, rent, lease, jobs CROS is handling, and shortcuts into the property. It does not replace the full profile.',
      },
      {
        title: 'Open profile',
        description:
          'Opens the property hub: Overview, Tasks, Financials (full management), Documents, Archived tenancies, and Activities. Start leasing, repairs, inspections, rent review, vacating, and tribunal from the hub or from Tasks → New task.',
      },
      {
        title: 'End management',
        description:
          'From Archive on a live property, choose End management and set the end date. The property stays on your live list with that date recorded — use this when you are winding down but still need it visible.',
      },
      {
        title: 'Archive property',
        description:
          'Removes the property from the live list and stores it in History (and the Archived filter). Open jobs on that address are closed and kept under Properties Tasks in History. Restore later if management resumes.',
      },
      {
        title: 'Delete draft',
        description:
          'Permanently removes an unfinished registration. This is only for drafts — live properties cannot be deleted this way.',
      },
      {
        title: 'Restore',
        description:
          'Moves an archived property back to the live list. Closed History tasks stay closed; new work is created from Tasks or the property hub.',
      },
      {
        title: 'Pagination',
        description:
          'Use Prev/Next and Rows per page (10, 25, or 50) when the filtered list is long. Changing search, filter, or sort returns you to page 1.',
      },
    ],
    tips: [
      'Click once to preview, again (or Open profile) to work the property.',
      'Needs attention is the fastest way to see which addresses are blocking CROS.',
      'Archive is reversible. Delete draft is not. End management keeps the property on the live list.',
      'Replay this tutorial anytime from Support → How to use, or from How to use on this page.',
    ],
  },
  tasks: {
    id: 'tasks',
    pageName: 'Tasks',
    href: ROUTES.TASKS,
    eyebrow: 'All portfolio work',
    overview:
      'Tasks is the job board for your portfolio. Every live maintenance, inspection, leasing, rent review, and tribunal case appears here, grouped by whether you must act, CROS is handling it, you are waiting on someone else, or it recently finished.',
    steps: [
      {
        title: 'Open Tasks',
        description:
          'Use Tasks in the sidebar. The red badge is how many items currently need your decision. Open Tasks from a property if you only want that address.',
      },
      {
        title: 'Pick a status card',
        description:
          'Need my action, CROS handling, Waiting, and Completed (last 30 days) filter the table. Tap the same card again to return to all statuses.',
      },
      {
        title: 'Narrow by type',
        description:
          'Use the tabs — All, Maintenance, Inspection, Leasing, Rent review, Tribunal. Inspection-only agencies only see inspection and tribunal work.',
      },
      {
        title: 'Open the job',
        description:
          'Click a row to open that case. If the Action column shows Review, that item is waiting on you — open it and decide (approve a quote, pick a tenant, confirm an inspection, and so on).',
      },
      {
        title: 'Create work with New task',
        description:
          'New task starts leasing, vacating, rent review, a repair, an inspection (open, ingoing, outgoing, or routine), rent chasing, or a tribunal case. Choose the property in the dialog unless you already opened Tasks for one address.',
      },
    ],
    functions: [
      {
        title: 'Need my action',
        description:
          'Items that cannot proceed until you decide. Typical examples: maintenance quote approval, tenant application, rent review recommendation, inspection report follow-up, overdue onboarding. Work these first.',
      },
      {
        title: 'CROS handling',
        description:
          'CROSSUB is carrying the job (arranging contractors, running an open, collecting documents). You do not need to act unless the status moves back to Need my action.',
      },
      {
        title: 'Waiting',
        description:
          'The next step sits with a tenant, owner, contractor, or another party. Check back when they respond; CROS will move it when something needs you.',
      },
      {
        title: 'Completed',
        description:
          'Jobs finished in the last 30 days. Older closed work for archived properties lives under History → Properties Tasks.',
      },
      {
        title: 'Type tabs',
        description:
          'Maintenance (repairs and quotes), Inspection (open, routine, ingoing, outgoing), Leasing (new letting, applications, vacating), Rent review, and Tribunal. Counts follow the status card you selected.',
      },
      {
        title: 'Search',
        description:
          'Matches task title, address, suburb, and tenant. Combine with a status card and type tab to shrink a large portfolio.',
      },
      {
        title: 'Filters button',
        description:
          'Jumps focus to search so you can type immediately. Status cards and type tabs are the main filters.',
      },
      {
        title: 'Task table',
        description:
          'Each row shows the job name, property, type, status, and last update. A rose highlight and Review button mean the case is in Need my action.',
      },
      {
        title: 'Open / Review',
        description:
          'Opens the case workspace for that job — messages, documents, quotes, schedules, and the decision CROS is waiting on. Back returns you to Tasks.',
      },
      {
        title: 'New task — Leasing',
        description:
          'New Leasing / Re-Letting starts a vacant or re-let cycle (advertise, applications, approval, onboarding). Vacating starts end-of-lease / keys / outgoing for a current tenancy.',
      },
      {
        title: 'New task — Rent review',
        description:
          'Opens a rent review on the chosen property. Only one live rent review is allowed per property; finish or close the current one before starting another.',
      },
      {
        title: 'New task — Maintenance',
        description:
          'Creates a repair request. CROS can then quote, assign a contractor, and bring the job back to you only if approval or extra instruction is required.',
      },
      {
        title: 'New task — Inspection',
        description:
          'Schedule Open (prospects), Ingoing (move-in condition), Outgoing (end of lease), or Routine (periodic). Pick the property and the requested window in the dialog.',
      },
      {
        title: 'New task — Financial and Tribunal',
        description:
          'Rent chasing records rent, bill, or bond arrears on a property. Add tribunal opens an NCAT (or equivalent) case from those arrears or another dispute. Full management access required for rent chasing.',
      },
      {
        title: 'Property-scoped Tasks',
        description:
          'When you open Tasks from a property, the list is limited to that address and New task is pre-filled with it. Use this on-site so you are not paging through the whole portfolio.',
      },
    ],
    tips: [
      'Clear Need my action daily — those rows are the only ones blocking CROS.',
      'If a job is CROS handling, you do not need to chase the contractor from Tasks.',
      'Create work with New task rather than asking CROS in chat when you already know the job type.',
      'Inspection-only agencies will not see leasing, rent review, or rent-chasing actions.',
    ],
  },
  history: {
    id: 'history',
    pageName: 'History',
    href: ROUTES.ARCHIVE,
    eyebrow: 'Archived properties and closed jobs',
    overview:
      'History keeps addresses you no longer manage on the live list, plus the jobs that were closed when they were archived. Use it for handover audits, old tenancies, and restoring a property if management starts again.',
    steps: [
      {
        title: 'Open History',
        description:
          'Use History in the sidebar (still at /archive). It is separate from the live Properties list.',
      },
      {
        title: 'Choose Properties or Properties Tasks',
        description:
          'Properties is the archived address list. Properties Tasks groups every closed job under its archived address. Task groups start collapsed — tap an address to expand.',
      },
      {
        title: 'Look up or restore',
        description:
          'Open an archived property to read its profile. Restore from the row menu to put it back on Properties. Closed tasks stay closed after restore.',
      },
    ],
    functions: [
      {
        title: 'Properties tab',
        description:
          'Every archived address, with the same kind of list as Properties. Counts in the tab label show how many addresses are stored. Empty means nothing has been archived yet.',
      },
      {
        title: 'Open archived property',
        description:
          'Opens the property hub in a lookup state so you can read tenancy, documents, and past activity. Start new live work only after you Restore, unless you are only reviewing history.',
      },
      {
        title: 'Restore',
        description:
          'Returns the property to the live Properties list. Use this when the agency takes the management back. You will create new tasks from Tasks or the hub; old closed jobs remain in History.',
      },
      {
        title: 'Properties Tasks tab',
        description:
          'Closed maintenance, inspections, leasing, rent reviews, and tribunal cases, grouped by archived address. Each group shows how many closed tasks it holds.',
      },
      {
        title: 'Expand a property group',
        description:
          'Groups are collapsed by default so a long history stays readable. Expand to see the closed job table (or cards on mobile). Click a job to open the historical case.',
      },
      {
        title: 'Open a closed task',
        description:
          'Shows the record as it was when the property was archived — useful for disputes, handover, or “what happened on this repair?”. It does not reopen the job on the live Tasks board.',
      },
      {
        title: 'How properties get here',
        description:
          'From Properties, row menu → Archive → Archive property. End management does not move the property here. Delete draft removes a draft forever and will not appear in History.',
      },
    ],
    tips: [
      'Use History for agency handover packs — addresses plus the closed jobs under each one.',
      'Restore does not resurrect closed tasks. Raise a New task if the work is needed again.',
      'Live Properties still has an Archived filter; History is the dedicated module for the same records plus closed jobs.',
    ],
  },
};

export const AGENT_MODULE_TUTORIAL_ORDER: AgentTutorialModuleId[] = [
  'properties',
  'tasks',
  'history',
];

export function isAgentTutorialModuleId(value: string | null): value is AgentTutorialModuleId {
  return value === 'properties' || value === 'tasks' || value === 'history';
}
