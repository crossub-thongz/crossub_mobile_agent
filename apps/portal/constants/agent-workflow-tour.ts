import {
  AGENT_TOUR_ACCOUNT_MANAGER_STEP,
  type AgentTourStep,
} from '@/constants/agent-page-tour';
import type { AgentPageGuideId } from '@/constants/agent-page-guides';
import { AGENT_WORKFLOW_TRAINING } from '@/constants/agent-workflow-tutorial';
import {
  WORKFLOW_TOUR_STAGES,
  workflowStepTourTarget,
} from '@/constants/workflow-tour-stages';
import { ROUTES } from '@/constants/routes';
import type { PropertyWorkflowActionId } from '@/lib/property-workflow-actions';

export type AgentWorkflowTourId =
  | 'maintenance'
  | 'inspections'
  | 'new_leasing'
  | 'end_leasing'
  | 'tribunal';

export type AgentWorkflowTourPhase = 'entry' | 'detail';

export const AGENT_WORKFLOW_TOUR_ORDER: AgentWorkflowTourId[] = [
  'maintenance',
  'inspections',
  'new_leasing',
  'end_leasing',
  'tribunal',
];

export function isAgentWorkflowTourId(value: string | null): value is AgentWorkflowTourId {
  return (
    value === 'maintenance' ||
    value === 'inspections' ||
    value === 'new_leasing' ||
    value === 'end_leasing' ||
    value === 'tribunal'
  );
}

export function workflowTourGuideId(id: AgentWorkflowTourId): AgentPageGuideId {
  const map: Record<AgentWorkflowTourId, AgentPageGuideId> = {
    maintenance: 'workflow-tour-maintenance',
    inspections: 'workflow-tour-inspections',
    new_leasing: 'workflow-tour-new-leasing',
    end_leasing: 'workflow-tour-end-leasing',
    tribunal: 'workflow-tour-tribunal',
  };
  return map[id];
}

export function workflowTourEntryHref(id: AgentWorkflowTourId): string {
  const filter =
    id === 'maintenance'
      ? 'Maintenance'
      : id === 'inspections'
        ? 'Inspection'
        : id === 'new_leasing' || id === 'end_leasing'
          ? 'Leasing'
          : 'Tribunal';
  return `${ROUTES.TASKS}?filter=${filter}&workflowTour=${id}`;
}

export function workflowTourFromDetailPath(pathname: string | null): AgentWorkflowTourId | null {
  if (!pathname) return null;
  const parts = pathname.replace(/\/$/, '').split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  const map: Record<string, AgentWorkflowTourId> = {
    maintenance: 'maintenance',
    inspections: 'inspections',
    leasing: 'new_leasing',
    vacating: 'end_leasing',
    tribunal: 'tribunal',
  };
  return map[parts[0]!] ?? null;
}

function moduleCopy(id: AgentWorkflowTourId) {
  const mod = AGENT_WORKFLOW_TRAINING[id];
  return { pageName: mod.pageName, overview: mod.overview, eyebrow: mod.eyebrow };
}

const WORKFLOW_TOUR_CREATE_ACTION: Record<AgentWorkflowTourId, PropertyWorkflowActionId> = {
  maintenance: 'start_maintenance',
  inspections: 'schedule_open_inspection',
  new_leasing: 'start_leasing',
  end_leasing: 'start_end_leasing',
  tribunal: 'open_tribunal',
};

export function workflowTourCreateAction(id: AgentWorkflowTourId): PropertyWorkflowActionId {
  return WORKFLOW_TOUR_CREATE_ACTION[id];
}

export function workflowTourCreateMenuTarget(id: AgentWorkflowTourId): string {
  return `workflow-tour-new-action-${workflowTourCreateAction(id)}`;
}

const CREATE_MENU_LABEL: Record<AgentWorkflowTourId, string> = {
  maintenance: 'Add new repair job',
  inspections: 'Open inspection (or Ingoing / Outgoing / Routine)',
  new_leasing: 'New Leasing / Re-Letting',
  end_leasing: 'Vacating / End leasing',
  tribunal: 'Add tribunal',
};

