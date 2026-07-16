import type { ApiMaintenanceRequest, ApiMaintenanceStatus } from '@/lib/crossub-api/types';

const STATUS_RANK: Record<string, number> = {
  under_review: 1,
  pending_evidence: 2,
  pending_quotation: 3,
  pending_approval: 4,
  in_progress: 5,
  completed: 6,
  closed: 7,
};

function preferAdvancedStatus(
  a: ApiMaintenanceStatus,
  b: ApiMaintenanceStatus,
): ApiMaintenanceStatus {
  return (STATUS_RANK[a] ?? 0) >= (STATUS_RANK[b] ?? 0) ? a : b;
}

/** Merge Prisma-backed job rows with the shared workflow board during live polling. */
export function mergeMaintenanceCaseForLiveSync(
  prisma: ApiMaintenanceRequest,
  workflow: ApiMaintenanceRequest | undefined,
): ApiMaintenanceRequest {
  if (!workflow) return prisma;
  return {
    ...prisma,
    status: preferAdvancedStatus(prisma.status, workflow.status),
    responsibility: workflow.responsibility ?? prisma.responsibility,
    assignedContractorId: workflow.assignedContractorId ?? prisma.assignedContractorId,
    assignedContractor: prisma.assignedContractor ?? workflow.assignedContractor,
    invitedContractorIds: workflow.invitedContractorIds?.length
      ? workflow.invitedContractorIds
      : prisma.invitedContractorIds,
    invitedContractors: workflow.invitedContractors?.length
      ? workflow.invitedContractors
      : prisma.invitedContractors,
    quotationReviews: workflow.quotationReviews?.length
      ? workflow.quotationReviews
      : prisma.quotationReviews,
    quotationIds: workflow.quotationIds?.length ? workflow.quotationIds : prisma.quotationIds,
    completionEvidenceUploaded:
      Boolean(prisma.completionEvidenceUploaded) ||
      Boolean(workflow.completionEvidenceUploaded),
    tenantApprovalReceived:
      Boolean(prisma.tenantApprovalReceived) || Boolean(workflow.tenantApprovalReceived),
    invoiceUploaded: Boolean(prisma.invoiceUploaded) || Boolean(workflow.invoiceUploaded),
    timeline:
      (workflow.timeline?.length ?? 0) >= (prisma.timeline?.length ?? 0)
        ? workflow.timeline
        : prisma.timeline,
    tenant: prisma.tenant ?? workflow.tenant,
    agent: prisma.agent ?? workflow.agent,
  };
}
