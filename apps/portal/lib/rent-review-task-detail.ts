import {
  buildRentReviewAgentWorkflow,
  hasMarketResearchComplete,
  type RentReviewAgentWorkflowModel,
} from '@/lib/rent-review/agent-workflow-model';
import {
  isTenantAccepted,
  isTenantDeclined,
} from '@/lib/rent-review/tenant-decision-display';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import type { Property } from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { workflowCaseReferenceLabel } from '@/lib/workflow-case-reference';

export const RENT_REVIEW_TASK_STAGE_LABELS = [
  'Review due',
  'Market review',
  'Proposal prepared',
  'Proposal sent',
  'Tenant responded',
  'Landlord decision',
  'Lease updated',
  'Completed',
] as const;

export type RentReviewTaskTab =
  | 'workflow'
  | 'details'
  | 'proposal'
  | 'tenant_response'
  | 'activity'
  | 'documents'
  | 'notes';

export type RentReviewTaskStageState = 'complete' | 'current' | 'pending';

export function rentReviewTaskReference(reviewId: string): string {
  return workflowCaseReferenceLabel(reviewId, 'rent_review');
}

function auditAt(detail: RentReviewWorkflowDetail, kind: string): string | null {
  const hit = [...detail.auditLog].reverse().find((entry) => entry.kind === kind);
  return hit?.at ?? null;
}

export function resolveRentReviewTaskStageIndex(
  detail: RentReviewWorkflowDetail,
  workflow: RentReviewAgentWorkflowModel,
): number {
  if (detail.workflowState === 'completed' || detail.legacyStatus === 'COMPLETED') return 7;
  if (
    detail.workflowState === 'accounting' ||
    auditAt(detail, 'lease_agreement_signed') ||
    auditAt(detail, 'accounting_handoff')
  ) {
    return 6;
  }
  if (isTenantAccepted(detail) || isTenantDeclined(detail)) return 4;
  if (workflow.liveStepId === 'tenant_decision' || workflow.liveStepId === 'negotiation') return 4;
  if (workflow.liveStepId === 'tenant_notified') return 3;
  if (workflow.liveStepId === 'agent_confirmed') return 2;
  if (hasMarketResearchComplete(detail)) return 1;
  return 0;
}

export function buildRentReviewTaskStages(
  detail: RentReviewWorkflowDetail,
  workflow: RentReviewAgentWorkflowModel,
): { label: string; state: RentReviewTaskStageState; dateLabel?: string }[] {
  const currentIndex = resolveRentReviewTaskStageIndex(detail, workflow);
  const stageDates: (string | undefined)[] = [
    detail.rentReviewDate ? formatDate(detail.rentReviewDate) : undefined,
    auditAt(detail, 'ai_report_ready')
      ? formatDate(auditAt(detail, 'ai_report_ready')!)
      : undefined,
    detail.agentConfirmedDate ? formatDate(detail.agentConfirmedDate) : undefined,
    auditAt(detail, 'tenant_notices_dispatched')
      ? formatDate(auditAt(detail, 'tenant_notices_dispatched')!)
      : undefined,
    auditAt(detail, 'tenant_accepted_response') || auditAt(detail, 'tenant_rejected_response')
      ? formatDate(
          (auditAt(detail, 'tenant_accepted_response') ||
            auditAt(detail, 'tenant_rejected_response'))!,
        )
      : undefined,
    undefined,
    auditAt(detail, 'lease_agreement_signed')
      ? formatDate(auditAt(detail, 'lease_agreement_signed')!)
      : undefined,
    detail.completedDate ? formatDate(detail.completedDate) : undefined,
  ];

  return RENT_REVIEW_TASK_STAGE_LABELS.map((label, index) => {
    let state: RentReviewTaskStageState = 'pending';
    if (index < currentIndex) state = 'complete';
    else if (index === currentIndex) state = 'current';
    return {
      label,
      state,
      dateLabel: stageDates[index],
    };
  });
}