function buildCreateSteps(id: AgentWorkflowTourId): AgentTourStep[] {
  const menuTarget = workflowTourCreateMenuTarget(id);
  const menuLabel = CREATE_MENU_LABEL[id];
  return [
    {
      id: `${id}-create-new`,
      target: 'tasks-new',
      title: 'Open New task',
      description:
        'Every workflow starts from New task on Tasks. Click it to open the create menu.',
      actionNote: 'Click New task now — the next step highlights the menu option for this workflow.',
    },
    {
      id: `${id}-create-pick`,
      target: menuTarget,
      title: 'Choose this workflow',
      description: `Select ${menuLabel} from the menu to start the create form.`,
      actionNote: `Tap ${menuLabel} to pick a property and open the form.`,
    },
    {
      id: `${id}-create-property`,
      target: 'workflow-tour-property-picker',
      title: 'Select a property',
      description:
        'Search by address or tenant, then choose the property this case belongs to.',
      actionNote: 'Pick the property — the create form opens automatically.',
    },
    {
      id: `${id}-create-form`,
      target: 'workflow-tour-create-form',
      title: 'Complete the create form',
      description:
        'Required fields are marked. Portfolio data may prefill tenant, rent, and access details.',
      actionNote:
        'Fill in the essentials for your demo case. You can use test data — the tour continues after you submit.',
    },
    {
      id: `${id}-create-submit`,
      target: 'workflow-tour-create-submit',
      title: 'Create the case',
      description:
        'Submit to open the job. The tour resumes on the job page and walks through every workflow stage.',
      actionNote:
        'After you create the case, the guided tour continues on the Workflow tab with each lifecycle step.',
    },
  ];
}

const ENTRY_TASKS_STEPS: Record<AgentWorkflowTourId, AgentTourStep[]> = {
  maintenance: [
    {
      id: 'maint-entry-category',
      target: 'tasks-category-maintenance',
      title: 'Maintenance on Tasks',
      description:
        'Filter to Maintenance to see repair jobs across your portfolio — quotes, scheduling, and completions.',
    },
    {
      id: 'maint-entry-bucket',
      target: 'tasks-bucket-need_action',
      title: 'Need my action',
      description:
        'Jobs waiting on you appear here. After you create a case, rose badges on the job page show where to decide.',
      actionNote:
        'Use Need my action each session to triage. The tour below shows how to create a job and walk every stage.',
    },
  ],
  inspections: [
    {
      id: 'insp-entry-category',
      target: 'tasks-category-inspection',
      title: 'Inspections on Tasks',
      description:
        'Open, ingoing, outgoing, and routine inspections are grouped under the Inspection tab.',
    },
    {
      id: 'insp-entry-bucket',
      target: 'tasks-bucket-need_action',
      title: 'Report reviews',
      description:
        'Inspections awaiting your approval show under Need my action before CROSSUB can publish reports.',
      actionNote:
        'The tour walks you through creating an inspection, then each workflow stage on the job page.',
    },
  ],
  new_leasing: [
    {
      id: 'lease-entry-category',
      target: 'tasks-category-leasing',
      title: 'Leasing on Tasks',
      description:
        'Active re-let cycles — advertising, applicants, onboarding — appear under the Leasing tab.',
    },
    {
      id: 'lease-entry-bucket',
      target: 'tasks-bucket-need_action',
      title: 'Leasing decisions',
      description:
        'Applicant approvals and onboarding blockers surface here when you must act before CROSSUB proceeds.',
      actionNote:
        'Next: create a leasing case, then the tour guides you through every letting stage on the job page.',
    },
  ],
  end_leasing: [
    {
      id: 'vacate-entry-category',
      target: 'tasks-category-leasing',
      title: 'End leasing on Tasks',
      description:
        'Vacate files appear alongside leasing work. End-of-lease cases run notice → outgoing inspection → bond settlement.',
    },
    {
      id: 'vacate-entry-bucket',
      target: 'tasks-bucket-need_action',
      title: 'Vacate approvals',
      description:
        'Bond and make-good decisions show under Need my action when the file needs your sign-off.',
      actionNote:
        'You will create a vacate case from New task, then tour each end-leasing stage on the job page.',
    },
  ],
  tribunal: [
    {
      id: 'trib-entry-category',
      target: 'tasks-category-tribunal',
      title: 'Tribunal on Tasks',
      description:
        'NCAT and rent-chasing matters appear under Tribunal.',
    },
    {
      id: 'trib-entry-bucket',
      target: 'tasks-bucket-need_action',
      title: 'Matters needing your input',
      description:
        'Evidence requests and hearing prep show under Need my action until CROSSUB can advance the file.',
      actionNote:
        'Upload evidence and confirm hearing details from the job Workflow tab when prompted.',
    },
  ],
};

