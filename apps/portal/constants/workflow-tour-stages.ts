import type { AgentWorkflowTourId } from '@/constants/agent-workflow-tour';
import {
  END_LEASING_AGENT_STEP,
  END_LEASING_AGENT_STEP_ORDER,
} from '@/lib/end-leasing/agent-workflow-model';
import {
  MAINTENANCE_AGENT_STEP,
  MAINTENANCE_AGENT_STEP_ORDER,
  MAINTENANCE_AGENT_STEP_TITLE,
} from '@/lib/maintenance/agent-workflow-model';
import { UNIFIED_LEASING_RAIL_STEP_LABEL, UNIFIED_LEASING_RAIL_STEP_ORDER } from '@/lib/leasing/letting-rail-progress';

export type WorkflowTourStage = {
  id: string;
  title: string;
  description: string;
  /** What the agent must do when the case is at this stage (or that CROSSUB handles it). */
  agentAction: string;
};

const CROS_WAIT =
  'No action needed while CROS is handling — the job will move to Need my action on Tasks when your decision is required.';

const MAINTENANCE_STAGE_COPY: Record<string, Pick<WorkflowTourStage, 'description' | 'agentAction'>> = {
  [MAINTENANCE_AGENT_STEP.JOB_CREATED]: {
    description:
      'Tenant or agent reports the issue. CROSSUB logs intake photos, issue type, and property context.',
    agentAction:
      'Check intake is complete. If photos or issue type are missing, add detail in Review before assigning responsibility.',
  },
  [MAINTENANCE_AGENT_STEP.REVIEW]: {
    description:
      'Confirm the description and evidence. Responsibility (tenant, landlord, or strata) must be set before quoting.',
    agentAction:
      'Assign responsibility in the Workflow panel. Wrong responsibility blocks quoting — fix it here before moving on.',
  },
  [MAINTENANCE_AGENT_STEP.GET_QUOTE]: {
    description:
      'CROSSUB invites contractors and collects quotations. Quotes appear on the Quotes tab and in the workflow panel.',
    agentAction:
      'When status is Quote approval or Need my action, compare scope and price, then Approve, Decline, or Counter offer in the Workflow panel.',
  },
  [MAINTENANCE_AGENT_STEP.SCHEDULE]: {
    description:
      'After quote approval, CROSSUB coordinates visit times with the contractor and tenant for access.',
    agentAction:
      'Confirm access windows or escalate if scheduling stalls. Approve proposed visit times when prompted.',
  },
  [MAINTENANCE_AGENT_STEP.IN_PROGRESS]: {
    description:
      'Contractor completes the repair. Visit status and completion evidence are tracked on the job.',
    agentAction:
      'Review completion photos when submitted. Request more evidence or approve completion so invoicing can proceed.',
  },
  [MAINTENANCE_AGENT_STEP.JOB_COMPLETED]: {
    description:
      'Final evidence and contractor invoice are attached for your records and landlord reporting.',
    agentAction:
      'Approve completion and invoice in the Workflow panel to close the job on the property record.',
  },
};

const END_LEASING_STAGE_COPY: Record<string, Pick<WorkflowTourStage, 'description' | 'agentAction'>> = {
  [END_LEASING_AGENT_STEP.VACATE_CONFIRMED]: {
    description:
      'Tenant notice, vacate date, and forwarding contact are recorded against the tenancy.',
    agentAction:
      'Confirm notice details and vacate date match the lease. Update if the tenant changes their plans.',
  },
  [END_LEASING_AGENT_STEP.OUTGOING_INSPECTION]: {
    description:
      'Final condition inspection is booked after vacate or key return.',
    agentAction:
      'Book or confirm the outgoing inspection date. Chase keys if access is not yet arranged.',
  },
  [END_LEASING_AGENT_STEP.REPORT_COMPARISON]: {
    description:
      'Outgoing report is compared to the ingoing baseline for bond and make-good decisions.',
    agentAction:
      'Review photo comparison and flag damage or cleaning issues. Confirm ingoing/outgoing match for bond claims.',
  },
  [END_LEASING_AGENT_STEP.GET_QUOTE]: {
    description:
      'Make-good repairs may need landlord-approved quotes before bond settlement.',
    agentAction:
      'Approve or decline repair quotes when they appear under Need my action. Confirm landlord responsibility.',
  },
  [END_LEASING_AGENT_STEP.RESULT_CONFIRMED]: {
    description:
      'Tenant vs landlord responsibility and bond split are confirmed before release.',
    agentAction:
      'Confirm figures and tenant responsibility in the Workflow panel. Acknowledge landlord decisions on deductions.',
  },
  [END_LEASING_AGENT_STEP.BOND_RELEASED]: {
    description:
      'Bond release, claims, and disbursement are processed to close the vacate file.',
    agentAction:
      'Approve bond settlement when prompted. Mark vacate complete after keys and bond are finalised.',
  },
};

