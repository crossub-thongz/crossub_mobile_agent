'use client';

import { create } from 'zustand';

import {
  LEASING_ADVERTISING_STATUS,
  LEASING_AGENT_DECISION,
  LEASING_ITEM_STATUS,
  LEASING_LIFECYCLE_STEP,
  type LeasingAgentDecision,
  type LeasingLifecycleStep,
} from '@/lib/leasing/constants';
import { getLeasingDetailSeed } from '@/lib/leasing/seed';
import type { LeasingContract, LeasingPropertyDetail } from '@/lib/leasing/types';

type LeasingWorkflowStore = {
  details: Record<string, LeasingPropertyDetail>;
  activeStepByProperty: Record<string, LeasingLifecycleStep>;
  ensureDetail: (propertyId: string, propertyAddress: string, rentWeekly?: number) => LeasingPropertyDetail;
  getDetail: (propertyId: string) => LeasingPropertyDetail | undefined;
  getActiveStep: (propertyId: string) => LeasingLifecycleStep;
  setActiveStep: (propertyId: string, step: LeasingLifecycleStep) => void;
  resetActiveStepToHint: (propertyId: string, hint?: LeasingLifecycleStep) => void;
  arrangeOpenInspection: (id: string, inspectorName: string, scheduledTime: string) => void;
  pushInspectionToAgentApp: (id: string) => void;
  notifyAgentToAdvertise: (id: string) => void;
  sendReportToAgent: (id: string) => void;
  sendViewerInvites: (id: string) => void;
  toggleApplicantSelected: (id: string, applicationId: string) => void;
  sendSelectedToAgent: (id: string) => void;
  setApplicantDecision: (id: string, applicationId: string, decision: LeasingAgentDecision) => void;
  markDepositPaid: (id: string) => void;
  setBondLink: (id: string, link: string) => void;
  markBondPaid: (id: string) => void;
  confirmContract: (id: string) => void;
  recordSigning: (id: string) => void;
  setKeyCollection: (id: string, time: string, location: string) => void;
  scheduleIngoingInspection: (id: string, scheduledTime: string, assignee: string) => void;
  tenantConfirmIngoing: (id: string) => void;
  tenantApproveIngoingReport: (id: string) => void;
  updateContract: (id: string, patch: Partial<LeasingContract>) => void;
};

function updateDetail(
  details: Record<string, LeasingPropertyDetail>,
  id: string,
  fn: (detail: LeasingPropertyDetail) => LeasingPropertyDetail,
): Record<string, LeasingPropertyDetail> {
  const current = details[id];
  if (!current) return details;
  return { ...details, [id]: fn(current) };
}

