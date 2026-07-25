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
import { keyCollectionFromApi } from '@/lib/leasing/key-collection-sync';
import { patchDetailFromCycleView } from '@/lib/leasing/map-cycle';
import { getLeasingDetailSeed } from '@/lib/leasing/seed';
import type { LeasingContract, LeasingPropertyDetail } from '@/lib/leasing/types';
import type { AgentKeyCollection } from '@/lib/crossub-api/agent-client';
import type { ServerLeasingCycleView } from '@/lib/leasing-cycle-types';

type LeasingWorkflowStore = {
  details: Record<string, LeasingPropertyDetail>;
  activeStepByProperty: Record<string, LeasingLifecycleStep>;
  contractDialogOpen: boolean;
  bondHighlightPropertyId: string | null;
  setContractDialogOpen: (open: boolean) => void;
  requestBondSectionHighlight: (propertyId: string) => void;
  clearBondSectionHighlight: () => void;
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
  rejectDepositProof: (id: string) => void;
  setBondLink: (id: string, link: string) => void;
  markBondPaid: (id: string) => void;
  rejectBondProof: (id: string) => void;
  confirmContract: (id: string) => void;
  recordSigning: (id: string) => void;
  rejectAgreementSigning: (id: string) => void;
  setKeyCollection: (id: string, time: string, location: string, timeEnd?: string) => void;
  /** Overlay key-collection state from `GET /agent/properties/:id/key-collection`. */
  applyKeyCollectionFromApi: (id: string, kc: AgentKeyCollection) => void;
  /** Merge a live `/leasing/cycles/:id` view into the workflow detail. */
  applyCycleView: (propertyId: string, view: ServerLeasingCycleView) => void;
  /** Drop cached workflow state after a letting is cancelled. */
  clearDetail: (propertyId: string) => void;
  scheduleIngoingInspection: (id: string, scheduledTime: string, assignee: string, inspectionId?: string) => void;
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
  contractDialogOpen: false,
  bondHighlightPropertyId: null,

  setContractDialogOpen(open) {
    set({ contractDialogOpen: open });
  },

  requestBondSectionHighlight(propertyId) {
    set({ bondHighlightPropertyId: propertyId });
  },

  clearBondSectionHighlight() {
    set({ bondHighlightPropertyId: null });
  },

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
        applicationsDetail: (p.applicationsDetail ?? []).map((a) => {
          if (a.id !== applicationId) return a;
          if (
            a.agentDecision !== LEASING_AGENT_DECISION.PENDING ||
            a.sentToAgent
          ) {
            return a;
          }
          return { ...a, selectedForAgent: !a.selectedForAgent };
        }),
      })),
    }));
  },

  sendSelectedToAgent(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        applicationsDetail: (p.applicationsDetail ?? []).map((a) =>
          a.selectedForAgent &&
          a.agentDecision === LEASING_AGENT_DECISION.PENDING &&
          !a.sentToAgent
            ? { ...a, sentToAgent: true, aiAdviceSentToAgent: true }
            : a,
        ),
      })),
    }));
  },

  setApplicantDecision(id, applicationId, decision) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        applicationsDetail: (p.applicationsDetail ?? []).map((a) =>
          a.id === applicationId
            ? { ...a, agentDecision: decision, selectedForAgent: false }
            : a,
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

  rejectDepositProof(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          deposit: {
            ...p.onboarding.deposit,
            status: LEASING_ITEM_STATUS.NOT_STARTED,
            proofFileName: undefined,
            proofUrl: undefined,
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

  rejectBondProof(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          bond: {
            ...p.onboarding.bond,
            status: LEASING_ITEM_STATUS.NOT_STARTED,
            proofFileName: undefined,
            proofUrl: undefined,
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

  rejectAgreementSigning(id) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          agreement: {
            ...p.onboarding.agreement,
            status: LEASING_ITEM_STATUS.NOT_STARTED,
            signingStatus: 'sent',
            signedAt: undefined,
          },
        },
      })),
    }));
  },

  setKeyCollection(id, time, location, timeEnd) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          keyCollection: {
            ...p.onboarding.keyCollection,
            status: LEASING_ITEM_STATUS.WAITING,
            time,
            timeEnd,
            location,
          },
        },
      })),
    }));
  },

  applyKeyCollectionFromApi(id, kc) {
    const mapped = keyCollectionFromApi(kc);
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          keyCollection: {
            ...p.onboarding.keyCollection,
            ...mapped,
          },
        },
      })),
    }));
  },

  applyCycleView(propertyId, view) {
    set((s) => {
      const current = s.details[propertyId];
      if (!current) return s;
      const next = patchDetailFromCycleView(current, view);
      return {
        details: { ...s.details, [propertyId]: next },
      };
    });
  },

  clearDetail(propertyId) {
    set((s) => {
      const { [propertyId]: _removed, ...details } = s.details;
      const { [propertyId]: _step, ...activeStepByProperty } = s.activeStepByProperty;
      return { details, activeStepByProperty };
    });
  },

  scheduleIngoingInspection(id, scheduledTime, assignee, inspectionId) {
    set((s) => ({
      details: updateDetail(s.details, id, (p) => ({
        ...p,
        onboarding: {
          ...p.onboarding,
          ingoingInspection: {
            ...p.onboarding.ingoingInspection,
            scheduledTime,
            assignee,
            inspectionId: inspectionId ?? p.onboarding.ingoingInspection.inspectionId,
            reportAvailable: Boolean(inspectionId ?? p.onboarding.ingoingInspection.inspectionId),
            status: LEASING_ITEM_STATUS.IN_PROGRESS,
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
      details: updateDetail(s.details, id, (p) => {
        const agreement = p.onboarding.agreement;
        const wasConfirmed = agreement.contract.confirmed;
        const wasOutForSigning =
          agreement.signingStatus === 'sent' || agreement.signingStatus === 'viewed';
        return {
          ...p,
          onboarding: {
            ...p.onboarding,
            agreement: {
              ...agreement,
              ...(wasOutForSigning ? { signingStatus: 'not_sent' as const } : {}),
              contract: {
                ...agreement.contract,
                ...patch,
                ...(wasConfirmed ? { confirmed: false } : {}),
              },
            },
          },
        };
      }),
    }));
  },
}));
