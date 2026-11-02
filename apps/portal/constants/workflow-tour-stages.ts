import { AGENT_COPY_VARIANT, type AgentCopyVariant } from '@/constants/agent-copy-variant';
import type { AgentWorkflowTourId } from '@/constants/agent-workflow-tour';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import {
  END_LEASING_AGENT_STEP,
  END_LEASING_AGENT_STEP_ORDER,
  END_LEASING_SELF_MANAGED_STEP_ORDER,
  type EndLeasingAgentStep,
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
  'No action needed while CROSSUB is handling — the job will move to Need my action on Tasks when your decision is required.';

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
  [END_LEASING_AGENT_STEP.COMPLETE]: {
    description:
      'Compare is done. Completing closes the vacate on the property. Bond is not a step on this page.',
    agentAction: 'Select Complete vacating when the comparison is confirmed.',
  },
};

const END_LEASING_STAGE_TITLE: Record<EndLeasingAgentStep, string> = {
  [END_LEASING_AGENT_STEP.VACATE_CONFIRMED]: 'Vacate confirmed',
  [END_LEASING_AGENT_STEP.OUTGOING_INSPECTION]: 'Outgoing inspection',
  [END_LEASING_AGENT_STEP.REPORT_COMPARISON]: 'Report comparison',
  [END_LEASING_AGENT_STEP.GET_QUOTE]: 'Get quote',
  [END_LEASING_AGENT_STEP.RESULT_CONFIRMED]: 'Result confirmed',
  [END_LEASING_AGENT_STEP.BOND_RELEASED]: 'Bond released',
  [END_LEASING_AGENT_STEP.COMPLETE]: 'Complete vacating',
};

function endLeasingTourStages(order: EndLeasingAgentStep[]): WorkflowTourStage[] {
  return order.map((stepId) => ({
    id: stepId,
    title: END_LEASING_STAGE_TITLE[stepId],
    ...END_LEASING_STAGE_COPY[stepId],
  }));
}

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
  end_leasing: endLeasingTourStages(END_LEASING_AGENT_STEP_ORDER),
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

/** Self-Manage: nothing is "CROSSUB handling" — the agent waits on their own next step. */
const SELF_MANAGED_WAIT = `Nothing to decide right now — the job moves to Need my action on Tasks when your next step is due. Ask ${CROS_ASSISTANT_NAME} to draft any follow-up.`;

type WorkflowTourStageOverride = Partial<Pick<WorkflowTourStage, 'description' | 'agentAction'>>;

/** Self-Manage replacements for stage copy that says CROSSUB does the work, by tour and stage id. */
const SELF_MANAGED_STAGE_OVERRIDES: Partial<
  Record<AgentWorkflowTourId, Record<string, WorkflowTourStageOverride>>
> = {
  tribunal: {
    submitted: { description: 'Application is filed with the tribunal. Track correspondence on the job.' },
  },
};

const SELF_MANAGED_MAINTENANCE_STAGES: WorkflowTourStage[] = [
  {
    id: 'created',
    title: 'Reported',
    description: 'The repair is logged with the issue, property, and any photos from intake.',
    agentAction: 'Open Reported and confirm the issue type and photos before assessment.',
  },
  {
    id: 'review',
    title: 'Assessment',
    description: 'You decide who is responsible: tenant, landlord, or strata. That choice sets whether a quote is needed.',
    agentAction: 'Set responsibility on Assessment. Tenant or strata jobs skip quoting and go on to the work.',
  },
  {
    id: 'quote',
    title: 'Quotes',
    description:
      'On a landlord job you can ask Crossub to get the quote, or invite your own tradie. Either choice is yours.',
    agentAction: 'Use Get a Quote with Crossub, or arrange the quote yourself and enter it here.',
  },
  {
    id: 'approval',
    title: 'Approval',
    description: 'Quotes sit side by side so you can accept one before anyone is booked.',
    agentAction: 'Approve a quote, or decline it and ask for another.',
  },
  {
    id: 'progress',
    title: 'Work',
    description: 'The visit is underway. Completion photos come back on this step.',
    agentAction: 'Book access with the tradie, then review the completion photos when the work is done.',
  },
  {
    id: 'done',
    title: 'Completed',
    description: 'The job is closed on the property, with the quote and photos kept on the case.',
    agentAction: 'Close the job once the work and any invoice are in order.',
  },
];