function detailRailStageSteps(id: AgentWorkflowTourId): AgentTourStep[] {
  return WORKFLOW_TOUR_STAGES[id].map((stage) => ({
    id: `${id}-stage-${stage.id}`,
    target: workflowStepTourTarget(stage.id),
    title: stage.title,
    description: stage.description,
    actionNote: stage.agentAction,
  }));
}

function detailTabSteps(id: AgentWorkflowTourId): AgentTourStep[] {
  const tabs: Record<AgentWorkflowTourId, AgentTourStep[]> = {
    maintenance: [
      {
        id: 'maint-tab-quotes',
        target: 'workflow-tab-quotes',
        title: 'Quotes tab',
        description:
          'Compare contractor pricing and scope. Approve, decline, or counter from the workflow panel when a quote needs your decision.',
      },
      {
        id: 'maint-tab-documents',
        target: 'workflow-tab-documents',
        title: 'Documents tab',
        description:
          'Intake photos, quotes, completion evidence, and invoices live here for landlord reporting and disputes.',
      },
      {
        id: 'maint-tab-activity',
        target: 'workflow-tab-activity',
        title: 'Activity tab',
        description:
          'Audit trail of status changes, emails sent, and who acted on the job — useful when chasing contractors or tenants.',
      },
    ],
    inspections: [
      {
        id: 'insp-tab-documents',
        target: 'workflow-tab-documents',
        title: 'Documents & report',
        description:
          'Approved report PDFs and photo sets are stored here. Download or share with landlords after you approve the report.',
      },
      {
        id: 'insp-tab-activity',
        target: 'workflow-tab-activity',
        title: 'Activity tab',
        description:
          'Scheduling changes, inspector assignments, and approval history are recorded for compliance and bond evidence.',
      },
    ],
    new_leasing: [
      {
        id: 'lease-tab-applicants',
        target: 'workflow-tab-applicants',
        title: 'Applicants tab',
        description:
          'Shortlisted applications, references, and documents. Approving an applicant starts the onboarding checklist.',
      },
      {
        id: 'lease-tab-documents',
        target: 'workflow-tab-documents',
        title: 'Documents tab',
        description:
          'Lease agreements, disclosure packs, and supporting PDFs generated during onboarding.',
      },
      {
        id: 'lease-tab-activity',
        target: 'workflow-tab-activity',
        title: 'Activity tab',
        description:
          'Marketing milestones, inspection links, and onboarding events across the letting cycle.',
      },
    ],
    end_leasing: [
      {
        id: 'vacate-tab-inspections',
        target: 'workflow-tab-inspections',
        title: 'Inspections tab',
        description:
          'Outgoing and ingoing inspection links for bond comparison. The outgoing report drives make-good and bond claims.',
      },
      {
        id: 'vacate-tab-documents',
        target: 'workflow-tab-documents',
        title: 'Documents tab',
        description:
          'Notice records, inspection reports, bond paperwork, and settlement evidence for the vacate file.',
      },
      {
        id: 'vacate-tab-activity',
        target: 'workflow-tab-activity',
        title: 'Activity tab',
        description:
          'Vacate milestones — notice lodged, keys returned, bond released — with a full audit trail.',
      },
    ],
    tribunal: [
      {
        id: 'trib-tab-orders',
        target: 'workflow-tab-orders',
        title: 'Orders tab',
        description:
          'Tribunal orders, outcomes, and compliance steps once a hearing is complete or a matter is resolved.',
      },
      {
        id: 'trib-tab-documents',
        target: 'workflow-tab-documents',
        title: 'Documents tab',
        description:
          'Evidence bundles, applications, and correspondence filed for the matter.',
      },
      {
        id: 'trib-tab-activity',
        target: 'workflow-tab-activity',
        title: 'Activity tab',
        description:
          'Submission, hearing scheduling, and status changes on the tribunal timeline.',
      },
    ],
  };
  return tabs[id];
}

