'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AgentPortfolioId } from '@/lib/agent-scope';
import type { BuiltinQuickActionId, CustomQuickAction } from '@/lib/quick-actions';
import type {
  OpenConductedBy,
  OpenListingContext,
} from '@/lib/open-inspection';
import type { AgentDocument, Inspection, MessageMention, MessageThread, Property, PropertyPartyContact, ThreadMessage } from '@/lib/types';
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';
import type { TenantSelectionDecision } from '@/lib/tenant-selection';
import type { ProvisionedTenantRecord } from '@/lib/provisioned-tenant-records';

export interface NotificationPrefs {
  approvals: boolean;
  urgent: boolean;
  updates: boolean;
}

export type PropertyIntakeMode = 'new' | 'transfer_in';

export type RentPeriod = 'weekly' | 'fortnightly' | 'monthly';

export interface NewPropertyInput {
  intakeMode: PropertyIntakeMode;
  agencyId?: string;
  agencyName?: string;
  agencyCompany?: string;
  address: string;
  suburb: string;
  state?: string;
  postcode?: string;
  homeOwnerName: string;
  homeOwnerEmail?: string;
  homeOwnerPhone?: string;
  additionalLandlords?: PropertyPartyContact[];
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  additionalTenants?: PropertyPartyContact[];
  leaseStatus: Property['leaseStatus'];
  rentWeekly: number;
  rentPeriod?: RentPeriod;
  leaseStart?: string;
  leaseEnd?: string;
  bedrooms?: number;
  bathrooms?: number;
  carSpaces?: number;
  furnished?: boolean;
  bondAmount?: number;
  depositAmount?: number;
  nextRentReview?: string;
  propertyType?: string;
  propertyStatus?: string;
  latitude?: number;
  longitude?: number;
  managementRatePercent?: number;
  managementRateGst?: 'include' | 'exclude';
  insuranceProvider?: string;
  landlordInsuranceExpiry?: string;
  administrationFee?: number;
  documentationFee?: number;
  lettingFee?: number;
  handoverDate?: string;
  previousAgentName?: string;
  previousAgentEmail?: string;
  pmsSource?: string;
  uploadedDocumentIds?: string[];
  buildingName?: string;
  strataPlanNumber?: string;
  buildingManagerName?: string;
  buildingManagerEmail?: string;
  buildingManagerPhone?: string;
  strataContactName?: string;
  strataContactEmail?: string;
  strataContactPhone?: string;
}

export interface NewOpenInspectionInput {
  property: Property;
  openConductedBy: OpenConductedBy;
  openListingContext: OpenListingContext;
  scheduledAt?: string;
  preferredNotes?: string;
  agentTenantNotifiedConfirmed?: boolean;
}

