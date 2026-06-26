import {
  LEASING_ADVERTISING_STATUS,
  LEASING_AGENT_DECISION,
  LEASING_APPLY_PATH,
  LEASING_ITEM_STATUS,
  LEASING_KEY_CUSTODY,
  LEASING_LIFECYCLE_STEP,
} from '@/lib/leasing/constants';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

function emptyContract() {
  return {
    contractId: 'CT-NEW',
    template: 'Standard Residential',
    leaseTerm: '12 months',
    specialConditions: [] as { id: string; text: string }[],
    confirmed: false,
  };
}

export function emptyOnboarding(): LeasingPropertyDetail['onboarding'] {
  return {
    deposit: { status: LEASING_ITEM_STATUS.NOT_STARTED },
    bond: { status: LEASING_ITEM_STATUS.NOT_STARTED },
    agreement: {
      status: LEASING_ITEM_STATUS.NOT_STARTED,
      contract: emptyContract(),
      signingStatus: 'not_sent',
    },
    keyCollection: { status: LEASING_ITEM_STATUS.NOT_STARTED, custody: LEASING_KEY_CUSTODY.CROSSUB },
    ingoingInspection: {
      status: LEASING_ITEM_STATUS.NOT_STARTED,
      reportAvailable: false,
      tenantConfirmed: false,
      disputes: [],
    },
    ingoingReportApproval: {
      status: LEASING_ITEM_STATUS.NOT_STARTED,
      tenantApproved: false,
    },
  };
}

export function defaultLeasingDetail(
  propertyId: string,
  propertyAddress: string,
  rentWeekly = 0,
): LeasingPropertyDetail {
  return {
    propertyId,
    propertyAddress,
    agentInfo: {
      name: 'Agency contact',
      keyCustody: LEASING_KEY_CUSTODY.CROSSUB,
    },
    rental: { rentPerWeek: rentWeekly || undefined },
    activeStepHint: LEASING_LIFECYCLE_STEP.OPEN_INSPECTION,
    openInspection: {
      status: LEASING_ITEM_STATUS.NOT_STARTED,
      pushedToAgentApp: false,
      agentNotifiedToAdvertise: false,
      advertising: LEASING_ADVERTISING_STATUS.NOT_REQUESTED,
    },
    openReport: {
      status: LEASING_ITEM_STATUS.NOT_STARTED,
      sentToAgent: false,
      viewerInvitesSent: false,
      applyPaths: [LEASING_APPLY_PATH.APP_DOWNLOAD, LEASING_APPLY_PATH.H5_WEB],
      reportViewable: false,
    },
    applicationsDetail: [],
    onboarding: emptyOnboarding(),
  };
}

