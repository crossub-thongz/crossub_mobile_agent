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
  if (id === 'end_leasing') return `${ROUTES.VACATING}?workflowTour=${id}`;
  const filter =
    id === 'maintenance'
      ? 'Maintenance'
      : id === 'inspections'
        ? 'Inspection'
        : id === 'new_leasing'
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

const ENTRY_TASKS_STEPS: Record<
  Exclude<AgentWorkflowTourId, 'end_leasing'>,
  AgentTourStep[]
> = {
  maintenance: [
    {
      id: 'maint-entry-category',
      target: 'tasks-category-maintenance',
      title: 'Filter to Maintenance',
      description:
        'The Maintenance tab shows every repair job across your portfolio. Use it to triage quotes, scheduling, and completions.',
    },
    {
      id: 'maint-entry-bucket',
      target: 'tasks-bucket-need_action',
      title: 'Need my action',
      description:
        'Jobs waiting on you — quote approvals, responsibility decisions, completion sign-off — appear under Need my action.',
      actionNote:
        'Start here each session. Rose-highlighted rows in the table are the same cases — open them and use the Workflow panel to approve or decide.',
    },
    {
      id: 'maint-entry-new',
      target: 'tasks-new',
      title: 'Create a maintenance job',
      description:
        'Use New task → Maintenance to log landlord or agent-initiated repairs. Tenant reports also land here automatically.',
    },
    {
      id: 'maint-entry-open',
      target: 'tasks-table',
      title: 'Open a job to continue',
      description:
        'Select any maintenance row to open the full workflow. The guided tour continues on the job page with the lifecycle rail and tabs.',
    },
  ],
  inspections: [
    {
      id: 'insp-entry-category',
      target: 'tasks-category-inspection',
      title: 'Filter to Inspection',
      description:
        'Open, ingoing, outgoing, and routine inspections all appear here. Pick the Inspection tab to focus the queue.',
    },
    {
      id: 'insp-entry-bucket',
      target: 'tasks-bucket-need_action',
      title: 'Report reviews',
      description:
        'Inspections awaiting your approval or follow-up show under Need my action — the same prioritisation as maintenance and leasing.',
      actionNote:
        'Open each inspection here and approve or request report changes in the Workflow tab before CROSSUB can publish.',
    },
    {
      id: 'insp-entry-new',
      target: 'tasks-new',
      title: 'Book an inspection',
      description:
        'New task → Inspection lets you choose the type (Open, Ingoing, Outgoing, Routine) and property before scheduling.',
    },
    {
      id: 'insp-entry-open',
      target: 'tasks-table',
      title: 'Open an inspection',
      description:
        'Open any inspection row to walk through scheduling, field work, report review, and documents on the job page.',
    },
  ],
  new_leasing: [
    {
      id: 'lease-entry-category',
      target: 'tasks-category-leasing',
      title: 'Filter to Leasing',
      description:
        'Active re-let cycles — advertising, applications, onboarding — are grouped under the Leasing tab on Tasks.',
    },
    {
      id: 'lease-entry-bucket',
      target: 'tasks-bucket-need_action',
      title: 'Decisions that unblock onboarding',
      description:
        'Applicant approvals, bond issues, and agreement blockers surface here when you must decide before CROSSUB can proceed.',
      actionNote:
        'Leasing blockers — applicant approval, bond, agreement signing — appear here. Clear them on the job Workflow tab.',
    },
    {
      id: 'lease-entry-new',
      target: 'tasks-new',
      title: 'Start a new let',
      description:
        'New task → Leasing / Re-letting starts a cycle on a vacant property. You can also launch from the property hub.',
    },
    {
      id: 'lease-entry-open',
      target: 'tasks-table',
      title: 'Open a leasing job',
      description:
        'Open a leasing row to continue the demo on the job page — workflow rail, applicants, and onboarding steps.',
    },
  ],
  tribunal: [
    {
      id: 'trib-entry-category',
      target: 'tasks-category-tribunal',
      title: 'Filter to Tribunal',
      description:
        'NCAT and rent-chasing matters appear under Tribunal. Use this tab to see active and completed applications.',
    },
    {
      id: 'trib-entry-bucket',
      target: 'tasks-bucket-need_action',
      title: 'Matters needing your input',
      description:
        'Evidence requests, hearing prep, and landlord decisions show under Need my action until CROSSUB can advance the file.',
      actionNote:
        'Upload evidence, confirm hearing details, or approve tribunal steps from the job Workflow and Documents tabs.',
    },
    {
      id: 'trib-entry-new',
      target: 'tasks-new',
      title: 'Start tribunal work',
      description:
        'New task → Tribunal (or Financial flows where applicable) opens a matter tied to the property and tenancy record.',
    },
    {
      id: 'trib-entry-open',
      target: 'tasks-table',
      title: 'Open a tribunal job',
      description:
        'Open any tribunal row to tour the workflow rail, evidence, orders, and hearing stages on the detail page.',
    },
  ],
};

const END_LEASING_ENTRY_STEPS: AgentTourStep[] = [
  {
    id: 'vacate-entry-list',
    target: 'vacating-case-list',
    title: 'End leasing portfolio',
    description:
      'The End leasing page lists active vacate files — notice, outgoing inspection, bond settlement — across your portfolio.',
  },
  {
    id: 'vacate-entry-create',
    title: 'Start end of lease',
    description:
      'From Tasks, use New task → Vacating / End leasing on a tenanted property to open a new vacate file.',
  },
  {
    id: 'vacate-entry-open',
    target: 'vacating-case-list',
    title: 'Open a vacate file',
    description:
      'Select any case to open the full end-leasing workflow. The guided tour continues on the job page.',
    actionNote:
      'Rows marked Action required need your approval — open them and work through the Workflow panel.',
  },
];

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
        'Cases that need you appear under Tasks → Need my action and show a rose Need your action badge on the job page.',
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
    description: `${eyebrow}. ${overview}`,
  };
  const openInstruction: AgentTourStep = {
    id: `${id}-entry-handoff`,
    title: 'Continue on the job page',
    description:
      'When you open a case from the list, the tour picks up automatically on the job detail page with the full workflow walkthrough.',
  };

  if (id === 'end_leasing') {
    return [intro, AGENT_TOUR_ACCOUNT_MANAGER_STEP, ...END_LEASING_ENTRY_STEPS, openInstruction];
  }

  return [
    intro,
    AGENT_TOUR_ACCOUNT_MANAGER_STEP,
    ...ENTRY_TASKS_STEPS[id],
    openInstruction,
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
    const onEntryPage =
      (param === 'end_leasing' && pathname === ROUTES.VACATING) ||
      (param !== 'end_leasing' && pathname === ROUTES.TASKS);
    if (onEntryPage) return { id: param, phase: 'entry' };
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
    description: 'Intake → responsibility → quote → schedule → completion',
  },
  inspections: {
    title: 'Inspections',
    description: 'Open, ingoing, routine, and outgoing condition reports',
  },
  new_leasing: {
    title: 'New leasing',
    description: 'Advertising → applicants → onboarding → move-in',
  },
  end_leasing: {
    title: 'End leasing',
    description: 'Notice → outgoing inspection → bond settlement → close',
  },
  tribunal: {
    title: 'Tribunal',
    description: 'Evidence → submission → hearing → orders',
  },
};
