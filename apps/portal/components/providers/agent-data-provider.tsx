'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import {
  approveMaintenanceQuotation,
  declineMaintenanceQuotation,
  fetchMaintenanceKpis,
  fetchMaintenanceState,
} from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceState } from '@/lib/crossub-api/types';
import {
  filterByPropertyIds,
  resolveAgentPortfolioId,
  type AgentPortfolioId,
} from '@/lib/agent-scope';
import {
  maintenanceNotificationsToAgent,
  mapApiMaintenanceRequest,
  type MappedMaintenance,
} from '@/lib/data/map-maintenance';
import {
  ACCOUNTING,
  DASHBOARD_ITEMS,
  DOCUMENTS,
  INSPECTIONS,
  LEASING_RECORDS,
  MAINTENANCE as DEMO_MAINTENANCE,
  MESSAGE_THREADS,
  NOTIFICATIONS as DEMO_NOTIFICATIONS,
  PROPERTIES,
  RENT_REVIEWS,
  TENANT_SELECTIONS,
  TRIBUNAL_CASES,
  VACATING,
} from '@/lib/mock-data';
import { buildDashboardKpis } from '@/lib/dashboard-kpis';
import { buildNeedActionGroups } from '@/lib/need-action-groups';
import { buildRemindingQueue, getPropertyNeedActions } from '@/lib/property-actions';
import { buildSectionStatus } from '@/lib/section-status';
import { buildTaskStatusList } from '@/lib/task-status-list';
import { useAgentStore } from '@/lib/store';
import { displayName } from '@/lib/utils';
import type {
  AgentDocument,
  AgentNotification,
  DashboardItem,
  DashboardKpis,
  Inspection,
  LeasingRecord,
  MaintenanceRequest,
  MessageCategory,
  MessageMention,
  MessageThread,
  Property,
  PropertyAccounting,
  NeedActionGroup,
  PropertyNeedAction,
  RentReviewCase,
  TribunalCase,
  SectionStatus,
  TaskStatusItem,
  TenantSelectionCase,
  ThreadMessage,
  VacatingCase,
} from '@/lib/types';
import { maintenanceDetail, tenantSelectionDetail, ROUTES } from '@/constants/routes';

function normalizeSentMessages(value: unknown): ThreadMessage[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (m): m is ThreadMessage =>
      m != null &&
      typeof m === 'object' &&
      typeof (m as ThreadMessage).at === 'string' &&
      typeof (m as ThreadMessage).body === 'string' &&
      typeof (m as ThreadMessage).from === 'string',
  );
}