const SEED: Record<string, Partial<LeasingPropertyDetail>> = {
  'prop-1': {
    activeStepHint: LEASING_LIFECYCLE_STEP.ONBOARDING,
    rental: {
      rentPerWeek: 720,
      moveInDate: '2024-08-01',
      deposit: 720,
      bond: 2880,
    },
    openInspection: {
      status: LEASING_ITEM_STATUS.DONE,
      inspectorName: 'Lisa Tran',
      scheduledTime: '2024-07-15T10:00:00',
      pushedToAgentApp: true,
      agentNotifiedToAdvertise: true,
      advertising: LEASING_ADVERTISING_STATUS.PUBLISHED,
    },
    openReport: {
      status: LEASING_ITEM_STATUS.DONE,
      sentToAgent: true,
      sentToAgentAt: '2024-07-16T09:00:00',
      viewerInvitesSent: true,
      invitedCount: 18,
      applyPaths: [LEASING_APPLY_PATH.APP_DOWNLOAD, LEASING_APPLY_PATH.H5_WEB],
      reportViewable: true,
      attendeeCount: 18,
    },
    applicationsDetail: [
      {
        id: 'app-prop1-1',
        applicant: 'Sarah Chen',
        email: 'sarah.chen@email.com',
        annualIncome: 95000,
        employmentStatus: 'employed',
        submittedAt: '2024-07-20T11:00:00',
        aiScore: 91,
        aiScoreLevel: 'strong',
        aiAdvice: 'Strong application — recommend approval.',
        aiAdviceSentToAgent: true,
        selectedForAgent: true,
        sentToAgent: true,
        agentDecision: LEASING_AGENT_DECISION.APPROVED,
      },
    ],
    onboarding: {
      deposit: {
        status: LEASING_ITEM_STATUS.DONE,
        amount: 720,
        paidAt: '2024-07-28T10:00:00',
        proofFileName: 'deposit_receipt.pdf',
      },
      bond: {
        status: LEASING_ITEM_STATUS.DONE,
        amount: 2880,
        agentLink: 'https://rtba.qld.gov.au/bond/prop-1',
        paidAt: '2024-07-29T09:00:00',
        proofFileName: 'bond_lodgement.pdf',
      },
      agreement: {
        status: LEASING_ITEM_STATUS.DONE,
        signingStatus: 'signed',
        signedAt: '2024-07-30T14:00:00',
        contract: {
          contractId: 'CT-lease-1',
          template: 'Standard Residential',
          leaseTerm: '24 months',
          startDate: '2024-08-01',
          endDate: '2026-07-31',
          weeklyRent: 720,
          bond: 2880,
          deposit: 720,
          petsAllowed: false,
          waterChargedSeparately: true,
          specialConditions: [],
          confirmed: true,
        },
      },
      keyCollection: {
        status: LEASING_ITEM_STATUS.DONE,
        custody: LEASING_KEY_CUSTODY.CROSSUB,
        time: '2024-08-01T10:00:00',
        location: 'CROSSUB office',
      },
      ingoingInspection: {
        status: LEASING_ITEM_STATUS.DONE,
        scheduledTime: '2024-08-01T10:00:00',
        assignee: 'Lisa Tran',
        reportAvailable: true,
        tenantConfirmed: true,
        disputes: [],
      },
      ingoingReportApproval: {
        status: LEASING_ITEM_STATUS.DONE,
        tenantApproved: true,
        approvedAt: '2024-08-02T14:00:00',
      },
    },
  },
  'prop-2': {
    activeStepHint: LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL,
    rental: { rentPerWeek: 650, deposit: 650, bond: 2600 },
    openInspection: {
      status: LEASING_ITEM_STATUS.DONE,
      inspectorName: 'Marcus Reid',
      scheduledTime: '2024-05-10T11:00:00',
      pushedToAgentApp: true,
      agentNotifiedToAdvertise: true,
      advertising: LEASING_ADVERTISING_STATUS.PUBLISHED,
    },
    openReport: {
      status: LEASING_ITEM_STATUS.DONE,
      sentToAgent: true,
      sentToAgentAt: '2024-05-11T09:00:00',
      viewerInvitesSent: true,
      invitedCount: 22,
      applyPaths: [LEASING_APPLY_PATH.APP_DOWNLOAD, LEASING_APPLY_PATH.H5_WEB],
      reportViewable: true,
      attendeeCount: 22,
    },
    applicationsDetail: [
      {
        id: 'app-prop2-1',
        applicant: 'James & Emma Walsh',
        annualIncome: 118000,
        submittedAt: '2024-05-15T10:00:00',
        aiScore: 88,
        aiScoreLevel: 'strong',
        aiAdvice: 'Joint application with stable income.',
        aiAdviceSentToAgent: true,
        selectedForAgent: true,
        sentToAgent: true,
        agentDecision: LEASING_AGENT_DECISION.APPROVED,
      },
      {
        id: 'app-prop2-2',
        applicant: 'Nina Patel',
        annualIncome: 82000,
        submittedAt: '2024-05-16T14:00:00',
        aiScore: 72,
        aiScoreLevel: 'medium',
        aiAdvice: 'Acceptable but higher risk vs shortlisted applicants.',
        aiAdviceSentToAgent: true,
        selectedForAgent: false,
        sentToAgent: false,
        agentDecision: LEASING_AGENT_DECISION.PENDING,
      },
    ],
    onboarding: emptyOnboarding(),
  },
  'prop-3': {
    activeStepHint: LEASING_LIFECYCLE_STEP.APPLICATION_APPROVAL,
    rental: { rentPerWeek: 680, availableFrom: '2026-06-15', deposit: 680, bond: 2720 },
    openInspection: {
      status: LEASING_ITEM_STATUS.DONE,
      inspectorName: 'Lisa Tran',
      scheduledTime: '2026-05-31T10:00:00',
      pushedToAgentApp: true,
      agentNotifiedToAdvertise: true,
      advertising: LEASING_ADVERTISING_STATUS.PENDING_INTEGRATION,
      advertisingNote:
        'Publishing to established listing companies in Malaysia and Australia is a planned API integration.',
    },
    openReport: {
      status: LEASING_ITEM_STATUS.DONE,
      sentToAgent: true,
      sentToAgentAt: '2026-05-25T09:00:00',
      viewerInvitesSent: true,
      invitedCount: 12,
      applyPaths: [LEASING_APPLY_PATH.APP_DOWNLOAD, LEASING_APPLY_PATH.H5_WEB],
      reportViewable: true,
      attendeeCount: 12,
    },
    applicationsDetail: [
      {
        id: 'app-prop3-1',
        applicant: 'Alex Rivera',
        email: 'alex.rivera@email.com',
        annualIncome: 92000,
        submittedAt: '2026-05-24T10:00:00',
        aiScore: 85,
        aiScoreLevel: 'strong',
        aiAdvice: 'Shortlisted after open inspection — references clean.',
        aiAdviceSentToAgent: true,
        selectedForAgent: true,
        sentToAgent: true,
        agentDecision: LEASING_AGENT_DECISION.PENDING,
      },
    ],
    onboarding: emptyOnboarding(),
  },
  'prop-4': {
    activeStepHint: LEASING_LIFECYCLE_STEP.ONBOARDING,
    rental: { rentPerWeek: 580, moveInDate: '2025-06-01', deposit: 580, bond: 2320 },
    openInspection: {
      status: LEASING_ITEM_STATUS.DONE,
      inspectorName: 'Lisa Tran',
      scheduledTime: '2025-05-10T10:00:00',
      pushedToAgentApp: true,
      agentNotifiedToAdvertise: true,
      advertising: LEASING_ADVERTISING_STATUS.PUBLISHED,
    },
    openReport: {
      status: LEASING_ITEM_STATUS.DONE,
      sentToAgent: true,
      sentToAgentAt: '2025-05-11T09:00:00',
      viewerInvitesSent: true,
      invitedCount: 14,
      applyPaths: [LEASING_APPLY_PATH.APP_DOWNLOAD, LEASING_APPLY_PATH.H5_WEB],
      reportViewable: true,
      attendeeCount: 14,
    },
    applicationsDetail: [
      {
        id: 'app-prop4-1',
        applicant: 'Priya Nair',
        submittedAt: '2025-05-18T11:00:00',
        aiScore: 90,
        aiScoreLevel: 'strong',
        aiAdvice: 'Recommend approval.',
        aiAdviceSentToAgent: true,
        selectedForAgent: true,
        sentToAgent: true,
        agentDecision: LEASING_AGENT_DECISION.APPROVED,
      },
    ],
    onboarding: {
      deposit: {
        status: LEASING_ITEM_STATUS.DONE,
        amount: 580,
        paidAt: '2025-05-25T10:00:00',
      },
      bond: {
        status: LEASING_ITEM_STATUS.WAITING,
        amount: 2320,
        agentLink: 'https://rtba.qld.gov.au/bond/prop-4',
        sentToTenantAt: '2025-05-26T09:00:00',
      },
      agreement: {
        status: LEASING_ITEM_STATUS.IN_PROGRESS,
        signingStatus: 'sent',
        contract: {
          contractId: 'CT-lease-3',
          template: 'Standard Residential',
          leaseTerm: '12 months',
          startDate: '2025-06-01',
          endDate: '2026-05-31',
          weeklyRent: 580,
          bond: 2320,
          deposit: 580,
          specialConditions: [],
          confirmed: true,
        },
      },
      keyCollection: { status: LEASING_ITEM_STATUS.NOT_STARTED, custody: LEASING_KEY_CUSTODY.AGENT },
      ingoingInspection: {
        status: LEASING_ITEM_STATUS.NOT_STARTED,
        reportAvailable: false,
        tenantConfirmed: false,
        disputes: [],
      },
      ingoingReportApproval: {
        status: LEASING_ITEM_STATUS.NOT_STARTED,
        tenantApproved: false,
      },
    },
  },
};

export function getLeasingDetailSeed(
  propertyId: string,
  propertyAddress: string,
  rentWeekly?: number,
): LeasingPropertyDetail {
  const base = defaultLeasingDetail(propertyId, propertyAddress, rentWeekly);
  const patch = SEED[propertyId];
  if (!patch) return base;
  return {
    ...base,
    ...patch,
    rental: { ...base.rental, ...patch.rental },
    openInspection: { ...base.openInspection, ...patch.openInspection },
    openReport: { ...base.openReport, ...patch.openReport },
    agentInfo: { ...base.agentInfo, ...patch.agentInfo },
    applicationsDetail: patch.applicationsDetail ?? base.applicationsDetail,
    onboarding: patch.onboarding ?? base.onboarding,
  };
}