function buildDetailSteps(id: AgentWorkflowTourId): AgentTourStep[] {
  const { pageName, overview } = moduleCopy(id);
  return [
    {
      id: `${id}-detail-intro`,
      title: `${pageName} workflow`,
      description: overview,
      actionNote:
        'You created the case — now walk each stage on the rail. Rose Need your action badges show where you must decide.',
    },
    AGENT_TOUR_ACCOUNT_MANAGER_STEP,
    {
      id: `${id}-detail-badge`,
      target: 'workflow-case-badge',
      title: 'Need your action vs CROS handling',
      description:
        'The case badge tells you at a glance whether you must decide something now or CROSSUB is carrying the work.',
      actionNote:
        'Rose Need your action — open the job and act in the Workflow panel. Green CROS handling — monitor only until the badge changes.',
    },
    {
      id: `${id}-detail-status`,
      target: 'workflow-status',
      title: 'Current status',
      description:
        'The status banner explains the live blocker, what CROSSUB recommends, and the next step in plain language.',
      actionNote:
        'Read the status title and subtitle first — they tell you exactly what decision or confirmation is waiting on you.',
    },
    {
      id: `${id}-detail-rail`,
      target: 'workflow-rail',
      title: 'Workflow rail',
      description:
        'The rail maps every stage from start to finish. Tap a completed or active step to see what happened or what is pending.',
      actionNote:
        'Focus on the Live step (amber label). That is where the case sits now — earlier steps are history, later steps unlock after you act.',
    },
    {
      id: `${id}-detail-workflow-tab`,
      target: 'workflow-tab-workflow',
      title: 'Workflow tab',
      description:
        'Always open this tab when the badge says Need your action. It holds approve buttons, forms, and evidence for the current stage.',
      actionNote:
        'If you only remember one place to act, it is here — not Messages or Activity.',
    },
    {
      id: `${id}-detail-action-panel`,
      target: 'workflow-action-panel',
      title: 'Where you take action',
      description:
        'The highlighted panel shows the live step name and the controls for your decision — approve, decline, assign, upload, or confirm.',
      actionNote:
        'Buttons and forms in this panel are what unblock the job. Complete them, then check Tasks — the row should leave Need my action.',
    },
    ...detailRailStageSteps(id),
    {
      id: `${id}-detail-tabs`,
      target: 'workflow-tabs',
      title: 'Job tabs',
      description:
        'Use tabs to move between workflow actions, reference details, documents, and history without leaving the job.',
    },
    ...detailTabSteps(id),
    {
      id: `${id}-detail-finish`,
      title: 'You are set',
      description: AGENT_WORKFLOW_TRAINING[id].tips[0] ?? 'Replay this tour anytime from Support → Workflow demo tours.',
    },
  ];
}

function buildEntrySteps(id: AgentWorkflowTourId): AgentTourStep[] {
  const { pageName, overview, eyebrow } = moduleCopy(id);
  const intro: AgentTourStep = {
    id: `${id}-entry-intro`,
    title: `${pageName} demo tour`,
    description: `${eyebrow}. ${overview} This tour covers creating a case, then every workflow stage on the job page.`,
  };

  return [
    intro,
    AGENT_TOUR_ACCOUNT_MANAGER_STEP,
    ...ENTRY_TASKS_STEPS[id],
    ...buildCreateSteps(id),
  ];
}

export function workflowTourSteps(
  id: AgentWorkflowTourId,
  phase: AgentWorkflowTourPhase,
): AgentTourStep[] {
  return phase === 'entry' ? buildEntrySteps(id) : buildDetailSteps(id);
}

export function resolveWorkflowTourContext(
  pathname: string | null,
  searchParams: Pick<URLSearchParams, 'get'>,
  pendingId: AgentWorkflowTourId | null,
): { id: AgentWorkflowTourId; phase: AgentWorkflowTourPhase } | null {
  const param = searchParams.get('workflowTour');
  if (isAgentWorkflowTourId(param)) {
    if (pathname === ROUTES.TASKS) return { id: param, phase: 'entry' };
  }

  const detailId = workflowTourFromDetailPath(pathname);
  if (detailId && pendingId === detailId) {
    return { id: detailId, phase: 'detail' };
  }

  if (detailId && searchParams.get('workflowTour') === '1') {
    return { id: detailId, phase: 'detail' };
  }

  return null;
}

export const AGENT_WORKFLOW_TOUR_LABELS: Record<
  AgentWorkflowTourId,
  { title: string; description: string }
> = {
  maintenance: {
    title: 'Maintenance',
    description: 'Create a job → intake through completion on the workflow rail',
  },
  inspections: {
    title: 'Inspections',
    description: 'Book an inspection → every stage from schedule to report',
  },
  new_leasing: {
    title: 'New leasing',
    description: 'Start a let → advertising through onboarding',
  },
  end_leasing: {
    title: 'End leasing',
    description: 'Open a vacate file → notice through bond settlement',
  },
  tribunal: {
    title: 'Tribunal',
    description: 'Evidence → submission → hearing → orders',
  },
};