const LEASING_STAGE_COPY: Record<string, Pick<WorkflowTourStage, 'description' | 'agentAction'>> = {
  order_created: {
    description: 'Re-let cycle starts on a vacant property — listing and open inspection order.',
    agentAction: 'Confirm property is ready to advertise. Start or review the open inspection order.',
  },
  scheduling: {
    description: 'Open inspection times are coordinated with the field team or self-conducted viewings.',
    agentAction: 'Approve proposed viewing times or update scheduling notes when CROSSUB requests input.',
  },
  scheduled: {
    description: 'Open inspection is booked. Applicants register interest after viewings.',
    agentAction: 'Monitor attendance and move interested applicants toward tenant selection.',
  },
  report_available: {
    description: 'Open inspection report is ready for marketing and applicant review.',
    agentAction: 'Review the report before shortlisting. Approve or request follow-up if condition flags exist.',
  },
  results: {
    description: 'Reference checks run and applicants are compared before selection.',
    agentAction: 'Review reference results and compare applicants on the Applicants tab.',
  },
  application_approval: {
    description: 'Shortlisted applications are reviewed for tenant selection.',
    agentAction:
      'Approve one applicant in tenant selection — this starts onboarding. Decline unsuitable applications.',
  },
  reference_check: {
    description: 'CROSSUB completes reference and background checks on the preferred applicant.',
    agentAction: 'Review reference outcomes when status moves to Need my action before onboarding continues.',
  },
  onboarding: {
    description: 'Bond, agreement, ingoing inspection, keys, and tenant portal access until move-in.',
    agentAction:
      'Clear each onboarding blocker: bond payment, lease signing, ingoing inspection, key collection. Check Need my action daily.',
  },
};

const INSPECTION_STAGE_COPY: Record<string, Pick<WorkflowTourStage, 'description' | 'agentAction'>> = {
  scheduled: {
    description: 'Date, time, and inspector are set for open, ingoing, outgoing, or routine inspections.',
    agentAction: 'Confirm schedule and inspector assignment. Reschedule if access or timing changes.',
  },
  in_progress: {
    description: 'Inspector conducts the visit and captures photos in the field app.',
    agentAction: CROS_WAIT,
  },
  staff_en_route: {
    description: 'Staff are travelling to the property for a live open viewing session.',
    agentAction: 'Ensure property access is ready. Register attendees when the session opens.',
  },
  open: {
    description: 'Open inspection is live — attendees can be registered and interest captured.',
    agentAction: 'Register applicants and note interest for the leasing workflow.',
  },
  review: {
    description: 'Submitted report photos and area ratings await agent approval.',
    agentAction:
      'Approve the report or request changes in the Workflow panel. Leasing and bond steps unlock after approval.',
  },
  completed: {
    description: 'Report is finalised and ready for download or downstream workflows.',
    agentAction: 'Download or share with the landlord if required. Confirm before bond or onboarding uses it.',
  },
  published: {
    description: 'Approved report is stored on the property inspection history.',
    agentAction: CROS_WAIT,
  },
};