interface AgentDataContextValue {
  loading: boolean;
  apiConnected: boolean;
  apiError: string | null;
  agentPortfolioId: AgentPortfolioId;
  refresh: () => Promise<void>;
  maintenanceFromApi: MappedMaintenance[];
  maintenanceAll: MaintenanceRequest[];
  maintenanceKpis: { total: number; overdue: number; breachRate: number } | null;
  properties: Property[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  vacating: VacatingCase[];
  tenantSelections: TenantSelectionCase[];
  messages: MessageThread[];
  documents: AgentDocument[];
  notifications: AgentNotification[];
  dashboardItems: DashboardItem[];
  sectionStatus: SectionStatus[];
  taskStatusList: TaskStatusItem[];
  dashboardKpis: DashboardKpis;
  leasingRecords: LeasingRecord[];
  accounting: PropertyAccounting[];
  needActionItems: PropertyNeedAction[];
  needActionGroups: NeedActionGroup[];
  tribunalCases: TribunalCase[];
  /** @deprecated use needActionItems */
  remindingItems: PropertyNeedAction[];
  getPropertyActions: (propertyId: string) => PropertyNeedAction[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  uploadDocument: (file: File, category: AgentDocument['category'], propertyAddress: string) => void;
  sendMessage: (threadId: string, body: string, mentions?: MessageMention[]) => void;
  ensureMessageThread: (
    propertyId: string,
    options?: { category?: MessageCategory; subject?: string },
  ) => string;
  addProperty: (input: import('@/lib/store').NewPropertyInput) => Property;
  addOpenInspection: (input: import('@/lib/store').NewOpenInspectionInput) => Inspection;
  approveMaintenanceQuote: (quotationId: string) => Promise<void>;
  declineMaintenanceQuote: (quotationId: string, reason: string) => Promise<void>;
}

const AgentDataContext = createContext<AgentDataContextValue | null>(null);

function buildDashboardFromApi(
  apiItems: MappedMaintenance[],
  kpis: { overdue: number } | null,
): DashboardItem[] {
  const fromApi: DashboardItem[] = apiItems
    .filter((m) => m.requiresApproval)
    .map((m) => ({
      id: `api-${m.id}`,
      module: 'maintenance' as const,
      propertyId: m.propertyId,
      propertyAddress: m.propertyAddress,
      title: `Approve ${m.title} quote`,
      subtitle: m.contractorName
        ? `${m.contractorName}${m.quoteAmount ? ` — $${m.quoteAmount.toLocaleString()}` : ''}`
        : 'Quote pending',
      priority: m.priority,
      status: m.status,
      requiresApproval: true,
      href: maintenanceDetail(m.id),
      updatedAt: new Date().toISOString(),
      source: 'api' as const,
    }));

  if (kpis && kpis.overdue > 0) {
    fromApi.unshift({
      id: 'api-overdue',
      module: 'maintenance',
      propertyId: 'api',
      propertyAddress: 'Portfolio',
      title: `${kpis.overdue} maintenance item(s) overdue`,
      subtitle: 'CROSSUB has been notified',
      priority: 'urgent',
      status: 'Overdue',
      overdueHours: 24,
      requiresApproval: false,
      href: ROUTES.MAINTENANCE,
      updatedAt: new Date().toISOString(),
      source: 'api' as const,
    });
  }

  return fromApi;
}

export function AgentDataProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const agentPortfolioId = resolveAgentPortfolioId(user);
  const sentThreadMessages = useAgentStore((s) => s.sentThreadMessages);
  const sendThreadMessage = useAgentStore((s) => s.sendThreadMessage);
  const addedProperties = useAgentStore((s) => s.addedProperties);
  const addedInspections = useAgentStore((s) => s.addedInspections);
  const customMessageThreads = useAgentStore((s) => s.customMessageThreads);
  const storeAddProperty = useAgentStore((s) => s.addProperty);
  const storeAddOpenInspection = useAgentStore((s) => s.addOpenInspection);
  const storeEnsureMessageThread = useAgentStore((s) => s.ensureMessageThread);
  const uploadedDocuments = useAgentStore((s) => s.uploadedDocuments);
  const addUploadedDocument = useAgentStore((s) => s.addUploadedDocument);

  const [apiState, setApiState] = useState<ApiMaintenanceState | null>(null);
  const [kpis, setKpis] = useState<{
    total: number;
    overdue: number;
    breachRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const [state, kpiData] = await Promise.all([
        fetchMaintenanceState(),
        fetchMaintenanceKpis('agent'),
      ]);
      setApiState(state);
      setKpis(kpiData);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to reach crossub_web API');
      setApiState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve(useAgentStore.persist.rehydrate()).catch(() => {
      try {
        localStorage.removeItem('crossub-agent-store');
      } catch {
        // ignore
      }
    });
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authed') {
      setLoading(false);
      setApiState(null);
      setKpis(null);
      setApiError(null);
      return;
    }
    void refresh();
  }, [refresh, status]);

  const properties = useMemo(() => {
    const demo = PROPERTIES.filter((p) => p.assignedAgentId === agentPortfolioId);
    const added = addedProperties.filter((p) => p.assignedAgentId === agentPortfolioId);
    return [...added, ...demo];
  }, [agentPortfolioId, addedProperties]);

  const propertyIds = useMemo(
    () => new Set(properties.map((p) => p.id)),
    [properties],
  );

  const maintenanceFromApi = useMemo(() => {
    if (!apiState?.maintenanceRequests?.length) return [];
    try {
      const contractors = apiState.contractors ?? [];
      const quotations = apiState.quotations ?? [];
      const auditLog = apiState.maintenanceAuditLog ?? [];
      const notifications = apiState.maintenanceNotifications ?? [];
      return apiState.maintenanceRequests.map((req) =>
        mapApiMaintenanceRequest(
          req,
          contractors,
          quotations,
          auditLog,
          notifications,
        ),
      );
    } catch (err) {
      console.error('[Agent portal] failed to map maintenance API data', err);
      return [];
    }
  }, [apiState]);

  const maintenanceAll = useMemo(() => {
    const demoIds = new Set(DEMO_MAINTENANCE.map((m) => m.id));
    const apiOnly = maintenanceFromApi.filter((m) => !demoIds.has(m.id));
    const merged = [
      ...apiOnly,
      ...DEMO_MAINTENANCE.map((m) => ({ ...m, source: 'demo' as const })),
    ];
    return filterByPropertyIds(merged, propertyIds);
  }, [maintenanceFromApi, propertyIds]);

  const inspections = useMemo(() => {
    const demo = filterByPropertyIds(INSPECTIONS, propertyIds);
    const added = filterByPropertyIds(addedInspections, propertyIds);
    return [...added, ...demo];
  }, [propertyIds, addedInspections]);

  const rentReviews = useMemo(
    () => filterByPropertyIds(RENT_REVIEWS, propertyIds),
    [propertyIds],
  );

  const vacating = useMemo(
    () => filterByPropertyIds(VACATING, propertyIds),
    [propertyIds],
  );

  const tenantSelections = useMemo(
    () => filterByPropertyIds(TENANT_SELECTIONS, propertyIds),
    [propertyIds],
  );

  const leasingRecords = useMemo(
    () => filterByPropertyIds(LEASING_RECORDS, propertyIds),
    [propertyIds],
  );

  const accounting = useMemo(
    () => ACCOUNTING.filter((a) => propertyIds.has(a.propertyId)),
    [propertyIds],
  );

  const tribunalCases = useMemo(
    () => filterByPropertyIds(TRIBUNAL_CASES, propertyIds),
    [propertyIds],
  );

  const messages = useMemo(() => {
    const demoThreads = MESSAGE_THREADS.filter(
      (m) => m.assignedAgentId === agentPortfolioId,
    );
    const customThreads = customMessageThreads.filter(
      (m) => m.assignedAgentId === agentPortfolioId,
    );
    const byKey = new Map<string, (typeof demoThreads)[0]>();
    for (const thread of [...demoThreads, ...customThreads]) {
      const category = thread.messageCategory ?? thread.taskType ?? 'Others';
      const key = thread.propertyId ? `${thread.propertyId}::${category}` : thread.id;
      if (!byKey.has(key)) byKey.set(key, thread);
    }

    return [...byKey.values()].map((thread) => {
      const prop = thread.propertyId
        ? properties.find((p) => p.id === thread.propertyId)
        : properties.find((p) => thread.propertyAddress.includes(p.address));
      const sent = normalizeSentMessages(sentThreadMessages[thread.id]);
      const allMessages = [...thread.messages, ...sent].sort((a, b) =>
        (a.at ?? '').localeCompare(b.at ?? ''),
      );
      const last = allMessages[allMessages.length - 1];
      return {
        ...thread,
        propertyId: prop?.id ?? thread.propertyId,
        homeOwnerName: prop?.homeOwnerName ?? thread.homeOwnerName,
        homeOwnerContact:
          prop?.homeOwnerContact ?? thread.homeOwnerContact ?? {},
        tenantName: prop?.tenantName ?? thread.tenantName,
        tenantContact: prop?.tenantContact ?? thread.tenantContact ?? {},
        messages: allMessages,
        lastMessage: last?.body ?? thread.lastMessage,
        lastAt: last?.at ?? thread.lastAt,
      };
    });
  }, [agentPortfolioId, properties, sentThreadMessages, customMessageThreads]);

  const sendMessage = useCallback(
    (threadId: string, body: string, mentions?: MessageMention[]) => {
      const from = user ? displayName(user) : 'Agent';
      sendThreadMessage(threadId, body, from, mentions);
    },
    [user, sendThreadMessage],
  );

  const ensureMessageThread = useCallback(
    (
      propertyId: string,
      options?: { category?: MessageCategory; subject?: string },
    ) => {
      const property = properties.find((p) => p.id === propertyId);
      if (!property) return '';
      const existing = messages.find(
        (m) =>
          m.propertyId === propertyId &&
          (!options?.category ||
            m.messageCategory === options.category ||
            m.taskType === options.category),
      );
      return storeEnsureMessageThread(
        property,
        agentPortfolioId,
        existing?.id,
        options,
      );
    },
    [properties, messages, agentPortfolioId, storeEnsureMessageThread],
  );

  const addProperty = useCallback(
    (input: import('@/lib/store').NewPropertyInput) =>
      storeAddProperty(input, agentPortfolioId),
    [storeAddProperty, agentPortfolioId],
  );

  const addOpenInspection = useCallback(
    (input: import('@/lib/store').NewOpenInspectionInput) =>
      storeAddOpenInspection(input),
    [storeAddOpenInspection],
  );

  const uploadDocument = useCallback(
    (file: File, category: AgentDocument['category'], propertyAddress: string) => {
      const doc: AgentDocument = {
        id: `upload-${Date.now()}`,
        title: file.name,
        propertyAddress,
        category,
        uploadedAt: new Date().toISOString(),
        href: '#',
        downloadUrl: '#',
      };
      addUploadedDocument(doc);
    },
    [addUploadedDocument],
  );

  const documents = useMemo(() => {
    const prefixes = properties.map((p) => p.address.split(',')[0]);
    const demo = DOCUMENTS.filter((d) =>
      prefixes.some((a) => d.propertyAddress.includes(a)),
    );
    const uploaded = uploadedDocuments.filter((d) =>
      prefixes.some((a) => d.propertyAddress.includes(a) || d.propertyAddress === 'Portfolio'),
    );
    return [...uploaded, ...demo];
  }, [properties, uploadedDocuments]);

  const notifications = useMemo(() => {
    try {
      const apiNotifs = apiState
        ? maintenanceNotificationsToAgent(
            apiState.maintenanceNotifications ?? [],
            apiState.maintenanceRequests ?? [],
          )
        : [];
      const demo = DEMO_NOTIFICATIONS.map((n) => ({ ...n, source: 'demo' as const }));
      const seen = new Set<string>();
      return [...apiNotifs, ...demo]
        .filter((n) => {
          if (seen.has(n.id)) return false;
          seen.add(n.id);
          return true;
        })
        .map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
    } catch (err) {
      console.error('[Agent portal] failed to build notifications', err);
      return DEMO_NOTIFICATIONS.map((n) => ({ ...n, source: 'demo' as const }));
    }
  }, [apiState, readIds]);

  const dashboardItems = useMemo(() => {
    const apiDash = buildDashboardFromApi(maintenanceFromApi, kpis);
    const tenantDash: DashboardItem[] = tenantSelections
      .filter((t) => t.requiresApproval)
      .map((t) => ({
        id: t.id,
        module: 'maintenance',
        propertyId: t.propertyId,
        propertyAddress: t.propertyAddress,
        title: `Approve tenant: ${t.applicantName}`,
        subtitle: `${t.proposedRent}/wk · ${t.leaseTerm}`,
        priority: 'high',
        status: t.status,
        requiresApproval: true,
        href: tenantSelectionDetail(t.id),
        updatedAt: new Date().toISOString(),
        source: 'demo' as const,
      }));
    const demoDash = filterByPropertyIds(DASHBOARD_ITEMS, propertyIds);
    return [...apiDash, ...tenantDash, ...demoDash];
  }, [maintenanceFromApi, kpis, tenantSelections, propertyIds]);

  const sectionStatus = useMemo(
    () =>
      buildSectionStatus({
        maintenance: maintenanceAll,
        inspections,
        rentReviews,
        vacating,
        maintenanceOverdue: kpis?.overdue,
      }),
    [maintenanceAll, inspections, rentReviews, vacating, kpis],
  );

  const taskStatusList = useMemo(
    () =>
      buildTaskStatusList({
        maintenance: maintenanceAll,
        inspections,
        rentReviews,
        vacating,
      }),
    [maintenanceAll, inspections, rentReviews, vacating],
  );

  const dashboardKpis = useMemo(
    () =>
      buildDashboardKpis({
        properties,
        maintenance: maintenanceAll,
        inspections,
        rentReviews,
        tenantSelections,
        accounting,
        tribunalCases,
      }),
    [properties, maintenanceAll, inspections, rentReviews, tenantSelections, accounting, tribunalCases],
  );

  const getPropertyActions = useCallback(
    (propertyId: string) => {
      const property = properties.find((p) => p.id === propertyId);
      if (!property) return [];
      return getPropertyNeedActions(property, {
        maintenance: maintenanceAll,
        inspections,
        rentReviews,
        tenantSelections,
        tribunalCases,
        accounting: accounting.find((a) => a.propertyId === propertyId),
        documents,
      });
    },
    [properties, maintenanceAll, inspections, rentReviews, tenantSelections, tribunalCases, accounting, documents],
  );

  const needActionItems = useMemo(
    () =>
      buildRemindingQueue(properties, (p) =>
        getPropertyNeedActions(p, {
          maintenance: maintenanceAll,
          inspections,
          rentReviews,
          tenantSelections,
          tribunalCases,
          accounting: accounting.find((a) => a.propertyId === p.id),
          documents,
        }),
      ),
    [properties, maintenanceAll, inspections, rentReviews, tenantSelections, tribunalCases, accounting, documents],
  );

  const needActionGroups = useMemo(
    () => buildNeedActionGroups(needActionItems),
    [needActionItems],
  );

  const approveMaintenanceQuote = useCallback(
    async (quotationId: string) => {
      const state = await approveMaintenanceQuotation(quotationId, 'agent');
      setApiState(state);
    },
    [],
  );

  const declineMaintenanceQuote = useCallback(
    async (quotationId: string, reason: string) => {
      const state = await declineMaintenanceQuotation(quotationId, reason, 'agent');
      setApiState(state);
    },
    [],
  );

  const value: AgentDataContextValue = {
    loading,
    apiConnected: apiState != null,
    apiError,
    agentPortfolioId,
    refresh,
    maintenanceFromApi,
    maintenanceAll,
    maintenanceKpis: kpis,
    properties,
    inspections,
    rentReviews,
    vacating,
    tenantSelections,
    messages,
    documents,
    notifications,
    dashboardItems,
    sectionStatus,
    taskStatusList,
    dashboardKpis,
    leasingRecords,
    accounting,
    needActionItems,
    needActionGroups,
    tribunalCases,
    remindingItems: needActionItems,
    getPropertyActions,
    markNotificationRead: (id) =>
      setReadIds((prev) => new Set(prev).add(id)),
    markAllNotificationsRead: () =>
      setReadIds((prev) => {
        const next = new Set(prev);
        for (const n of notifications) next.add(n.id);
        return next;
      }),
    sendMessage,
    ensureMessageThread,
    addProperty,
    addOpenInspection,
    uploadDocument,
    approveMaintenanceQuote,
    declineMaintenanceQuote,
  };

  return (
    <AgentDataContext.Provider value={value}>{children}</AgentDataContext.Provider>
  );
}

export function useAgentData(): AgentDataContextValue {
  const ctx = useContext(AgentDataContext);
  if (!ctx) {
    throw new Error('useAgentData must be used within AgentDataProvider');
  }
  return ctx;
}