export const useLeasingWorkflowStore = create<LeasingWorkflowStore>((set, get) => ({
  details: {},
  activeStepByProperty: {},

  ensureDetail(propertyId, propertyAddress, rentWeekly) {
    const existing = get().details[propertyId];
    if (existing) return existing;
    const detail = getLeasingDetailSeed(propertyId, propertyAddress, rentWeekly);
    set((s) => ({
      details: { ...s.details, [propertyId]: detail },
      activeStepByProperty: {
        ...s.activeStepByProperty,
        [propertyId]: detail.activeStepHint,
      },
    }));
    return detail;
  },

  getDetail(propertyId) {
    return get().details[propertyId];
  },

  getActiveStep(propertyId) {
    return (
      get().activeStepByProperty[propertyId] ??
      get().details[propertyId]?.activeStepHint ??
      LEASING_LIFECYCLE_STEP.OPEN_INSPECTION
    );
  },

  setActiveStep(propertyId, step) {
    set((s) => ({
      activeStepByProperty: { ...s.activeStepByProperty, [propertyId]: step },
    }));
  },

  resetActiveStepToHint(propertyId, hint) {
    const step =
      hint ??
      get().details[propertyId]?.activeStepHint ??
      LEASING_LIFECYCLE_STEP.OPEN_INSPECTION;
    set((s) => ({
      activeStepByProperty: { ...s.activeStepByProperty, [propertyId]: step },
    }));
  },

  arrangeOpenInspection(id, inspectorName, scheduledTime) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        openInspection: {
          ...p.openInspection,
          inspectorName,
          scheduledTime,
          status: LEASING_ITEM_STATUS.IN_PROGRESS,
        },
      })),
    }));
  },

  pushInspectionToAgentApp(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        openInspection: {
          ...p.openInspection,
          pushedToAgentApp: true,
          status:
            p.openInspection.scheduledTime
              ? LEASING_ITEM_STATUS.DONE
              : p.openInspection.status,
        },
      })),
    }));
  },

  notifyAgentToAdvertise(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        openInspection: {
          ...p.openInspection,
          agentNotifiedToAdvertise: true,
          advertising: LEASING_ADVERTISING_STATUS.PENDING_INTEGRATION,
        },
      })),
    }));
  },

  sendReportToAgent(id) {
    const now = new Date().toISOString();
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        openReport: {
          ...p.openReport,
          sentToAgent: true,
          sentToAgentAt: now,
          reportViewable: true,
          status: LEASING_ITEM_STATUS.DONE,
        },
      })),
    }));
  },

  sendViewerInvites(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        openReport: {
          ...p.openReport,
          viewerInvitesSent: true,
          invitedCount: p.openReport.attendeeCount ?? 0,
          status: LEASING_ITEM_STATUS.DONE,
        },
      })),
    }));
  },

  toggleApplicantSelected(id, applicationId) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        applicationsDetail: p.applicationsDetail.map((a) =>
          a.id === applicationId ? { ...a, selectedForAgent: !a.selectedForAgent } : a,
        ),
      })),
    }));
  },

  sendSelectedToAgent(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        applicationsDetail: p.applicationsDetail.map((a) =>
          a.selectedForAgent ? { ...a, sentToAgent: true, aiAdviceSentToAgent: true } : a,
        ),
      })),
    }));
  },

  setApplicantDecision(id, applicationId, decision) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        applicationsDetail: p.applicationsDetail.map((a) =>
          a.id === applicationId ? { ...a, agentDecision: decision } : a,
        ),
      })),
    }));
  },

  markDepositPaid(id) {
    const now = new Date().toISOString();
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          deposit: {
            ...p.onboarding.deposit,
            status: LEASING_ITEM_STATUS.DONE,
            paidAt: now,
            amount: p.onboarding.deposit.amount ?? p.rental.deposit,
          },
        },
      })),
    }));
  },

  setBondLink(id, link) {
    const now = new Date().toISOString();
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          bond: {
            ...p.onboarding.bond,
            agentLink: link,
            sentToTenantAt: now,
            status: LEASING_ITEM_STATUS.WAITING,
            amount: p.onboarding.bond.amount ?? p.rental.bond,
          },
        },
      })),
    }));
  },

  markBondPaid(id) {
    const now = new Date().toISOString();
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          bond: {
            ...p.onboarding.bond,
            status: LEASING_ITEM_STATUS.DONE,
            paidAt: now,
          },
        },
      })),
    }));
  },

  confirmContract(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          agreement: {
            ...p.onboarding.agreement,
            contract: { ...p.onboarding.agreement.contract, confirmed: true },
            status: LEASING_ITEM_STATUS.IN_PROGRESS,
            signingStatus: 'sent',
          },
        },
      })),
    }));
  },

  recordSigning(id) {
    const now = new Date().toISOString();
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          agreement: {
            ...p.onboarding.agreement,
            status: LEASING_ITEM_STATUS.DONE,
            signingStatus: 'signed',
            signedAt: now,
          },
        },
      })),
    }));
  },

  setKeyCollection(id, time, location) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          keyCollection: {
            ...p.onboarding.keyCollection,
            status: LEASING_ITEM_STATUS.DONE,
            time,
            location,
          },
        },
      })),
    }));
  },

  scheduleIngoingInspection(id, scheduledTime, assignee) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          ingoingInspection: {
            ...p.onboarding.ingoingInspection,
            scheduledTime,
            assignee,
            reportAvailable: true,
            status: LEASING_ITEM_STATUS.WAITING,
          },
        },
      })),
    }));
  },

  tenantConfirmIngoing(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          ingoingInspection: {
            ...p.onboarding.ingoingInspection,
            tenantConfirmed: true,
            status: LEASING_ITEM_STATUS.DONE,
          },
          ingoingReportApproval: {
            ...p.onboarding.ingoingReportApproval,
            status: LEASING_ITEM_STATUS.WAITING,
          },
        },
      })),
    }));
  },

  tenantApproveIngoingReport(id) {
    const now = new Date().toISOString();
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          ingoingReportApproval: {
            status: LEASING_ITEM_STATUS.DONE,
            tenantApproved: true,
            approvedAt: now,
          },
        },
      })),
    }));
  },

  updateContract(id, patch) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          agreement: {
            ...p.onboarding.agreement,
            contract: { ...p.onboarding.agreement.contract, ...patch },
          },
        },
      })),
    }));
  },
}));