export function resolveRentReviewStatusBanner(detail: RentReviewWorkflowDetail): {
  title: string;
  subtitle: string;
  needsAction: boolean;
  crosSummary: string[];
  tenantResponseLabel?: string;
} {
  const proposed = detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly;
  const needsAction =
    detail.workflowState === 'agent_review' ||
    detail.workflowState === 'negotiation' ||
    isTenantDeclined(detail) ||
    isTenantAccepted(detail);

  let title = 'Rent review in progress';
  let subtitle = 'Track market review, proposal, and tenant response';
  let tenantResponseLabel: string | undefined;

  if (isTenantDeclined(detail)) {
    title = 'Tenant response received — Review required';
    subtitle = 'Tenant has declined the proposed rent increase';
    tenantResponseLabel = 'Declined';
  } else if (isTenantAccepted(detail)) {
    title = 'Tenant response received';
    subtitle = 'Tenant accepted the proposed rent increase';
    tenantResponseLabel = 'Accepted';
  } else if (detail.workflowState === 'tenant_notified') {
    title = 'Awaiting tenant response';
    subtitle = 'Formal notice sent — waiting for tenant decision';
  } else if (detail.workflowState === 'agent_review') {
    title = 'Agent review required';
    subtitle = 'Confirm proposed rent before notifying tenant';
  }

  const crosSummary = [
    detail.ai.rationale?.trim() || null,
    isTenantDeclined(detail)
      ? 'Tenant has declined the proposed rent increase. Review the response and decide next step.'
      : null,
    proposed != null
      ? `Proposed rent ${formatCurrency(proposed)} / week`
      : null,
  ].filter((line): line is string => Boolean(line));

  return { title, subtitle, needsAction, crosSummary, tenantResponseLabel };
}

export function buildRentReviewDetailRows(
  detail: RentReviewWorkflowDetail,
  property?: Property | null,
): { label: string; value: string }[] {
  const proposed = detail.proposedWeeklyRent ?? detail.ai.suggestedWeekly;
  const increase =
    proposed != null && detail.currentWeeklyRent > 0
      ? proposed - detail.currentWeeklyRent
      : null;
  const increasePct =
    detail.ai.increasePercent ??
    (increase != null && detail.currentWeeklyRent > 0
      ? (increase / detail.currentWeeklyRent) * 100
      : null);

  const marketRange = detail.ai.research?.platforms.find(
    (platform) => platform.rangeLow != null && platform.rangeHigh != null,
  );

  return [
    {
      label: 'Review due',
      value: detail.rentReviewDate ? formatDate(detail.rentReviewDate) : '—',
    },
    {
      label: 'Review completed',
      value: detail.completedDate ? formatDate(detail.completedDate) : '—',
    },
    {
      label: 'Current rent',
      value: `${formatCurrency(detail.currentWeeklyRent)} / week`,
    },
    {
      label: 'Proposed rent',
      value: proposed != null ? `${formatCurrency(proposed)} / week` : '—',
    },
    {
      label: 'Increase',
      value:
        increase != null
          ? `${formatCurrency(increase)}${increasePct != null ? ` / ${increasePct.toFixed(2)}%` : ''}`
          : '—',
    },
    {
      label: 'Review period',
      value: detail.fixedTermWeeks ? `${detail.fixedTermWeeks} weeks` : '12 months',
    },
    {
      label: 'Next rent effective date',
      value: detail.effectiveDate ? formatDate(detail.effectiveDate) : '—',
    },
    {
      label: 'Payment frequency',
      value: 'Weekly',
    },
    {
      label: 'Market rental range',
      value:
        marketRange?.rangeLow != null && marketRange.rangeHigh != null
          ? `${formatCurrency(marketRange.rangeLow)} – ${formatCurrency(marketRange.rangeHigh)} / week`
          : '—',
    },
    {
      label: 'Comparable properties',
      value:
        marketRange?.sampleCount != null ? `${marketRange.sampleCount} properties` : '—',
    },
    {
      label: 'Landlord name',
      value: property?.homeOwnerName || '—',
    },
  ];
}

export function buildRentReviewActivityEntries(detail: RentReviewWorkflowDetail): {
  id: string;
  at: string;
  title: string;
  actor: string;
}[] {
  return [...detail.auditLog]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map((entry) => ({
      id: entry.id,
      at: entry.at,
      title: entry.message,
      actor: entry.actor || 'CROS System',
    }));
}

export function buildRentReviewWorkflowModel(detail: RentReviewWorkflowDetail) {
  return buildRentReviewAgentWorkflow(detail);
}

export function tenantResponseSummary(detail: RentReviewWorkflowDetail): {
  status: string;
  at?: string;
  reason?: string;
  comments?: string;
} | null {
  if (isTenantDeclined(detail)) {
    return {
      status: 'Declined',
      at: auditAt(detail, 'tenant_rejected_response') ?? undefined,
      reason: detail.decisionReason ?? undefined,
      comments: detail.negotiationNote ?? undefined,
    };
  }
  if (isTenantAccepted(detail)) {
    return {
      status: 'Accepted',
      at: auditAt(detail, 'tenant_accepted_response') ?? undefined,
      comments: detail.negotiationNote ?? undefined,
    };
  }
  return null;
}

export function formatRentReviewDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return formatDateTime(iso);
}