const SELF_MANAGED_INSPECTION_STAGES: WorkflowTourStage[] = [
  {
    id: 'CREATED',
    title: 'Created',
    description: 'The inspection exists, but it does not have a confirmed appointment yet.',
    agentAction: 'Set a date, or leave it and come back when access is known.',
  },
  {
    id: 'SCHEDULED',
    title: 'Scheduled',
    description: 'A date is on the job. It stays a proposed date until the appointment is confirmed.',
    agentAction: 'Confirm the date and time on Visit plan.',
  },
  {
    id: 'ASSIGNED',
    title: 'Assigned',
    description: 'Someone is named to attend: one of your inspectors, or a Crossub inspector you book for this job.',
    agentAction: 'Assign your own inspector, or arrange the visit through Crossub.',
  },
  {
    id: 'IN_PROGRESS',
    title: 'Inspection',
    description: 'The visit is happening. Photos and notes are captured against the property.',
    agentAction: 'Nothing to approve until the report is submitted.',
  },
  {
    id: 'REPORT_READY',
    title: 'Report',
    description: 'The report is in. A principal signs it off, and can send it back if it needs another pass.',
    agentAction: 'Open the Report tab, sign the report off, or send it back with a reason.',
  },
  {
    id: 'DELIVERED',
    title: 'Delivered',
    description: 'The signed report can go to the owner. Ingoing and outgoing copies also go to the tenant.',
    agentAction: 'Send the owner copy from the report step when you are ready.',
  },
  {
    id: 'CLOSED',
    title: 'Completed',
    description: 'The inspection is finished and stays on the property history.',
    agentAction: 'No further action. The report remains on the property.',
  },
];

const SELF_MANAGED_LEASING_STAGES: WorkflowTourStage[] = [
  {
    id: 'awaiting_confirmation',
    title: 'Confirmation',
    description: 'Nothing is advertised until you confirm this letting should go ahead.',
    agentAction: 'Choose Proceed, and who runs the open inspections, or Do not re-let.',
  },
  {
    id: 'preparation',
    title: 'Preparation',
    description: 'The letting is confirmed. Open inspections have not started.',
    agentAction: 'Check the property details, then move on to scheduling the open.',
  },
  {
    id: 'active_leasing',
    title: 'Active leasing',
    description: 'The open inspection is the live step. You schedule it and collect the report.',
    agentAction: 'Use Open inspection scheduler to set the viewing, then wait for the report.',
  },
  {
    id: 'offer_pending',
    title: 'Offer',
    description: 'Applications are in. You review them and record the tenancy you accept.',
    agentAction: 'Open Applications, approve one applicant, or record the tenancy yourself.',
  },
  {
    id: 'onboarding',
    title: 'Onboarding',
    description: 'Lease setup: agreement, bond link, and the move-in checklist.',
    agentAction: 'Work through Lease setup until the agreement and bond are done.',
  },
  {
    id: 'key_handover',
    title: 'Key handover',
    description: 'The tenant collects the keys. That is the last step before the letting closes.',
    agentAction: 'Arrange key collection on Tenant key collection.',
  },
  {
    id: 'completed',
    title: 'Completed',
    description: 'The letting is closed and the tenancy is on the property.',
    agentAction: 'No further action on this case.',
  },
];

/** Self-Manage tours follow the stages on the current job pages, not the older serviced rails. */
const SELF_MANAGED_STAGE_LISTS: Partial<Record<AgentWorkflowTourId, WorkflowTourStage[]>> = {
  maintenance: SELF_MANAGED_MAINTENANCE_STAGES,
  inspections: SELF_MANAGED_INSPECTION_STAGES,
  new_leasing: SELF_MANAGED_LEASING_STAGES,
  end_leasing: endLeasingTourStages(END_LEASING_SELF_MANAGED_STEP_ORDER),
};

/** Stage steps for the copy set. Inspection Only and Full Service keep today's copy. */
export function workflowTourStages(
  id: AgentWorkflowTourId,
  variant: AgentCopyVariant,
): WorkflowTourStage[] {
  if (variant === AGENT_COPY_VARIANT.SERVICED) return WORKFLOW_TOUR_STAGES[id];
  const overrides = SELF_MANAGED_STAGE_OVERRIDES[id] ?? {};
  const stages = SELF_MANAGED_STAGE_LISTS[id] ?? WORKFLOW_TOUR_STAGES[id];
  return stages.map((stage) => ({
    ...stage,
    ...(stage.agentAction === CROS_WAIT ? { agentAction: SELF_MANAGED_WAIT } : {}),
    ...overrides[stage.id],
  }));
}

export function workflowStepTourTarget(stageId: string): string {
  return `workflow-step-${stageId}`;
}
