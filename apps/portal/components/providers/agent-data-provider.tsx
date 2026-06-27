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
  approveMaintenance as apiApproveMaintenance,
  declineMaintenance as apiDeclineMaintenance,
  fetchPortfolio,
  fetchProperties,
  type AgentPortfolio,
} from '@/lib/crossub-api/agent-client';
import {
  mapAgentAccounting,
  mapAgentInspections,
  mapAgentLeasing,
  mapAgentMaintenance,
  mapAgentProperties,
  mapAgentRentReviews,
  mapAgentTenantSelections,
  mapAgentTribunal,
  mapAgentVacating,
} from '@/lib/crossub-api/agent-mappers';
import { MAINTENANCE_STATUS } from '@/constants/api-enums';
import {
  filterByPropertyIds,
  resolveAgentPortfolioId,
  type AgentPortfolioId,
} from '@/lib/agent-scope';
import {
  applyTenantSelectionDecision,
  tenantSelectionDecisionKey,
} from '@/lib/tenant-selection';
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

function messageThreadKey(thread: {
  id: string;
  propertyId?: string;
  messageCategory?: MessageCategory;
  taskType?: string;
  relatedCaseId?: string;
}): string {
  const category = thread.messageCategory ?? thread.taskType ?? 'Others';
  if (!thread.propertyId) return thread.id;
  if (thread.relatedCaseId) {
    return `${thread.propertyId}::${category}::${thread.relatedCaseId}`;
  }
  return `${thread.propertyId}::${category}`;
}

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

/** Lightweight ref the maintenance approve/decline UI keys off — `submittedQuotationId`
 * is the request id to act on when a quote is pending (status QUOTING). */
interface AgentApiMaintenanceRef {
  id: string;
  submittedQuotationId?: string;
}

interface AgentDataContextValue {
  loading: boolean;
  apiConnected: boolean;
  apiError: string | null;
  agentPortfolioId: AgentPortfolioId;
  refresh: () => Promise<void>;
  maintenanceFromApi: AgentApiMaintenanceRef[];
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
  sendMessage: (
    threadId: string,
    body: string,
    mentions?: MessageMention[],
    channel?: 'app' | 'email',
  ) => void;
  ensureMessageThread: (
    propertyId: string,
    options?: { category?: MessageCategory; subject?: string; caseId?: string },
  ) => string;
  addProperty: (input: import('@/lib/store').NewPropertyInput) => Property;
  addOpenInspection: (input: import('@/lib/store').NewOpenInspectionInput) => Inspection;
  approveMaintenanceQuote: (requestId: string) => Promise<void>;
  declineMaintenanceQuote: (requestId: string, reason: string) => Promise<void>;
}

const AgentDataContext = createContext<AgentDataContextValue | null>(null);

