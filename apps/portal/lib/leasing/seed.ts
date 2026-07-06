import {
  LEASING_ADVERTISING_STATUS,
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

export function getLeasingDetailSeed(
  propertyId: string,
  propertyAddress: string,
  rentWeekly?: number,
): LeasingPropertyDetail {
  return defaultLeasingDetail(propertyId, propertyAddress, rentWeekly);
}
