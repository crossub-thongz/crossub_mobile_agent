import type { ApiQuotation } from '@/lib/crossub-api/types';

import type { MaintenanceWorkspaceCase } from './types';

type StepStatus = 'done' | 'active' | 'upcoming';

export interface WorkflowStep {
  id: string;
  label: string;
  sublabel?: string;
  status: StepStatus;
  tone?: 'normal' | 'declined';
}

export function getWorkflowSteps(
  request: MaintenanceWorkspaceCase,
  allQuotations: ApiQuotation[],
): WorkflowStep[] {
  const respSublabel =
    request.responsibility === 'landlord'
      ? 'Landlord confirmed'
      : request.responsibility
        ? 'Decision confirmed'
        : '—';

  const requiresContractorFlow = request.responsibility === 'landlord';
  const latestQuotationForRequest = allQuotations
    .filter((q) => q.maintenanceRequestId === request.id)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())[0];

  const contractorQuoteDeclined =
    latestQuotationForRequest?.status === 'declined' &&
    (request.status === 'pending_quotation' || request.status === 'pending_approval');

  const steps: WorkflowStep[] = [
    {
      id: 'created',
      label: 'Job Created',
      sublabel: `From ${request.source.replace(/_/g, ' ')}`,
      status: 'done',
    },
    {
      id: 'resp',
      label: 'Review',
      sublabel: respSublabel,
      status: request.responsibility
        ? 'done'
        : request.status === 'under_review' || request.status === 'pending_evidence'
          ? 'active'
          : 'upcoming',
    },
    ...(requiresContractorFlow
      ? ([
          {
            id: 'contractor_quote',
            label: 'Contractor Quote',
            sublabel: contractorQuoteDeclined ? 'Agent Declined' : 'Awaiting contractor quote submission',
            tone: contractorQuoteDeclined ? 'declined' : 'normal',
            status:
              request.status === 'pending_quotation'
                ? 'active'
                : ['pending_approval', 'in_progress', 'completed', 'closed'].includes(request.status)
                  ? 'done'
                  : 'upcoming',
          },
          {
            id: 'agent_approval',
            label: 'Agent Approval',
            sublabel: 'Agent reviews & approves',
            status:
              request.status === 'pending_approval'
                ? 'active'
                : ['in_progress', 'completed', 'closed'].includes(request.status)
                  ? 'done'
                  : 'upcoming',
          },
        ] as WorkflowStep[])
      : []),
    ...(request.responsibility
      ? ([
          {
            id: 'in_progress',
            label: 'In Progress',
            sublabel: 'Contractor on site',
            status:
              request.status === 'in_progress' || request.status === 'completed'
                ? 'active'
                : request.status === 'closed'
                  ? 'done'
                  : 'upcoming',
          },
          {
            id: 'closed',
            label: 'Closed',
            sublabel: 'Invoice uploaded & filed',
            status: request.status === 'closed' ? 'active' : 'upcoming',
          },
        ] as WorkflowStep[])
      : []),
  ];

  return steps;
}