const TRIBUNAL_STAGE_COPY: Record<string, Pick<WorkflowTourStage, 'description' | 'agentAction'>> = {
  draft: {
    description: 'Evidence and tenancy details are gathered before lodging.',
    agentAction: 'Upload missing documents and confirm tenancy facts on the Documents tab.',
  },
  submitted: {
    description: 'Application is filed with the tribunal. CROSSUB tracks correspondence.',
    agentAction: CROS_WAIT,
  },
  awaiting_hearing: {
    description: 'Waiting for a hearing date or tribunal directions.',
    agentAction: 'Respond to any tribunal requests for further evidence when they appear under Need my action.',
  },
  hearing_scheduled: {
    description: 'Hearing date is set — evidence bundle and attendance are prepared.',
    agentAction:
      'Confirm hearing details, brief the landlord, and upload any last-minute evidence before the hearing.',
  },
  completed: {
    description: 'Outcome received — orders and compliance steps are recorded.',
    agentAction: 'Review tribunal orders on the Orders tab and confirm next steps with the landlord.',
  },
  closed: {
    description: 'Matter is closed on the property with a full audit trail.',
    agentAction: CROS_WAIT,
  },
};

export const WORKFLOW_TOUR_STAGES: Record<AgentWorkflowTourId, WorkflowTourStage[]> = {
  maintenance: MAINTENANCE_AGENT_STEP_ORDER.map((stepId) => ({
    id: stepId,
    title: MAINTENANCE_AGENT_STEP_TITLE[stepId],
    ...MAINTENANCE_STAGE_COPY[stepId],
  })),
  end_leasing: END_LEASING_AGENT_STEP_ORDER.map((stepId) => ({
    id: stepId,
    title:
      stepId === END_LEASING_AGENT_STEP.VACATE_CONFIRMED
        ? 'Vacate confirmed'
        : stepId === END_LEASING_AGENT_STEP.OUTGOING_INSPECTION
          ? 'Outgoing inspection'
          : stepId === END_LEASING_AGENT_STEP.REPORT_COMPARISON
            ? 'Report comparison'
            : stepId === END_LEASING_AGENT_STEP.GET_QUOTE
              ? 'Get quote'
              : stepId === END_LEASING_AGENT_STEP.RESULT_CONFIRMED
                ? 'Result confirmed'
                : 'Bond released',
    ...END_LEASING_STAGE_COPY[stepId],
  })),
  new_leasing: UNIFIED_LEASING_RAIL_STEP_ORDER.map((stepId) => ({
    id: stepId,
    title: UNIFIED_LEASING_RAIL_STEP_LABEL[stepId],
    ...LEASING_STAGE_COPY[stepId],
  })),
  inspections: [
    { id: 'scheduled', title: 'Scheduled', ...INSPECTION_STAGE_COPY.scheduled },
    { id: 'in_progress', title: 'In progress', ...INSPECTION_STAGE_COPY.in_progress },
    { id: 'staff_en_route', title: 'Staff en route', ...INSPECTION_STAGE_COPY.staff_en_route },
    { id: 'open', title: 'Open now', ...INSPECTION_STAGE_COPY.open },
    { id: 'review', title: 'Report review', ...INSPECTION_STAGE_COPY.review },
    { id: 'completed', title: 'Completed', ...INSPECTION_STAGE_COPY.completed },
    { id: 'published', title: 'Published', ...INSPECTION_STAGE_COPY.published },
  ],
  tribunal: [
    { id: 'draft', title: 'Draft', ...TRIBUNAL_STAGE_COPY.draft },
    { id: 'submitted', title: 'Submitted', ...TRIBUNAL_STAGE_COPY.submitted },
    { id: 'awaiting_hearing', title: 'Awaiting hearing', ...TRIBUNAL_STAGE_COPY.awaiting_hearing },
    { id: 'hearing_scheduled', title: 'Hearing scheduled', ...TRIBUNAL_STAGE_COPY.hearing_scheduled },
    { id: 'completed', title: 'Completed', ...TRIBUNAL_STAGE_COPY.completed },
    { id: 'closed', title: 'Closed', ...TRIBUNAL_STAGE_COPY.closed },
  ],
};

export function workflowStepTourTarget(stageId: string): string {
  return `workflow-step-${stageId}`;
}
