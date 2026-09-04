import { AGENT_MODULE_TUTORIALS, type AgentTutorialModuleId } from '@/constants/agent-module-tutorial';
import { ROUTES } from '@/constants/routes';
import type { AgentPageGuideId } from '@/constants/agent-page-guides';

export type AgentTourStep = {
  id: string;
  title: string;
  description: string;
  /** `data-tour` value. Omit for a centered intro card. */
  target?: string;
  /** When the agent must act at this step — shown in the tour callout. */
  actionNote?: string;
};

/** Shown on every live tour step — where agents reach their Account Manager. */
export const AGENT_TOUR_ACCOUNT_MANAGER_NOTE =
  'Your Account Manager: Support → Contact account manager (sidebar), More → Support (mobile), or Phone in the header.';

export const AGENT_TOUR_ACCOUNT_MANAGER_STEP: AgentTourStep = {
  id: 'account-manager',
  target: 'contact-account-manager',
  title: 'Contact your Account Manager',
  description:
    'CROSSUB Account Managers run day-to-day work on your portfolio. The highlighted control is how you reach them — Support → Contact account manager on desktop, More → Support on mobile, or Phone in the header for calls and manager messages.',
};

export function tourModuleFromPathname(pathname: string | null): AgentTutorialModuleId | null {
  if (!pathname) return null;
  const root = pathname.replace(/\/$/, '').split('/').filter(Boolean)[0];
  if (root === 'properties') return 'properties';
  if (root === 'tasks') return 'tasks';
  if (root === 'archive') return 'history';
  return null;
}

export function tourHref(module: AgentTutorialModuleId): string {
  if (module === 'tasks') return `${ROUTES.TASKS}?tour=1`;
  if (module === 'history') return `${ROUTES.ARCHIVE}?tour=1`;
  return `${ROUTES.PROPERTIES}?tour=1`;
}

export function tourGuideId(module: AgentTutorialModuleId): AgentPageGuideId {
  return module === 'history' ? 'archive' : module;
}

function copy(module: AgentTutorialModuleId, title: string): { title: string; description: string } {
  const item =
    AGENT_MODULE_TUTORIALS[module].functions.find((entry) => entry.title === title) ??
    AGENT_MODULE_TUTORIALS[module].steps.find((entry) => entry.title === title);
  return {
    title,
    description: item?.description ?? AGENT_MODULE_TUTORIALS[module].overview,
  };
}

export const AGENT_PAGE_TOURS: Record<AgentTutorialModuleId, AgentTourStep[]> = {
  properties: [
    {
      id: 'properties-intro',
      title: AGENT_MODULE_TUTORIALS.properties.pageName,
      description: AGENT_MODULE_TUTORIALS.properties.overview,
    },
    AGENT_TOUR_ACCOUNT_MANAGER_STEP,
    { id: 'properties-nav', target: 'nav-properties', ...copy('properties', 'Open Properties') },
    { id: 'properties-add', target: 'properties-add', ...copy('properties', 'Add property') },
    { id: 'properties-search', target: 'properties-search', ...copy('properties', 'Search') },
    {
      id: 'properties-occupancy',
      target: 'properties-occupancy',
      ...copy('properties', 'All / Occupied / Vacant'),
    },
    { id: 'properties-arrears', target: 'properties-filter-arrears', ...copy('properties', 'Arrears') },
    {
      id: 'properties-needs',
      target: 'properties-filter-needs_attention',
      ...copy('properties', 'Needs attention'),
    },
    {
      id: 'properties-archived',
      target: 'properties-filter-archived',
      ...copy('properties', 'Archived filter'),
    },
    { id: 'properties-sort', target: 'properties-sort', ...copy('properties', 'Sort') },
    { id: 'properties-view', target: 'properties-view', ...copy('properties', 'List and Map') },
    { id: 'properties-tenancy', target: 'properties-tenancy', ...copy('properties', 'Tenancy column') },
    {
      id: 'properties-status',
      target: 'properties-status',
      ...copy('properties', 'Status and Tasks columns'),
    },
    { id: 'properties-preview', target: 'properties-preview', ...copy('properties', 'Preview panel') },
    { id: 'properties-menu', target: 'properties-row-menu', ...copy('properties', 'Use the row menu') },
    { id: 'properties-pages', target: 'properties-pagination', ...copy('properties', 'Pagination') },
  ],
  tasks: [
    {
      id: 'tasks-intro',
      title: AGENT_MODULE_TUTORIALS.tasks.pageName,
      description: AGENT_MODULE_TUTORIALS.tasks.overview,
    },
    AGENT_TOUR_ACCOUNT_MANAGER_STEP,
    { id: 'tasks-nav', target: 'nav-tasks', ...copy('tasks', 'Open Tasks') },
    { id: 'tasks-need', target: 'tasks-bucket-need_action', ...copy('tasks', 'Need my action') },
    { id: 'tasks-cros', target: 'tasks-bucket-cros_handling', ...copy('tasks', 'CROS handling') },
    { id: 'tasks-waiting', target: 'tasks-bucket-waiting', ...copy('tasks', 'Waiting') },
    { id: 'tasks-done', target: 'tasks-bucket-completed', ...copy('tasks', 'Completed') },
    { id: 'tasks-types', target: 'tasks-type-tabs', ...copy('tasks', 'Type tabs') },
    { id: 'tasks-search', target: 'tasks-search', ...copy('tasks', 'Search') },
    { id: 'tasks-filters', target: 'tasks-filters', ...copy('tasks', 'Filters button') },
    { id: 'tasks-table', target: 'tasks-table', ...copy('tasks', 'Task table') },
    { id: 'tasks-open', target: 'tasks-table', ...copy('tasks', 'Open / Review') },
    { id: 'tasks-new', target: 'tasks-new', ...copy('tasks', 'Create work with New task') },
    { id: 'tasks-new-leasing', target: 'tasks-new', ...copy('tasks', 'New task — Leasing') },
    { id: 'tasks-new-rent', target: 'tasks-new', ...copy('tasks', 'New task — Rent review') },
    { id: 'tasks-new-maint', target: 'tasks-new', ...copy('tasks', 'New task — Maintenance') },
    { id: 'tasks-new-insp', target: 'tasks-new', ...copy('tasks', 'New task — Inspection') },
    {
      id: 'tasks-new-other',
      target: 'tasks-new',
      ...copy('tasks', 'New task — Financial and Tribunal'),
    },
  ],
  history: [
    {
      id: 'history-intro',
      title: AGENT_MODULE_TUTORIALS.history.pageName,
      description: AGENT_MODULE_TUTORIALS.history.overview,
    },
    AGENT_TOUR_ACCOUNT_MANAGER_STEP,
    { id: 'history-nav', target: 'nav-history', ...copy('history', 'Open History') },
    { id: 'history-properties', target: 'history-tab-properties', ...copy('history', 'Properties tab') },
    { id: 'history-open', target: 'history-property-list', ...copy('history', 'Open archived property') },
    { id: 'history-restore', target: 'history-restore', ...copy('history', 'Restore') },
    {
      id: 'history-tasks',
      target: 'history-tab-property-tasks',
      ...copy('history', 'Properties Tasks tab'),
    },
    {
      id: 'history-group',
      target: 'history-task-group',
      ...copy('history', 'Expand a property group'),
    },
  ],
};
