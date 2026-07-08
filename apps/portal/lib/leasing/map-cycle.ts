import type { ServerLeasingCycleView } from '@/lib/leasing-cycle-types';
import {
  LEASING_AGENT_DECISION,
  LEASING_ITEM_STATUS,
  type LeasingAdvertisingStatus,
  type LeasingAgentDecision,
  type LeasingApplyPath,
  type LeasingItemStatus,
  type LeasingKeyCustody,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

const u = (v: string | null | undefined): string | undefined => v ?? undefined;
const n = (v: number | null | undefined): number | undefined =>
  v == null ? undefined : v;

const POOL_INSPECTOR_LABEL = 'Pending — task pool';

function asItemStatus(status: string): LeasingItemStatus {
  if (Object.values(LEASING_ITEM_STATUS).includes(status as LeasingItemStatus)) {
    return status as LeasingItemStatus;
  }
  return LEASING_ITEM_STATUS.NOT_STARTED;
}

/** Merge a server cycle view into the agent leasing workflow detail (crossub_web mapCycle subset). */
export function patchDetailFromCycleView(
  existing: LeasingPropertyDetail,
  view: ServerLeasingCycleView,
): LeasingPropertyDetail {
  const inspectorRaw = view.openInspection.inspectorName?.trim();
  const inspectorName =
    inspectorRaw &&
    !['pending assignment', 'task pool', 'pending — task pool'].includes(
      inspectorRaw.toLowerCase(),
    )
      ? inspectorRaw
      : POOL_INSPECTOR_LABEL;

  return {
    ...existing,
    propertyId: view.propertyId,
    activeStepHint: (view.activeStepHint ?? view.lifecycleStep) as LeasingLifecycleStep,
    agentInfo: {
      ...existing.agentInfo,
      name: u(view.agent.name),
      company: u(view.agent.company),
      email: u(view.agent.email),
      phone: u(view.agent.phone),
      keyCustody: (view.agent.keyCustody as LeasingKeyCustody) ?? existing.agentInfo.keyCustody,
    },
    rental: {
      rentPerWeek: n(view.rental.rentPerWeek),
      availableFrom: u(view.rental.availableFrom),
      moveInDate: u(view.rental.moveInDate),
      deposit: n(view.rental.deposit),
      bond: n(view.rental.bond),
    },
    openInspection: {
      status: asItemStatus(view.openInspection.status),
      inspectorName,
      scheduledTime: u(view.openInspection.scheduledTime),
      viewingSessionId: view.viewingSessionId ?? undefined,
      pushedToAgentApp: view.openInspection.pushedToAgentApp,
      agentNotifiedToAdvertise: view.openInspection.agentNotifiedToAdvertise,
      advertising: view.openInspection.advertising as LeasingAdvertisingStatus,
      advertisingNote: u(view.openInspection.advertisingNote),
    },
    openReport: {
      status: asItemStatus(view.openReport.status),
      sentToAgent: view.openReport.sentToAgent,
      sentToAgentAt: u(view.openReport.sentToAgentAt),
      viewerInvitesSent: view.openReport.viewerInvitesSent,
      invitedCount: n(view.openReport.invitedCount),
      viewerInvites: view.openReport.viewerInvites.map((invite) => ({
        id: invite.id,
        email: u(invite.email),
        phone: u(invite.phone),
        channel: invite.channel,
        body: invite.body,
        sentAt: invite.sentAt,
        commConversationId: u(invite.commConversationId),
      })),
      applyPaths: view.openReport.applyPaths as LeasingApplyPath[],
      reportViewable: view.openReport.reportViewable,
      attendeeCount: n(view.openReport.attendeeCount),
    },
    applicationsDetail: view.applications.map((r) => ({
      id: r.applicationId,
      applicant: r.applicantName ?? 'Applicant',
      email: u(r.applicantEmail),
      phone: u(r.applicantPhone),
      submittedAt: r.submittedAt ?? r.sentToAgentAt ?? r.decisionAt ?? view.createdAt,
      aiScore: r.aiScore ?? undefined,
      aiScoreLevel: (r.aiScoreLevel as 'strong' | 'medium' | 'risk' | null) ?? undefined,
      aiAdvice: u(r.aiAdvice),
      annualIncome: r.annualIncome ?? undefined,
      employmentStatus: u(r.employmentStatus),
      moveInDate: u(r.moveInDate),
      aiAdviceSentToAgent: r.aiAdviceSentToAgent,
      selectedForAgent: r.selectedForAgent,
      sentToAgent: r.sentToAgent,
      agentDecision: (r.agentDecision as LeasingAgentDecision) ?? LEASING_AGENT_DECISION.PENDING,
    })),
  };
}
