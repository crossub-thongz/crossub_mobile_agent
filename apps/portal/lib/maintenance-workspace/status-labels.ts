import type { MaintenanceWorkspaceCase } from './types';

export const STATUS_LABELS: Record<string, string> = {
  under_review: 'Under Review',
  pending_evidence: 'Requesting More Evidence',
  pending_quotation: 'Pending Quotation',
  pending_approval: 'Pending Approval',
  in_progress: 'In Progress',
  completed: 'Completed',
  closed: 'Closed',
  deleted: 'Deleted',
};

export const SOURCE_LABELS: Record<MaintenanceWorkspaceCase['source'], string> = {
  tenant_app: 'Tenant App',
  agent_submission: 'Agent Submission',
  email: 'Email',
};
