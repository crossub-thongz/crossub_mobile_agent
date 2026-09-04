import { ROUTES } from '@/constants/routes';

export type AgentWorkflowTrainingId =
  | 'maintenance'
  | 'inspections'
  | 'new_leasing'
  | 'end_leasing'
  | 'tribunal';

export type AgentWorkflowTrainingItem = {
  title: string;
  description: string;
};

export type AgentWorkflowTrainingModule = {
  id: AgentWorkflowTrainingId;
  pageName: string;
  href: string;
  eyebrow: string;
  overview: string;
  steps: AgentWorkflowTrainingItem[];
  functions: AgentWorkflowTrainingItem[];
  tips: string[];
};

export const AGENT_WORKFLOW_TRAINING_ORDER: AgentWorkflowTrainingId[] = [
  'maintenance',
  'inspections',
  'new_leasing',
  'end_leasing',
  'tribunal',
];

export function isAgentWorkflowTrainingId(value: string | null): value is AgentWorkflowTrainingId {
  return (
    value === 'maintenance' ||
    value === 'inspections' ||
    value === 'new_leasing' ||
    value === 'end_leasing' ||
    value === 'tribunal'
  );
}

export const AGENT_WORKFLOW_TRAINING: Record<AgentWorkflowTrainingId, AgentWorkflowTrainingModule> =
  {
    maintenance: {
      id: 'maintenance',
      pageName: 'Maintenance',
      href: ROUTES.MAINTENANCE,
      eyebrow: 'Repairs & contractors',
      overview:
        'Maintenance covers the full repair lifecycle: tenant or agent intake, responsibility (tenant, landlord, or strata), quoting, your approval, scheduling, completion evidence, and invoicing. Most work is created from Tasks or a property hub; CROSSUB coordinates contractors once you assign responsibility.',
      steps: [
        {
          title: 'Create or open a job',
          description:
            'Use Tasks → New task → Maintenance, or open an existing maintenance row from Tasks or the property Maintenance tab. Tenant reports also appear here after they submit through the tenant app.',
        },
        {
          title: 'Review intake',
          description:
            'Read the issue description and intake photos or videos. Confirm the issue type, property, and tenant contact. This is the record CROSSUB and contractors rely on.',
        },
        {
          title: 'Assign responsibility',
          description:
            'Choose tenant, landlord, or strata. Tenant-responsibility jobs may require the tenant to agree before work proceeds. Landlord jobs typically need your quote approval before scheduling.',
        },
        {
          title: 'Approve or decline quotes',
          description:
            'When status is Quote approval or Need my action, open the job, compare contractor pricing and scope, then approve, decline, or send a counter offer. CROSSUB notifies the contractor automatically.',
        },
        {
          title: 'Track visit and completion',
          description:
            'After approval, CROSSUB schedules the visit. When work finishes, review completion photos and evidence. Approve completion and invoice when the job meets your standard.',
        },
      ],
      functions: [
        {
          title: 'Job intake summary',
          description:
            'Shows who created the job, when, issue type, order number, description, and intake media. Use it to confirm context before assigning responsibility.',
        },
        {
          title: 'Responsibility gate',
          description:
            'Sets who pays for the repair. Wrong responsibility blocks quoting — fix it early. Strata matters for common-property issues in apartment buildings.',
        },
        {
          title: 'Get quote / RFQ',
          description:
            'CROSSUB invites contractors and collects quotations. You see invited contractors, responses, and reminder status on the job workflow.',
        },
        {
          title: 'Quote approval',
          description:
            'Compare line items, GST, and scope. Approve to proceed, decline with a reason, or requote with a counter price and message.',
        },
        {
          title: 'Schedule visit',
          description:
            'Contractor proposes times; tenant or agent may confirm depending on access. Escalations appear if scheduling stalls.',
        },
        {
          title: 'Completion evidence',
          description:
            'Photos and videos proving work is done. Required before closing many landlord-responsibility jobs.',
        },
        {
          title: 'Invoice & close',
          description:
            'Contractor invoice is attached for your records. Mark the job complete when evidence and billing are satisfactory.',
        },
        {
          title: 'Documents tab',
          description:
            'All evidence, quotes, and invoices for the job in one place — useful for landlord reporting and disputes.',
        },
        {
          title: 'Messages & audit',
          description:
            'Activity log and notifications show emails sent, status changes, and who acted. Use Messages for ad-hoc contact tied to the property.',
        },
      ],
      tips: [
        'Clear Need my action on maintenance quotes quickly — contractors cannot schedule until you approve.',
        'Upload extra photos during review if the intake set is thin — it speeds accurate quoting.',
        'Urgent priority jobs should be triaged the same day.',
        'Your Account Manager can help with stuck contractors or responsibility disputes.',
      ],
    },
    inspections: {
      id: 'inspections',
      pageName: 'Inspections',
      href: ROUTES.INSPECTIONS,
      eyebrow: 'Open, ingoing, outgoing & routine',
      overview:
        'Inspections document property condition at key moments: marketing opens, move-in, periodic checks while tenanted, and move-out. Each type has its own workflow, but all share scheduling, inspector assignment, report review, and property-linked history.',
      steps: [
        {
          title: 'Know the four types',
          description:
            'Open — vacant marketing viewings. Ingoing — condition before move-in. Routine — periodic occupied checks. Outgoing — final condition at vacate. Pick the right type when creating work.',
        },
        {
          title: 'Create from Tasks or property',
          description:
            'Tasks → New task → Inspection, then choose Open, Ingoing, Outgoing, or Routine and the property. Property-scoped Tasks pre-fills the address.',
        },
        {
          title: 'Schedule and assign',
          description:
            'Set date, time, and who conducts the inspection (you or a field inspector). Routine inspections may follow a frequency set at property registration.',
        },
        {
          title: 'Review the report',
          description:
            'When submitted, open the inspection for photos, area ratings, and flags. Approve or request follow-up before the next leasing or vacate step unlocks.',
        },
        {
          title: 'Use reports downstream',
          description:
            'Ingoing reports support bond records and onboarding. Outgoing reports support bond claims. Open inspections feed applicant interest into leasing.',
        },
      ],
      functions: [
        {
          title: 'Open inspections',
          description:
            'Schedule viewings for vacant or advertising properties. Register attendees and move interested applicants toward tenant selection.',
        },
        {
          title: 'Ingoing inspections',
          description:
            'Book before keys are released. Approved ingoing reports are part of the leasing onboarding checklist and bond baseline.',
        },
        {
          title: 'Routine inspections',
          description:
            'Periodic compliance and condition checks on occupied properties. Filter the inspections list to Routine to see due and overdue items.',
        },
        {
          title: 'Outgoing inspections',
          description:
            'Final condition at end of tenancy. Compare against ingoing evidence for bond decisions. Usually linked to End leasing / vacating.',
        },
        {
          title: 'Type filters',
          description:
            'On the Inspections page, use Open, Ingoing, Outgoing, and Routine chips to focus the queue.',
        },
        {
          title: 'Inspector assignment',
          description:
            'Field inspectors complete reports in their app; you review and approve in the agent portal.',
        },
        {
          title: 'Report PDF & photos',
          description:
            'Download or share approved reports with landlords. Photos are stored on the property inspection history.',
        },
        {
          title: 'Need my action',
          description:
            'Inspections awaiting your review appear on Tasks under Need my action — same as maintenance and leasing.',
        },
      ],
      tips: [
        'Book ingoing before handing over keys; book outgoing after keys are returned.',
        'Routine due dates surface on Tasks — do not wait until they are overdue.',
        'Inspection-only agencies see Inspections and Tribunal; full management sees the full module set.',
        'Declined or rescheduled inspections stay on the property history for audit.',
      ],
    },
    new_leasing: {
      id: 'new_leasing',
      pageName: 'New leasing',
      href: `${ROUTES.TASKS}?filter=Leasing`,
      eyebrow: 'Let to a new tenant',
      overview:
        'New leasing (re-let) takes a vacant or ending tenancy through advertising, applications, tenant selection, bond, agreement, and move-in. In the portal, leasing work lives on Tasks and inside each property’s leasing workflow — the old Leasing menu redirects to Tasks filtered by Leasing.',
      steps: [
        {
          title: 'Start the cycle',
          description:
            'From Tasks → New task → Leasing / Re-letting, choose the property. Or open the property hub and start leasing from the workflow shortcuts there.',
        },
        {
          title: 'Advertise and run opens',
          description:
            'Configure the listing details, schedule open inspections, and collect applicant interest. Shortlisted applicants move to tenant selection.',
        },
        {
          title: 'Select a tenant',
          description:
            'Compare applications, references, and documents in tenant selection. Approve one applicant to begin onboarding — others are declined automatically or manually.',
        },
        {
          title: 'Complete onboarding',
          description:
            'Work through bond, lease agreement, ingoing inspection, key collection, and tenant portal provisioning. Blockers show on the property leasing workflow until resolved.',
        },
        {
          title: 'Hand over and go live',
          description:
            'When onboarding is complete, the tenancy is active on the property profile — rent, routine inspections, and maintenance run under the new lease.',
        },
      ],
      functions: [
        {
          title: 'New task — Leasing',
          description:
            'Creates a new letting cycle on a vacant or re-let property. Only one active leasing cycle per property at a time.',
        },
        {
          title: 'Tasks → Leasing filter',
          description:
            'Shows all open leasing jobs across the portfolio. Use with status cards (Need my action, CROS handling, Waiting) to prioritise.',
        },
        {
          title: 'Tenant selection',
          description:
            'Shortlist and approve applicants. Approval starts the onboarding checklist on the property.',
        },
        {
          title: 'Onboarding checklist',
          description:
            'Bond lodgement, agreement signing, ingoing inspection, keys, and tenant app access. Each step has a clear done / pending state.',
        },
        {
          title: 'Open inspections',
          description:
            'Marketing viewings linked to the leasing cycle. Applicants from opens can flow into selection.',
        },
        {
          title: 'Lease documents',
          description:
            'Generated agreements and supporting PDFs live on the property Documents tab and leasing workflow.',
        },
        {
          title: 'Tenant portal provisioning',
          description:
            'After approval, provision tenant login from Tenants or the onboarding step so they can pay rent and report maintenance.',
        },
        {
          title: 'Transfer (change of agency)',
          description:
            'Separate workflow when management transfers between agencies — not the same as a standard new let.',
        },
      ],
      tips: [
        'Use property-scoped Tasks when you are on-site at one address.',
        'Finish ingoing inspection before releasing keys — it protects the bond record.',
        'If onboarding stalls, check Need my action for landlord signatures or bond payment.',
        'Rent review is a different workflow — use New task → Rent review, not leasing.',
      ],
    },
    end_leasing: {
      id: 'end_leasing',
      pageName: 'End leasing',
      href: ROUTES.VACATING,
      eyebrow: 'Vacate & bond settlement',
      overview:
        'End leasing (vacating) closes a tenancy: notice, vacate date, key return, outgoing inspection, bond processing, and any make-good maintenance. Start from Tasks → New task → Vacating / End leasing or the property vacating workflow.',
      steps: [
        {
          title: 'Confirm vacate',
          description:
            'Record tenant notice, intended vacate date, and forwarding contact. Align with the lease break or expiry terms.',
        },
        {
          title: 'Schedule outgoing inspection',
          description:
            'Book the final inspection after vacate or key return. The outgoing report drives bond claims.',
        },
        {
          title: 'Review condition vs ingoing',
          description:
            'Compare outgoing photos and ratings to the ingoing baseline. Flag damage or cleaning issues for landlord approval.',
        },
        {
          title: 'Settle bond',
          description:
            'Process bond release, claims, and disbursement when the file is ready. Document decisions on the vacating workflow.',
        },
        {
          title: 'Close the property or re-let',
          description:
            'After vacate, mark the property vacant and start a new leasing cycle if re-letting, or leave vacant per landlord instruction.',
        },
      ],
      functions: [
        {
          title: 'New task — Vacating',
          description:
            'Opens the end-of-lease workflow on a tenanted property. Captures notice and vacate planning.',
        },
        {
          title: 'Vacating list',
          description:
            'The Vacating page (End leasing) shows active vacate files across the portfolio for quick triage.',
        },
        {
          title: 'Outgoing inspection',
          description:
            'Linked from the vacating workflow. Required for evidence-based bond claims.',
        },
        {
          title: 'Bond settlement',
          description:
            'Steps to release or claim bond components. Keep landlord and tenant communications on the property record.',
        },
        {
          title: 'Make-good maintenance',
          description:
            'End-of-lease repairs may spawn maintenance jobs. Those appear under Tasks and the property maintenance history.',
        },
        {
          title: 'Key collection',
          description:
            'Recorded on the vacating checklist. Do not mark vacate complete until keys are accounted for.',
        },
        {
          title: 'Archived tenancy',
          description:
            'Completed leases move to Archived tenancies on the property profile for historical lookup.',
        },
      ],
      tips: [
        'Outgoing inspection should happen as close to vacate as practical.',
        'Keep ingoing report handy when reviewing outgoing — it is the bond baseline.',
        'End leasing is not the same as Archive property — vacate closes the tenancy; archive removes the listing from your live portfolio.',
        'Disputes over bond may later link to Tribunal — keep evidence on the property.',
      ],
    },
    tribunal: {
      id: 'tribunal',
      pageName: 'Tribunal',
      href: ROUTES.TRIBUNAL,
      eyebrow: 'Formal disputes & escalation',
      overview:
        'Tribunal cases handle formal disputes when informal resolution fails — typically rent arrears, bond disagreements, or breach of tenancy. Cases are opened from arrears or vacate workflows with evidence attached, then tracked through preparation, filing, hearing, and outcome.',
      steps: [
        {
          title: 'Exhaust informal steps first',
          description:
            'Use rent chasing, reminders, and negotiation before tribunal. Most matters should show documented contact and payment history on the property.',
        },
        {
          title: 'Open a tribunal case',
          description:
            'From Tasks → New task → Tribunal, or escalate from rent chasing / vacating when appropriate. Link the property and arrears or dispute context.',
        },
        {
          title: 'Build the evidence pack',
          description:
            'Attach lease, ledger, messages, inspection reports, and notices. The case workspace keeps documents with the dispute file.',
        },
        {
          title: 'Track stages',
          description:
            'Follow preparation, filing, hearing date, and outcome on the case. Update status as NCAT (or equivalent) progresses.',
        },
        {
          title: 'Close and record outcome',
          description:
            'When resolved, record the order or settlement on the case and property. Future arrears or leasing decisions can reference this history.',
        },
      ],
      functions: [
        {
          title: 'Tribunal list',
          description:
            'All open and recent tribunal cases across your portfolio. Filter and open from Tasks type tab Tribunal as well.',
        },
        {
          title: 'Rent chasing entry point',
          description:
            'Persistent arrears on a property can start rent chasing, which may escalate to tribunal with ledger evidence pre-attached.',
        },
        {
          title: 'Case workspace',
          description:
            'Stages, documents, notes, and activity for one dispute. Same pattern as maintenance and leasing job detail.',
        },
        {
          title: 'Evidence attachments',
          description:
            'Inspection reports, agreements, and communications should be linked — not only stored in email.',
        },
        {
          title: 'Hearing & outcome',
          description:
            'Record hearing dates and tribunal orders for landlord reporting and compliance.',
        },
        {
          title: 'Full management gate',
          description:
            'Rent chasing and some tribunal paths require full management access. Inspection-only accounts have a reduced feature set.',
        },
      ],
      tips: [
        'Document every rent reminder before filing — tribunals expect a paper trail.',
        'Bond disputes need ingoing and outgoing inspection reports when available.',
        'Not every arrears matter needs tribunal — confirm with your landlord and Account Manager.',
        'Closed tribunal cases remain on the property history for future reference.',
      ],
    },
  };

export const AGENT_WORKFLOW_TRAINING_MODULES: AgentWorkflowTrainingModule[] =
  AGENT_WORKFLOW_TRAINING_ORDER.map((id) => AGENT_WORKFLOW_TRAINING[id]);
