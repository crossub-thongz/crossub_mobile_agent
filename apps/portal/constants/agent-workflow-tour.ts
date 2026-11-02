import { AGENT_COPY_VARIANT, type AgentCopyVariant } from '@/constants/agent-copy-variant';
import { AGENT_TOUR_ROLE_STEP, type AgentTourStep } from '@/constants/agent-page-tour';
import type { AgentPageGuideId } from '@/constants/agent-page-guides';
import { AGENT_WORKFLOW_TRAINING_BY_VARIANT } from '@/constants/agent-workflow-tutorial';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { workflowStepTourTarget, workflowTourStages } from '@/constants/workflow-tour-stages';
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

function moduleCopy(id: AgentWorkflowTourId, variant: AgentCopyVariant) {
  const mod = AGENT_WORKFLOW_TRAINING_BY_VARIANT[variant][id];
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
  maintenance: 'Lodge Maintenance',
  inspections: 'Open',
  new_leasing: 'New Leasing / Re-Letting',
  end_leasing: 'Vacating',
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

/** Tour copy that names who carries the work: CROSSUB on serviced tiers, the agent on Self-Manage. */
const WORKFLOW_TOUR_ROLE_COPY: Record<
  AgentCopyVariant,
  {
    badgeTitle: string;
    badgeDescription: string;
    badgeActionNote: string;
    statusDescription: string;
    /** Replacement descriptions for Tasks entry steps, by step id. */
    entryStepDescriptions: Readonly<Record<string, string>>;
  }
> = {
  [AGENT_COPY_VARIANT.SERVICED]: {
    badgeTitle: 'Need your action vs CROSSUB handling',
    badgeDescription:
      'The case badge tells you at a glance whether you must decide something now or CROSSUB is carrying the work.',
    badgeActionNote:
      'Rose Need your action — open the job and act in the Workflow panel. Green CROSSUB handling — monitor only until the badge changes.',
    statusDescription:
      'The status banner explains the live blocker, what CROSSUB recommends, and the next step in plain language.',
    entryStepDescriptions: {},
  },
  [AGENT_COPY_VARIANT.SELF_MANAGED]: {
    badgeTitle: 'Need your action vs in progress',
    badgeDescription: `The case badge tells you at a glance whether a decision is waiting on you now or the job is moving, with ${CROS_ASSISTANT_NAME} assisting.`,
    badgeActionNote: `Rose Need your action — open the job and act in the Workflow panel. Green In progress — the job is moving; ask ${CROS_ASSISTANT_NAME} to draft your next message.`,
    statusDescription: `The status banner explains the live blocker, what ${CROS_ASSISTANT_NAME} recommends, and the next step in plain language.`,
    entryStepDescriptions: {
      'maint-entry-category':
        'Maintenance jobs run Reported → Assessment → Quotes → Approval → Work → Completed. Landlord jobs can be quoted by Crossub or by a tradie you choose.',
      'insp-entry-category':
        'An inspection runs Created → Scheduled → Assigned → Inspection → Report → Delivered → Completed.',
      'insp-entry-bucket':
        'Reports waiting for a principal to sign off show under Need my action. You can assign your own inspector or book a Crossub inspector for that job.',
      'lease-entry-category':
        'A letting runs Confirmation → Preparation → Active leasing → Offer → Onboarding → Key handover → Completed.',
      'lease-entry-bucket':
        'Confirmation, applications, and lease setup show under Need my action when the next step is yours.',
      'vacate-entry-category':
        'Vacating is four steps: Vacate, Outgoing, Compare, then Complete. Bond is not a step on this page.',
      'vacate-entry-bucket':
        'The live step shows under Need my action. Complete vacating closes the case after the comparison.',
      'trib-entry-bucket':
        'Evidence requests and hearing prep show under Need my action until the file can move on.',
    },
  },
};

function entryTasksSteps(id: AgentWorkflowTourId, variant: AgentCopyVariant): AgentTourStep[] {
  const overrides = WORKFLOW_TOUR_ROLE_COPY[variant].entryStepDescriptions;
  return ENTRY_TASKS_STEPS[id].map((step) =>
    step.id in overrides ? { ...step, description: overrides[step.id]! } : step,
  );
}

function detailRailStageSteps(id: AgentWorkflowTourId, variant: AgentCopyVariant): AgentTourStep[] {
  return workflowTourStages(id, variant).map((stage) => ({
    id: `${id}-stage-${stage.id}`,
    target: workflowStepTourTarget(stage.id),
    title: stage.title,
    description: stage.description,
    actionNote: stage.agentAction,
  }));
}

const SELF_MANAGED_DETAIL_TABS: Record<AgentWorkflowTourId, AgentTourStep[]> = {
  maintenance: [
    {
      id: 'maint-tab-board',
      target: 'workflow-action-panel',
      title: 'Stage board',
      description:
        'The open stage is the work for that step. Quotes is where you choose Crossub or your own tradie.',
    },
  ],
  inspections: [
    {
      id: 'insp-tab-overview',
      target: 'workflow-tab-overview',
      title: 'Overview',
      description: 'Visit plan, the inspector, and the tenant and owner contacts for this job.',
    },
    {
      id: 'insp-tab-report',
      target: 'workflow-tab-report',
      title: 'Report',
      description: 'Sign the report off here, send it back, or send the owner a copy once it is signed.',
    },
    {
      id: 'insp-tab-activity',
      target: 'workflow-tab-activity',
      title: 'Activity',
      description: 'The timeline of scheduling, assignment, and sign-off on this inspection.',
    },
  ],
  new_leasing: [
    {
      id: 'lease-card-open',
      target: 'leasing-stage-open_inspection',
      title: 'Open inspection scheduler',
      description: 'Set the viewing once the letting is confirmed. The report comes back on this card.',
    },
    {
      id: 'lease-card-apps',
      target: 'leasing-stage-applications',
      title: 'Applications',
      description: 'Review applicants and approve one, or record the tenancy you let yourself.',
    },
    {
      id: 'lease-card-setup',
      target: 'leasing-stage-onboarding',
      title: 'Lease setup',
      description: 'Agreement, bond link, and the move-in checklist.',
    },
    {
      id: 'lease-card-keys',
      target: 'leasing-stage-key_handover',
      title: 'Tenant key collection',
      description: 'Arrange the key handover. That closes the letting.',
    },
  ],
  end_leasing: [],
  tribunal: [],
};

function detailTabSteps(id: AgentWorkflowTourId, variant: AgentCopyVariant): AgentTourStep[] {
  if (variant === AGENT_COPY_VARIANT.SELF_MANAGED && id !== 'tribunal') {
    return SELF_MANAGED_DETAIL_TABS[id];
  }
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

function buildDetailSteps(id: AgentWorkflowTourId, variant: AgentCopyVariant): AgentTourStep[] {
  const { pageName, overview } = moduleCopy(id, variant);
  const roleCopy = WORKFLOW_TOUR_ROLE_COPY[variant];
  const selfManaged = variant === AGENT_COPY_VARIANT.SELF_MANAGED && id !== 'tribunal';
  const placeSteps: AgentTourStep[] = selfManaged
    ? [
        {
          id: `${id}-detail-rail`,
          target: 'workflow-rail',
          title: 'Progress',
          description:
            'These are the stages on this job, in order. The current one is where the case sits now.',
          actionNote: 'Select a stage to open it. Later stages stay ahead until this one is done.',
        },
        {
          id: `${id}-detail-status`,
          target: 'workflow-status',
          title: id === 'inspections' ? 'Visit plan' : 'Next action',
          description:
            id === 'inspections'
              ? 'Date, time, and whether the appointment is confirmed. Assign an inspector from here or book one through Crossub.'
              : roleCopy.statusDescription,
          actionNote: 'This is the live decision. The progress above is the rest of the case.',
        },
      ]
    : [
        {
          id: `${id}-detail-status`,
          target: 'workflow-status',
          title: 'Current status',
          description: roleCopy.statusDescription,
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
            'Focus on the Live step. That is where the case sits now — earlier steps are history, later steps unlock after you act.',
        },
        {
          id: `${id}-detail-workflow-tab`,
          target: 'workflow-tab-workflow',
          title: 'Workflow tab',
          description:
            'Always open this tab when the badge says Need your action. It holds approve buttons, forms, and evidence for the current stage.',
          actionNote: 'If you only remember one place to act, it is here — not Messages or Activity.',
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
      ];
  return [
    {
      id: `${id}-detail-intro`,
      title: `${pageName} workflow`,
      description: overview,
      actionNote: selfManaged
        ? 'You created the case. The next steps follow the stages on this page.'
        : 'You created the case — now walk each stage on the rail. Rose Need your action badges show where you must decide.',
    },
    AGENT_TOUR_ROLE_STEP[variant],
    {
      id: `${id}-detail-badge`,
      target: 'workflow-case-badge',
      title: roleCopy.badgeTitle,
      description: roleCopy.badgeDescription,
      actionNote: roleCopy.badgeActionNote,
    },
    ...placeSteps,
    ...detailRailStageSteps(id, variant),
    ...(selfManaged
      ? []
      : [
          {
            id: `${id}-detail-tabs`,
            target: 'workflow-tabs',
            title: 'Job tabs',
            description:
              'Use tabs to move between workflow actions, reference details, documents, and history without leaving the job.',
          } satisfies AgentTourStep,
        ]),
    ...detailTabSteps(id, variant),
    {
      id: `${id}-detail-finish`,
      title: 'You are set',
      description:
        AGENT_WORKFLOW_TRAINING_BY_VARIANT[variant][id].tips[0] ??
        'Replay this tour anytime from Support → Workflow demo tours.',
    },
  ];
}

function buildEntrySteps(id: AgentWorkflowTourId, variant: AgentCopyVariant): AgentTourStep[] {
  const { pageName, overview, eyebrow } = moduleCopy(id, variant);
  const intro: AgentTourStep = {
    id: `${id}-entry-intro`,
    title: `${pageName} demo tour`,
    description: `${eyebrow}. ${overview} This tour covers creating a case, then every workflow stage on the job page.`,
  };

  return [
    intro,
    AGENT_TOUR_ROLE_STEP[variant],
    ...entryTasksSteps(id, variant),
    ...buildCreateSteps(id),
  ];
}

/** `variant` — Self-Manage tours speak to the agent; Inspection Only and Full Service keep today's copy. */
export function workflowTourSteps(
  id: AgentWorkflowTourId,
  phase: AgentWorkflowTourPhase,
  variant: AgentCopyVariant = AGENT_COPY_VARIANT.SERVICED,
): AgentTourStep[] {
  return phase === 'entry' ? buildEntrySteps(id, variant) : buildDetailSteps(id, variant);
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

const SELF_MANAGED_TOUR_DESCRIPTIONS: Record<AgentWorkflowTourId, string> = {
  maintenance: 'Lodge a job → Reported, Assessment, Quotes, Approval, Work, Completed',
  inspections: 'Book an inspection → Created through Completed. Your inspector, or Crossub',
  new_leasing: 'Start a let → Confirmation through key handover',
  end_leasing: 'Open a vacate → Vacate, Outgoing, Compare, Complete',
  tribunal: 'Evidence → submission → hearing → orders',
};

export function workflowTourCard(
  id: AgentWorkflowTourId,
  variant: AgentCopyVariant,
): { title: string; description: string } {
  const base = AGENT_WORKFLOW_TOUR_LABELS[id];
  if (variant !== AGENT_COPY_VARIANT.SELF_MANAGED) return base;
  return { title: base.title, description: SELF_MANAGED_TOUR_DESCRIPTIONS[id] };
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
