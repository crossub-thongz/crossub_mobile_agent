import type { ServerContractDraft, ServerLeasingCycleView } from '@/lib/leasing-cycle-types';
import { formatInspectorReassignmentLabel } from '@/lib/inspector-reassignment-label';
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
import type { LeasingContract, LeasingPropertyDetail } from '@/lib/leasing/types';
import type { LeasingCycle } from '@/lib/types';
import type { ReferenceCheckRecommendation } from '@/lib/leasing/reference-check-draft';
import { parseReferenceCheckDraft } from '@/lib/leasing/reference-check-draft';
import { fileNameFromDocumentUrl } from '@/lib/leasing-applicant-upload.util';

const u = (v: string | null | undefined): string | undefined => v ?? undefined;
const n = (v: number | null | undefined): number | undefined =>
  v == null ? undefined : v;
const asArray = <T>(value: T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : [];

const POOL_INSPECTOR_LABEL = 'Pending — task pool';

function resolveOpenInspectorLabel(view: ServerLeasingCycleView): string {
  const inspectorRaw = view.openInspection.inspectorName?.trim();
  if (
    !inspectorRaw ||
    ['pending assignment', 'task pool', 'pending — task pool'].includes(
      inspectorRaw.toLowerCase(),
    )
  ) {
    return POOL_INSPECTOR_LABEL;
  }
  return (
    formatInspectorReassignmentLabel(
      inspectorRaw,
      view.openInspection.previousInspectorName,
    ) ?? inspectorRaw
  );
}

function asItemStatus(status: string): LeasingItemStatus {
  if (Object.values(LEASING_ITEM_STATUS).includes(status as LeasingItemStatus)) {
    return status as LeasingItemStatus;
  }
  return LEASING_ITEM_STATUS.NOT_STARTED;
}

function mapContract(
  draft: ServerContractDraft | null | undefined,
  view: ServerLeasingCycleView,
): LeasingContract {
  const d = draft ?? {};
  return {
    contractId: view.tenancyAgreementId ?? `CN-${view.id.slice(0, 8)}`,
    template: d.template ?? 'Standard Residential Tenancy Agreement',
    leaseTerm: d.leaseTerm ?? '26 weeks',
    startDate: u(d.startDate),
    endDate: u(d.endDate),
    weeklyRent: d.weeklyRent ?? n(view.rental.rentPerWeek),
    bond: d.bond ?? n(view.rental.bond),
    deposit: d.deposit ?? n(view.rental.deposit),
    paymentReference: u(d.paymentReference),
    petsAllowed: d.petsAllowed ?? false,
    waterChargedSeparately: d.waterChargedSeparately ?? false,
    specialConditions: (d.specialConditions ?? []).map((c, i) => ({
      id: `sc-${view.id.slice(0, 8)}-${i}`,
      text: c.text,
    })),
    confirmed: d.confirmed ?? false,
  };
}

function mapOnboarding(view: ServerLeasingCycleView): LeasingPropertyDetail['onboarding'] {
  const ob = view.onboarding;
  return {
    deposit: {
      status: asItemStatus(ob?.deposit.status ?? 'not_started'),
      amount: n(ob?.deposit.amount ?? view.rental.deposit),
      paidAt: u(ob?.deposit.paidAt ?? undefined),
      proofFileName: u(ob?.deposit.proofFileName ?? undefined),
      proofUrl: u(ob?.deposit.proofUrl ?? undefined),
      ledgerEntryId: u(ob?.deposit.ledgerEntryId ?? undefined),
    },
    bond: {
      status: asItemStatus(ob?.bond.status ?? 'not_started'),
      amount: n(ob?.bond.amount ?? view.rental.bond),
      agentLink: u(ob?.bond.agentLink ?? undefined),
      sentToTenantAt: u(ob?.bond.sentToTenantAt ?? undefined),
      paidAt: u(ob?.bond.paidAt ?? undefined),
      proofFileName: u(ob?.bond.proofFileName ?? undefined),
      proofUrl: u(ob?.bond.proofUrl ?? undefined),
      ledgerEntryId: u(ob?.bond.ledgerEntryId ?? undefined),
      lodgementRef: u(ob?.bond.lodgementRef ?? undefined),
    },
    agreement: {
      status: asItemStatus(ob?.agreement.status ?? 'not_started'),
      contract: mapContract(ob?.agreement.contractDraft ?? null, view),
      signingStatus: (ob?.agreement.signingStatus ?? 'not_sent') as
        | 'not_sent'
        | 'sent'
        | 'viewed'
        | 'signed',
      signedAt: u(ob?.agreement.signedAt ?? undefined),
      uploadedFileName: u(ob?.agreement.uploadedFileName ?? undefined),
      signedProofUrl: u(ob?.agreement.signedProofUrl ?? undefined),
      signedProofFileName: u(ob?.agreement.signedProofFileName ?? undefined),
    },
    keyCollection: {
      status: asItemStatus(ob?.keyCollection.status ?? 'not_started'),
      custody: (view.agent.keyCustody as LeasingKeyCustody) ?? 'crossub',
      time: u(ob?.keyCollection.time ?? undefined),
      timeEnd: u(ob?.keyCollection.timeEnd ?? undefined),
      location: u(ob?.keyCollection.location ?? undefined),
      photos: ob?.keyCollection.photos ?? [],
      tenantReport: ob?.keyCollection.tenantReport
        ? {
            submittedAt: u(ob.keyCollection.tenantReport.submittedAt ?? undefined),
            tagNumber: ob.keyCollection.tenantReport.tagNumber,
            keysCount: ob.keyCollection.tenantReport.keysCount,
            entryDoorCount: ob.keyCollection.tenantReport.entryDoorCount,
            windowSlidingCount: ob.keyCollection.tenantReport.windowSlidingCount,
            fobsCount: ob.keyCollection.tenantReport.fobsCount,
            remoteControlCount: ob.keyCollection.tenantReport.remoteControlCount,
            mailboxCount: ob.keyCollection.tenantReport.mailboxCount,
            othersCount: ob.keyCollection.tenantReport.othersCount,
          }
        : null,
    },
    ingoingInspection: {
      status: asItemStatus(ob?.ingoingInspection.status ?? 'not_started'),
      scheduledTime: u(ob?.ingoingInspection.scheduledTime ?? undefined),
      assignee: u(ob?.ingoingInspection.assignee ?? undefined),
      inspectionId: ob?.ingoingInspection.inspectionId ?? undefined,
      reportAvailable: Boolean(ob?.ingoingInspection.inspectionId),
      tenantConfirmed: ob?.ingoingInspection.tenantConfirmed ?? false,
      awaitingAgentPayment: ob?.ingoingInspection.awaitingAgentPayment === true,
      disputes: asArray(view.disputes).map((d) => ({
        id: d.id,
        area: d.area ?? '',
        description: d.description ?? '',
        raisedAt: d.raisedAt,
        routedToMaintenance: d.routedToMaintenance,
      })),
    },
    ingoingReportApproval: {
      status: asItemStatus(ob?.ingoingReportApproval.status ?? 'not_started'),
      tenantApproved: ob?.ingoingReportApproval.tenantApproved ?? false,
      approvedAt: u(ob?.ingoingReportApproval.approvedAt ?? undefined),
    },
  };
}

/** Merge a server cycle view into the agent leasing workflow detail (crossub_web mapCycle subset). */
export function patchDetailFromCycleView(
  existing: LeasingPropertyDetail,
  view: ServerLeasingCycleView,
): LeasingPropertyDetail {
  const inspectorName = resolveOpenInspectorLabel(view);

  return {
    ...existing,
    propertyId: view.propertyId,
    cycleId: view.id,
    cycleActive: view.isActive,
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
      leaseTerm:
        u(view.onboarding?.agreement.contractDraft?.leaseTerm) ??
        existing.rental.leaseTerm,
      tenantMovedOut:
        view.onboarding?.agreement.contractDraft?.tenantMovedOut ??
        existing.rental.tenantMovedOut,
      tenantMovedOutDate: u(view.onboarding?.agreement.contractDraft?.tenantMovedOutDate),
      lettingNotes: u(view.onboarding?.agreement.contractDraft?.lettingNotes),
    },
    openInspection: {
      status: asItemStatus(view.openInspection.status),
      inspectionId: u(view.openInspection.inspectionId ?? undefined),
      inspectorName,
      inspectorPhone: u(view.openInspection.inspectorPhone ?? undefined),
      inspectorEmail: u(view.openInspection.inspectorEmail ?? undefined),
      scheduledTime: u(view.openInspection.scheduledTime),
      scheduledTimeEnd: u(view.openInspection.scheduledTimeEnd ?? undefined),
      // Weekly-batch state. `timeProvisional` has to travel with `scheduledTime` — the
      // time above is a placeholder until an inspector confirms one, and a screen that
      // takes one without the other advertises a slot nobody agreed to.
      timeProvisional: view.openInspection.timeProvisional ?? false,
      timeConfirmedAt: u(view.openInspection.timeConfirmedAt ?? undefined),
      batchWeekKey: u(view.openInspection.batchWeekKey ?? undefined),
      agentPreferredStart: u(view.openInspection.agentPreferredStart ?? undefined),
      routeSequence: n(view.openInspection.routeSequence ?? undefined),
      preferredScheduledTime: u(view.openInspection.preferredScheduledTime ?? undefined),
      preferredScheduledTimeEnd: u(view.openInspection.preferredScheduledTimeEnd ?? undefined),
      preferredNotes: u(view.openInspection.preferredNotes ?? undefined),
      startedEarly: view.openInspection.startedEarly ?? undefined,
      startedEarlyAt: u(view.openInspection.startedEarlyAt ?? undefined),
      originalScheduledStart: u(view.openInspection.originalScheduledStart ?? undefined),
      finishedAt: u(view.openInspection.finishedAt ?? undefined),
      viewingSessionId: view.viewingSessionId ?? undefined,
      pushedToAgentApp: view.openInspection.pushedToAgentApp,
      agentConducted: view.openInspection.agentConducted,
      agentNotifiedToAdvertise: view.openInspection.agentNotifiedToAdvertise,
      advertising: view.openInspection.advertising as LeasingAdvertisingStatus,
      advertisingNote: u(view.openInspection.advertisingNote),
      awaitingAgentPayment: view.openInspection.awaitingAgentPayment === true,
    },
    openReport: {
      status: asItemStatus(view.openReport.status),
      sentToAgent: view.openReport.sentToAgent,
      sentToAgentAt: u(view.openReport.sentToAgentAt),
      viewerInvitesSent: view.openReport.viewerInvitesSent,
      invitedCount: n(view.openReport.invitedCount),
      viewerInvites: asArray(view.openReport.viewerInvites).map((invite) => ({
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
    applicationsDetail: asArray(view.applications).map((r) => {
      const referenceDraft = parseReferenceCheckDraft(r.agentFeedback);
      return {
      id: r.applicationId,
      applicant: r.applicantName ?? 'Applicant',
      email: u(r.applicantEmail),
      phone: u(r.applicantPhone),
      submittedAt: r.submittedAt ?? r.sentToAgentAt ?? r.decisionAt ?? view.createdAt,
      aiScore: r.aiScore ?? undefined,
      aiScoreLevel: (r.aiScoreLevel as 'strong' | 'medium' | 'risk' | null) ?? undefined,
      aiAdvice: u(r.aiAdvice),
      feedback: referenceDraft.notes || u(r.agentFeedback),
      referenceRecommendation: referenceDraft.recommendation,
      feedbackSentAt: u(r.feedbackSentAt),
      annualIncome: r.annualIncome ?? undefined,
      employmentStatus: u(r.employmentStatus),
      moveInDate: u(r.moveInDate),
      aiAdviceSentToAgent: r.aiAdviceSentToAgent,
      selectedForAgent: r.selectedForAgent,
      sentToAgent: r.sentToAgent,
      agentDecision: (r.agentDecision as LeasingAgentDecision) ?? LEASING_AGENT_DECISION.PENDING,
      documents: (r.documents ?? []).map((url) => ({
        fileName: fileNameFromDocumentUrl(url),
        url,
      })),
    };
    }),
    onboarding: mapOnboarding(view),
    timeline: asArray(view.timeline).map((event) => ({
      id: event.id,
      label: event.label,
      kind: event.kind,
      actor: event.actor,
      at: event.at,
    })),
  };
}

function onboardingProceduresDone(view: ServerLeasingCycleView): boolean {
  const ob = view.onboarding;
  if (!ob) return false;
  return (
    asItemStatus(ob.deposit.status) === LEASING_ITEM_STATUS.DONE &&
    asItemStatus(ob.bond.status) === LEASING_ITEM_STATUS.DONE &&
    asItemStatus(ob.agreement.status) === LEASING_ITEM_STATUS.DONE &&
    asItemStatus(ob.keyCollection.status) === LEASING_ITEM_STATUS.DONE
  );
}

/** Portfolio-shaped cycle from GET /leasing/cycles/:id (including completed cases). */
export function mapServerCycleViewToLeasingCycle(view: ServerLeasingCycleView): LeasingCycle {
  const completed =
    !view.isActive && !view.cancelledAt && onboardingProceduresDone(view);
  return {
    id: view.id,
    propertyId: view.propertyId,
    propertyAddress: view.propertyAddress ?? '—',
    lifecycleStep: view.lifecycleStep.replaceAll('-', '_').toUpperCase(),
    onboardingStepId: completed ? 'completed' : view.activeStepHint,
    isActive: view.isActive,
    rentPerWeek: view.rentPerWeek ?? view.rental.rentPerWeek ?? undefined,
    availableFrom: view.rental.availableFrom ?? undefined,
    createdAt: view.createdAt,
  };
}