interface AgentStore {
  rentReviewDecisions: Record<string, { action: 'confirmed' | 'custom'; amount?: number } | null>;
  setRentReviewDecision: (
    id: string,
    decision: { action: 'confirmed' | 'custom'; amount?: number },
  ) => void;
  tenantSelectionDecisions: Record<string, TenantSelectionDecision>;
  setTenantSelectionDecision: (
    key: string,
    decision: TenantSelectionDecision,
  ) => void;
  sentThreadMessages: Record<string, ThreadMessage[]>;
  sendThreadMessage: (
    threadId: string,
    body: string,
    from: string,
    mentions?: MessageMention[],
    channel?: 'app' | 'email',
  ) => ThreadMessage;
  addedProperties: Property[];
  customMessageThreads: MessageThread[];
  addProperty: (input: NewPropertyInput, agentPortfolioId: AgentPortfolioId) => Property;
  ensureMessageThread: (
    property: Property,
    agentPortfolioId: AgentPortfolioId,
    existingThreadId?: string,
    options?: {
      category?: import('@/lib/types').MessageCategory;
      subject?: string;
      caseId?: string;
    },
  ) => string;
  onboardingDismissed: boolean;
  dismissOnboarding: () => void;
  uploadedDocuments: AgentDocument[];
  addUploadedDocument: (doc: AgentDocument) => void;
  notificationPrefs: NotificationPrefs;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
  hiddenBuiltinQuickActionIds: BuiltinQuickActionId[];
  customQuickActions: CustomQuickAction[];
  toggleBuiltinQuickAction: (id: BuiltinQuickActionId) => void;
  addCustomQuickAction: (label: string, href: string) => void;
  removeCustomQuickAction: (id: string) => void;
  resetQuickActions: () => void;
  addedInspections: Inspection[];
  addOpenInspection: (input: NewOpenInspectionInput) => Inspection;
  registerInspection: (inspection: Inspection) => void;
  provisionedTenants: ProvisionedTenantRecord[];
  addProvisionedTenant: (record: ProvisionedTenantRecord) => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      rentReviewDecisions: {},
      setRentReviewDecision: (id, decision) =>
        set((s) => ({
          rentReviewDecisions: { ...s.rentReviewDecisions, [id]: decision },
        })),
      tenantSelectionDecisions: {},
      setTenantSelectionDecision: (key, decision) =>
        set((s) => ({
          tenantSelectionDecisions: { ...s.tenantSelectionDecisions, [key]: decision },
        })),
      sentThreadMessages: {},
      sendThreadMessage: (threadId, body, from, mentions, channel) => {
        const message: ThreadMessage = {
          id: `agent-${Date.now()}`,
          at: new Date().toISOString(),
          from,
          body: body.trim(),
          channel: channel ?? 'app',
          sentByAgent: true,
          mentions,
        };
        set((s) => ({
          sentThreadMessages: {
            ...s.sentThreadMessages,
            [threadId]: [...(s.sentThreadMessages[threadId] ?? []), message],
          },
        }));
        return message;
      },
      addedProperties: [],
      customMessageThreads: [],
      addProperty: (input, agentPortfolioId) => {
        const property: Property = {
          id: `prop-agent-${Date.now()}`,
          intakeMode: input.intakeMode,
          agencyId: input.agencyId,
          address: input.address.trim(),
          suburb: input.suburb.trim(),
          state: input.state?.trim() || undefined,
          postcode: input.postcode?.trim() || undefined,
          homeOwnerName: input.homeOwnerName.trim(),
          homeOwnerContact: {
            email: input.homeOwnerEmail?.trim() || undefined,
            phone: input.homeOwnerPhone?.trim() || undefined,
          },
          additionalLandlords: input.additionalLandlords?.length
            ? input.additionalLandlords
            : undefined,
          assignedAgentId: agentPortfolioId,
          tenantName: input.tenantName.trim() || 'Vacant',
          tenantContact: {
            email: input.tenantEmail?.trim() || undefined,
            phone: input.tenantPhone?.trim() || undefined,
          },
          additionalTenants: input.additionalTenants?.length ? input.additionalTenants : undefined,
          leaseStatus: input.leaseStatus,
          rentWeekly: input.rentWeekly,
          leaseStart: input.leaseStart,
          leaseEnd: input.leaseEnd,
          bondAmount: input.bondAmount,
          depositAmount: input.depositAmount,
          nextRentReview: input.nextRentReview,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          carSpaces: input.carSpaces,
          furnished: input.furnished,
          propertyType: input.propertyType,
          managementRatePercent: input.managementRatePercent,
          managementRateGst: input.managementRateGst,
          landlordInsuranceExpiry: input.landlordInsuranceExpiry,
          administrationFee: input.administrationFee,
          documentationFee: input.documentationFee,
          lettingFee: input.lettingFee,
          insuranceProvider: input.insuranceProvider,
          handoverDate: input.handoverDate,
          previousAgentName: input.previousAgentName,
          previousAgentEmail: input.previousAgentEmail,
          pmsSource: input.pmsSource,
          buildingName: input.buildingName,
          strataPlanNumber: input.strataPlanNumber,
          openTasks: 0,
          inspectionStatus: 'Not scheduled',
          maintenanceStatus: 'None',
        };
        set((s) => ({ addedProperties: [property, ...s.addedProperties] }));
        return property;
      },
      ensureMessageThread: (property, agentPortfolioId, existingThreadId, options) => {
        if (existingThreadId) return existingThreadId;
        const category = options?.category ?? 'Others';
        const custom = get().customMessageThreads.find((t) => {
          if (t.propertyId !== property.id) return false;
          if (options?.caseId) return t.relatedCaseId === options.caseId;
          return t.messageCategory === category || t.taskType === category;
        });
        if (custom) return custom.id;

        const thread: MessageThread = {
          id: `msg-${property.id}-${Date.now()}`,
          assignedAgentId: agentPortfolioId,
          propertyId: property.id,
          propertyAddress: `${property.address}, ${property.suburb}`,
          homeOwnerName: property.homeOwnerName,
          homeOwnerContact: property.homeOwnerContact,
          tenantName: property.tenantName,
          tenantContact: property.tenantContact,
          subject: options?.subject ?? `${property.address} — ${category}`,
          taskType: category,
          messageCategory: category,
          relatedCaseId: options?.caseId,
          lastMessage: 'Start a conversation',
          lastAt: new Date().toISOString(),
          unread: 0,
          channel: 'app',
          messages: [],
        };
        set((s) => ({
          customMessageThreads: [...s.customMessageThreads, thread],
        }));
        return thread.id;
      },
      onboardingDismissed: false,
      dismissOnboarding: () => set({ onboardingDismissed: true }),
      uploadedDocuments: [],
      addUploadedDocument: (doc) =>
        set((s) => ({ uploadedDocuments: [doc, ...s.uploadedDocuments] })),
      notificationPrefs: { approvals: true, urgent: true, updates: true },
      setNotificationPref: (key, value) =>
        set((s) => ({
          notificationPrefs: { ...s.notificationPrefs, [key]: value },
        })),
      hiddenBuiltinQuickActionIds: [],
      customQuickActions: [],
      toggleBuiltinQuickAction: (id) =>
        set((s) => {
          const hidden = s.hiddenBuiltinQuickActionIds;
          const next = hidden.includes(id)
            ? hidden.filter((x) => x !== id)
            : [...hidden, id];
          return { hiddenBuiltinQuickActionIds: next };
        }),
      addCustomQuickAction: (label, href) => {
        const trimmedLabel = label.trim();
        const trimmedHref = href.trim();
        if (!trimmedLabel || !trimmedHref) return;
        const action: CustomQuickAction = {
          id: `custom-${Date.now()}`,
          label: trimmedLabel,
          href: trimmedHref.startsWith('/') ? trimmedHref : `/${trimmedHref}`,
        };
        set((s) => ({ customQuickActions: [...s.customQuickActions, action] }));
      },
      removeCustomQuickAction: (id) =>
        set((s) => ({
          customQuickActions: s.customQuickActions.filter((a) => a.id !== id),
        })),
      resetQuickActions: () =>
        set({ hiddenBuiltinQuickActionIds: [], customQuickActions: [] }),
      addedInspections: [],
      addOpenInspection: (input) => {
        const now = new Date().toISOString();
        const id = `insp-agent-${Date.now()}`;
        const trackingNumber = inspectionReferenceLabel(id, 'OPEN');
        const { property, openConductedBy, openListingContext, scheduledAt, preferredNotes } =
          input;
        const isSelf = openConductedBy === 'agent';
        const isOccupied = openListingContext === 'occupied';

        const status = isSelf
          ? isOccupied && !input.agentTenantNotifiedConfirmed
            ? 'Awaiting tenant notice'
            : 'Agent scheduled'
          : 'Requested — CROSSUB scheduling';

        const timeline: Inspection['timeline'] = [
          {
            id: `${id}-created`,
            at: now,
            actor: 'Agent',
            actorRole: 'agent',
            source: 'app',
            title: isSelf
              ? 'Self open inspection requested by agent'
              : 'Open inspection requested — CROSSUB will arrange',
            detail: isSelf
              ? isOccupied
                ? 'Agent responsible for notifying tenant of date and time.'
                : 'Agent responsible for promoting and contacting prospects.'
              : preferredNotes?.trim() || 'CROSSUB will contact tenant and arrange timing.',
          },
        ];

        if (isSelf && input.agentTenantNotifiedConfirmed) {
          timeline.push({
            id: `${id}-tenant-notified`,
            at: now,
            actor: 'Agent',
            actorRole: 'agent',
            source: 'app',
            title: 'Agent confirmed tenant notified',
            detail: scheduledAt
              ? `Open scheduled for ${scheduledAt}`
              : 'Tenant notified of open inspection timing.',
          });
        }

        const inspection: Inspection = {
          id,
          trackingNumber,
          type: 'OPEN',
          propertyId: property.id,
          propertyAddress: `${property.address}, ${property.suburb}`,
          status,
          reportStatus: 'pending',
          openConductedBy,
          openListingContext,
          scheduledAt: scheduledAt || undefined,
          inspector: isSelf ? 'Agent (self)' : undefined,
          agentTenantNotifiedAt:
            isSelf && input.agentTenantNotifiedConfirmed ? now : undefined,
          agentTenantNotifiedConfirmed: isSelf ? input.agentTenantNotifiedConfirmed : undefined,
          tenantAck: isSelf && isOccupied ? 'pending' : undefined,
          timeline,
        };

        set((s) => ({ addedInspections: [inspection, ...s.addedInspections] }));
        return inspection;
      },
      registerInspection: (inspection) =>
        set((s) => ({
          addedInspections: [
            inspection,
            ...s.addedInspections.filter((row) => row.id !== inspection.id),
          ],
        })),
      provisionedTenants: [],
      addProvisionedTenant: (record) =>
        set((s) => {
          const withoutDuplicate = s.provisionedTenants.filter(
            (t) => t.id !== record.id && t.email !== record.email,
          );
          return { provisionedTenants: [record, ...withoutDuplicate] };
        }),
    }),
    {
      name: 'crossub-agent-store',
      skipHydration: true,
    },
  ),
);