/** Dashboard cards for the maintenance quotes the agent needs to approve. */
function buildMaintenanceDashboard(items: MaintenanceRequest[]): DashboardItem[] {
  return items
    .filter((m) => m.requiresApproval)
    .map((m) => ({
      id: `maint-${m.id}`,
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
  const tenantSelectionDecisions = useAgentStore((s) => s.tenantSelectionDecisions);

  // The live agent facade: properties come pre-mapped (the mapping needs the portfolio
  // id); the operational portfolio is held raw and mapped per-domain in the memos below.
  // Both null = not loaded / failed → every domain falls back to its demo seed (the app
  // never blanks). They are fetched together so real properties + real domains stay
  // coherently keyed by the same real property ids.
  const [apiProperties, setApiProperties] = useState<Property[] | null>(null);
  const [portfolio, setPortfolio] = useState<AgentPortfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (status !== 'authed') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const [props, port] = await Promise.all([
        fetchProperties(),
        fetchPortfolio(),
      ]);
      setApiProperties(mapAgentProperties(props, agentPortfolioId));
      setPortfolio(port);
      setApiConnected(true);
    } catch (err) {
      setApiConnected(false);
      setApiProperties(null);
      setPortfolio(null);
      setApiError(
        err instanceof Error
          ? err.message
          : 'Unable to reach CROSSUB API — using demo data',
      );
    } finally {
      setLoading(false);
    }
  }, [status, agentPortfolioId]);

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
      setApiProperties(null);
      setPortfolio(null);
      setApiError(null);
      return;
    }
    void refresh();
  }, [refresh, status]);

  const properties = useMemo(() => {
    const base =
      apiProperties ??
      PROPERTIES.filter((p) => p.assignedAgentId === agentPortfolioId);
    const added = addedProperties.filter(
      (p) => p.assignedAgentId === agentPortfolioId,
    );
    return [...added, ...base];
  }, [apiProperties, agentPortfolioId, addedProperties]);

  const propertyIds = useMemo(
    () => new Set(properties.map((p) => p.id)),
    [properties],
  );

  const maintenanceAll = useMemo(() => {
    if (portfolio) return mapAgentMaintenance(portfolio.maintenance);
    return filterByPropertyIds(
      DEMO_MAINTENANCE.map((m) => ({ ...m, source: 'demo' as const })),
      propertyIds,
    );
  }, [portfolio, propertyIds]);

  const maintenanceFromApi = useMemo<AgentApiMaintenanceRef[]>(
    () =>
      (portfolio?.maintenance ?? []).map((m) => ({
        id: m.id,
        submittedQuotationId:
          m.status === MAINTENANCE_STATUS.QUOTING ? m.id : undefined,
      })),
    [portfolio],
  );

  const maintenanceKpis = useMemo(() => {
    if (!portfolio) return null;
    const rows = portfolio.maintenance;
    const overdue = rows.filter(
      (m) =>
        m.urgent &&
        m.status !== MAINTENANCE_STATUS.COMPLETED &&
        m.status !== MAINTENANCE_STATUS.CANCELLED,
    ).length;
    return {
      total: rows.length,
      overdue,
      breachRate: rows.length ? overdue / rows.length : 0,
    };
  }, [portfolio]);

  const inspections = useMemo(() => {
    const base = portfolio
      ? mapAgentInspections(portfolio.inspections)
      : filterByPropertyIds(INSPECTIONS, propertyIds);
    const added = filterByPropertyIds(addedInspections, propertyIds);
    return [...added, ...base];
  }, [portfolio, propertyIds, addedInspections]);

  const rentReviews = useMemo(
    () =>
      portfolio
        ? mapAgentRentReviews(portfolio.rentReviews)
        : filterByPropertyIds(RENT_REVIEWS, propertyIds),
    [portfolio, propertyIds],
  );

  const vacating = useMemo(
    () =>
      portfolio
        ? mapAgentVacating(portfolio.vacating)
        : filterByPropertyIds(VACATING, propertyIds),
    [portfolio, propertyIds],
  );

  const tenantSelections = useMemo(() => {
    const base = portfolio
      ? mapAgentTenantSelections(portfolio.tenantSelections)
      : filterByPropertyIds(TENANT_SELECTIONS, propertyIds);
    return base.map((selection) => {
      const key = tenantSelectionDecisionKey(selection.propertyId, selection.id);
      return applyTenantSelectionDecision(
        selection,
        tenantSelectionDecisions[key],
      );
    });
  }, [portfolio, propertyIds, tenantSelectionDecisions]);

  const leasingRecords = useMemo(
    () =>
      portfolio
        ? mapAgentLeasing(portfolio.leasing)
        : filterByPropertyIds(LEASING_RECORDS, propertyIds),
    [portfolio, propertyIds],
  );

  const accounting = useMemo(
    () =>
      portfolio
        ? mapAgentAccounting(portfolio.accounting)
        : ACCOUNTING.filter((a) => propertyIds.has(a.propertyId)),
    [portfolio, propertyIds],
  );

  const tribunalCases = useMemo(
    () =>
      portfolio
        ? mapAgentTribunal(portfolio.tribunal)
        : filterByPropertyIds(TRIBUNAL_CASES, propertyIds),
    [portfolio, propertyIds],
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
      byKey.set(messageThreadKey(thread), thread);
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
    (threadId: string, body: string, mentions?: MessageMention[], channel?: 'app' | 'email') => {
      const from = user ? displayName(user) : 'Agent';
      sendThreadMessage(threadId, body, from, mentions, channel);
    },
    [user, sendThreadMessage],
  );

  const ensureMessageThread = useCallback(
    (
      propertyId: string,
      options?: { category?: MessageCategory; subject?: string; caseId?: string },
    ) => {
      const property = properties.find((p) => p.id === propertyId);
      if (!property) return '';
      const existing = messages.find((m) => {
        if (m.propertyId !== propertyId) return false;
        if (options?.caseId) return m.relatedCaseId === options.caseId;
        if (!options?.category) return true;
        return m.messageCategory === options.category || m.taskType === options.category;
      });
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

  const notifications = useMemo(
    () =>
      DEMO_NOTIFICATIONS.map((n) => ({
        ...n,
        source: 'demo' as const,
        read: n.read || readIds.has(n.id),
      })),
    [readIds],
  );

  const dashboardItems = useMemo(() => {
    const maintDash = buildMaintenanceDashboard(maintenanceAll);
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
    const demoDash = portfolio
      ? []
      : filterByPropertyIds(DASHBOARD_ITEMS, propertyIds);
    return [...maintDash, ...tenantDash, ...demoDash];
  }, [maintenanceAll, tenantSelections, portfolio, propertyIds]);

  const sectionStatus = useMemo(
    () =>
      buildSectionStatus({
        maintenance: maintenanceAll,
        inspections,
        rentReviews,
        vacating,
        maintenanceOverdue: maintenanceKpis?.overdue,
      }),
    [maintenanceAll, inspections, rentReviews, vacating, maintenanceKpis],
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
    async (requestId: string) => {
      await apiApproveMaintenance(requestId);
      await refresh();
    },
    [refresh],
  );

  const declineMaintenanceQuote = useCallback(
    async (requestId: string, reason: string) => {
      await apiDeclineMaintenance(requestId, reason);
      await refresh();
    },
    [refresh],
  );

  const value: AgentDataContextValue = {
    loading,
    apiConnected,
    apiError,
    agentPortfolioId,
    refresh,
    maintenanceFromApi,
    maintenanceAll,
    maintenanceKpis,
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
