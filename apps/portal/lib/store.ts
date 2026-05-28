'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AgentPortfolioId } from '@/lib/agent-scope';
import type { AgentDocument, MessageMention, MessageThread, Property, ThreadMessage } from '@/lib/types';

export interface NotificationPrefs {
  approvals: boolean;
  urgent: boolean;
  updates: boolean;
}

export interface NewPropertyInput {
  address: string;
  suburb: string;
  homeOwnerName: string;
  homeOwnerEmail?: string;
  homeOwnerPhone?: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  leaseStatus: Property['leaseStatus'];
  rentWeekly: number;
}

interface AgentStore {
  rentReviewDecisions: Record<string, { action: 'confirmed' | 'custom'; amount?: number } | null>;
  setRentReviewDecision: (
    id: string,
    decision: { action: 'confirmed' | 'custom'; amount?: number },
  ) => void;
  sentThreadMessages: Record<string, ThreadMessage[]>;
  sendThreadMessage: (
    threadId: string,
    body: string,
    from: string,
    mentions?: MessageMention[],
  ) => ThreadMessage;
  addedProperties: Property[];
  customMessageThreads: MessageThread[];
  addProperty: (input: NewPropertyInput, agentPortfolioId: AgentPortfolioId) => Property;
  ensureMessageThread: (
    property: Property,
    agentPortfolioId: AgentPortfolioId,
    existingThreadId?: string,
  ) => string;
  onboardingDismissed: boolean;
  dismissOnboarding: () => void;
  uploadedDocuments: AgentDocument[];
  addUploadedDocument: (doc: AgentDocument) => void;
  notificationPrefs: NotificationPrefs;
  setNotificationPref: (key: keyof NotificationPrefs, value: boolean) => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set, get) => ({
      rentReviewDecisions: {},
      setRentReviewDecision: (id, decision) =>
        set((s) => ({
          rentReviewDecisions: { ...s.rentReviewDecisions, [id]: decision },
        })),
      sentThreadMessages: {},
      sendThreadMessage: (threadId, body, from, mentions) => {
        const message: ThreadMessage = {
          id: `agent-${Date.now()}`,
          at: new Date().toISOString(),
          from,
          body: body.trim(),
          channel: 'app',
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
          address: input.address.trim(),
          suburb: input.suburb.trim(),
          homeOwnerName: input.homeOwnerName.trim(),
          homeOwnerContact: {
            email: input.homeOwnerEmail?.trim() || undefined,
            phone: input.homeOwnerPhone?.trim() || undefined,
          },
          assignedAgentId: agentPortfolioId,
          tenantName: input.tenantName.trim() || 'Vacant',
          tenantContact: {
            email: input.tenantEmail?.trim() || undefined,
            phone: input.tenantPhone?.trim() || undefined,
          },
          leaseStatus: input.leaseStatus,
          rentWeekly: input.rentWeekly,
          openTasks: 0,
          inspectionStatus: 'Not scheduled',
          maintenanceStatus: 'None',
        };
        set((s) => ({ addedProperties: [property, ...s.addedProperties] }));
        return property;
      },
      ensureMessageThread: (property, agentPortfolioId, existingThreadId) => {
        if (existingThreadId) return existingThreadId;
        const custom = get().customMessageThreads.find(
          (t) => t.propertyId === property.id,
        );
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
          subject: `${property.address} — messages`,
          taskType: 'General',
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
    }),
    {
      name: 'crossub-agent-store',
      skipHydration: true,
    },
  ),
);
