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
  createProperty as apiCreateProperty,
  createAgency as apiCreateAgency,
  createThread as apiCreateThread,
  declineMaintenance as apiDeclineMaintenance,
  fetchAgencies,
  fetchDocuments,
  fetchMessageThreads,
  fetchNotifications,
  fetchPortfolio,
  fetchProperties,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  markNotificationRead as apiMarkNotificationRead,
  replyToThread as apiReplyToThread,
  uploadDocument as apiUploadDocument,
  type AgentPortfolio,
} from '@/lib/crossub-api/agent-client';
import {
  mapAgentAccounting,
  mapAgentAgencies,
  mapAgentDocuments,
  mapAgentInspections,
  mapAgentLeasing,
  mapAgentLeasingCycles,
  mapAgentMaintenance,
  mapAgentMessages,
  mapAgentNotifications,
  mapAgentProperty,
  mapAgentProperties,
  mapAgentRentReviews,
  mapAgentTenantSelections,
  mapAgentTribunal,
  mapAgentVacating,
  messageCategoryToDepartment,
} from '@/lib/crossub-api/agent-mappers';
import { MAINTENANCE_STATUS } from '@/constants/api-enums';
import {
  filterByPropertyIds,
  resolveAgentPortfolioId,
  type AgentPortfolioId,
} from '@/lib/agent-scope';
import { getLocalSessionAccount } from '@/lib/local-auth';
import {
  applyTenantSelectionDecision,
  tenantSelectionDecisionKey,
} from '@/lib/tenant-selection';
import { buildDashboardKpis } from '@/lib/dashboard-kpis';
import { buildNeedActionGroups } from '@/lib/need-action-groups';
import { buildRemindingQueue, getPropertyNeedActions } from '@/lib/property-actions';
import { buildSectionStatus } from '@/lib/section-status';
import { buildTaskStatusList } from '@/lib/task-status-list';
import { useAgentStore } from '@/lib/store';
import { displayName } from '@/lib/utils';
import {
  hasFullManagementAccess as computeFullManagementAccess,
  isInspectionOnlyAgent as computeInspectionOnlyAgent,
} from '@/lib/portal-service-level';
import type {
  Agency,
  AgentDocument,
  AgentNotification,
  DashboardItem,
  DashboardKpis,
  Inspection,
  LeasingRecord,
  LeasingCycle,
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

/** Read a File as base64 (no `data:` URI prefix) for the base64-through-API upload. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
  agencies: Agency[];
  /** The agent's profile agency — earliest AccountManagerAssignment, not user-selectable. */
  primaryAgency: Agency | null;
  portalAccessReady: boolean;
  /** True when at least one assigned agency has Level 2 (full management) access. */
  hasFullManagementAccess: boolean;
  /** True when every assigned agency is Level 1 (inspection-only). */
  isInspectionOnlyAgent: boolean;
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
  leasingCycles: LeasingCycle[];
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
  addProperty: (input: import('@/lib/store').NewPropertyInput) => Promise<Property>;
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
  // Both null = not loaded / failed → domains render empty until the API responds.
  // They are fetched together so real properties + real domains stay
  // coherently keyed by the same real property ids.
  const [apiProperties, setApiProperties] = useState<Property[] | null>(null);
  const [portfolio, setPortfolio] = useState<AgentPortfolio | null>(null);
  // Live message threads (mapped). null = not loaded / failed → optimistic store only.
  // of the portfolio so a messaging hiccup never blanks the rest.
  const [apiMessages, setApiMessages] = useState<MessageThread[] | null>(null);
  // Live notifications (mapped). null = not loaded / failed → empty list.
  const [apiNotifications, setApiNotifications] = useState<AgentNotification[] | null>(
    null,
  );
  // Live documents (aggregated + uploaded, mapped). null = not loaded / failed → uploads only.
  const [apiDocuments, setApiDocuments] = useState<AgentDocument[] | null>(null);
  // Live client agencies (mapped). null = not loaded / failed → empty list.
  const [apiAgencies, setApiAgencies] = useState<Agency[] | null>(null);
  // localThreadId → server thread id, populated when an optimistic thread is persisted via
  // createThread. Lets the messages memo promote the local thread (keeping its id so the
  // open detail route stays valid) onto its server content, and routes later replies to it.
  const [createdThreadIds, setCreatedThreadIds] = useState<Record<string, string>>({});
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
    setApiAgencies(null);
    try {
      const [props, port] = await Promise.all([
        fetchProperties(),
        fetchPortfolio(),
      ]);
      const mappedProps = mapAgentProperties(props, agentPortfolioId);
      setApiProperties(mappedProps);
      setPortfolio(port);
      setApiConnected(true);
      // Messages + notifications + documents + agencies load after the portfolio; each
      // domain degrades independently (one hiccup never blanks the others).
      const [threadsRes, notifsRes, docsRes, agenciesRes] = await Promise.allSettled([
        fetchMessageThreads(),
        fetchNotifications(),
        fetchDocuments(),
        fetchAgencies(),
      ]);
      setApiMessages(
        threadsRes.status === 'fulfilled'
          ? mapAgentMessages(threadsRes.value, mappedProps, agentPortfolioId)
          : null,
      );
      setApiNotifications(
        notifsRes.status === 'fulfilled'
          ? mapAgentNotifications(notifsRes.value)
          : null,
      );
      setApiDocuments(
        docsRes.status === 'fulfilled' ? mapAgentDocuments(docsRes.value) : null,
      );
      setApiAgencies(
        agenciesRes.status === 'fulfilled'
          ? mapAgentAgencies(agenciesRes.value)
          : null,
      );
    } catch (err) {
      setApiConnected(false);
      setApiProperties(null);
      setPortfolio(null);
      setApiMessages(null);
      setApiNotifications(null);
      setApiDocuments(null);
      setApiAgencies(null);
      setApiError(
        err instanceof Error
          ? err.message
          : 'Unable to reach CROSSUB API',
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
      setApiMessages(null);
      setApiNotifications(null);
      setApiDocuments(null);
      setApiAgencies(null);
      setApiError(null);
      return;
    }
    void refresh();
  }, [refresh, status]);

  const properties = useMemo(() => {
    const scoped = (list: Property[]) =>
      list.filter((p) => p.assignedAgentId === agentPortfolioId);

    if (apiConnected) {
      return scoped(apiProperties ?? []);
    }

    return scoped(addedProperties);
  }, [apiConnected, apiProperties, agentPortfolioId, addedProperties]);

  const propertyIds = useMemo(
    () => new Set(properties.map((p) => p.id)),
    [properties],
  );

  const agencies = useMemo<Agency[]>(() => {
    const base = apiAgencies ?? [];
    // propertyCount always reflects the live properties grouped by agencyId (no extra fetch).
    const counts = new Map<string, number>();
    for (const p of properties) {
      if (p.agencyId) counts.set(p.agencyId, (counts.get(p.agencyId) ?? 0) + 1);
    }
    return base
      .map((a) => ({ ...a, propertyCount: counts.get(a.id) ?? 0 }))
      .sort((x, y) => x.name.localeCompare(y.name));
  }, [apiAgencies, properties]);

  const primaryAgency = useMemo<Agency | null>(() => {
    if (apiAgencies?.length) {
      const first = apiAgencies[0];
      const propertyCount = properties.filter((p) => p.agencyId === first.id).length;
      return { ...first, propertyCount };
    }
    if (apiConnected) {
      return null;
    }
    const local = getLocalSessionAccount();
    if (local?.agencyName?.trim()) {
      return {
        id: `local-${local.id}`,
        name: local.agencyName.trim(),
        status: 'ONBOARDING',
        company: local.agencyCompany?.trim() || undefined,
        contactName: `${local.firstName} ${local.lastName}`.trim(),
        contactEmail: local.email,
        contactPhone: local.phone,
        propertyCount: properties.length,
      };
    }
    return null;
  }, [apiAgencies, apiConnected, properties]);

  const portalAccessReady = apiAgencies !== null;

  const hasFullManagementAccess = useMemo(
    () => !portalAccessReady || computeFullManagementAccess(agencies),
    [portalAccessReady, agencies],
  );

  const isInspectionOnlyAgent = useMemo(
    () => portalAccessReady && computeInspectionOnlyAgent(agencies),
    [portalAccessReady, agencies],
  );

  const maintenanceAll = useMemo(() => {
    if (portfolio) return mapAgentMaintenance(portfolio.maintenance);
    return [];
  }, [portfolio]);

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
    const base = portfolio ? mapAgentInspections(portfolio.inspections) : [];
    const added = filterByPropertyIds(addedInspections, propertyIds);
    return [...added, ...base];
  }, [portfolio, propertyIds, addedInspections]);

  const rentReviews = useMemo(
    () => (portfolio ? mapAgentRentReviews(portfolio.rentReviews) : []),
    [portfolio],
  );

  const vacating = useMemo(
    () => (portfolio ? mapAgentVacating(portfolio.vacating) : []),
    [portfolio],
  );

  const tenantSelections = useMemo(() => {
    const base = portfolio ? mapAgentTenantSelections(portfolio.tenantSelections) : [];
    return base.map((selection) => {
      const key = tenantSelectionDecisionKey(selection.propertyId, selection.id);
      return applyTenantSelectionDecision(
        selection,
        tenantSelectionDecisions[key],
      );
    });
  }, [portfolio, tenantSelectionDecisions]);

  const leasingRecords = useMemo(
    () => (portfolio ? mapAgentLeasing(portfolio.leasing) : []),
    [portfolio],
  );

  const leasingCycles = useMemo(
    () => (portfolio ? mapAgentLeasingCycles(portfolio.leasingCycles) : []),
    [portfolio],
  );

  const accounting = useMemo(
    () => (portfolio ? mapAgentAccounting(portfolio.accounting) : []),
    [portfolio],
  );

  const tribunalCases = useMemo(
    () => (portfolio ? mapAgentTribunal(portfolio.tribunal) : []),
    [portfolio],
  );

  const messages = useMemo<MessageThread[]>(() => {
    const customThreads = customMessageThreads.filter(
      (m) => m.assignedAgentId === agentPortfolioId,
    );

    // Fill the parties from the live property by id (or address fallback).
    const reconcileContacts = (thread: MessageThread): MessageThread => {
      const prop = thread.propertyId
        ? properties.find((p) => p.id === thread.propertyId)
        : properties.find((p) => thread.propertyAddress.includes(p.address));
      return {
        ...thread,
        propertyId: prop?.id ?? thread.propertyId,
        homeOwnerName: prop?.homeOwnerName ?? thread.homeOwnerName,
        homeOwnerContact: prop?.homeOwnerContact ?? thread.homeOwnerContact ?? {},
        tenantName: prop?.tenantName ?? thread.tenantName,
        tenantContact: prop?.tenantContact ?? thread.tenantContact ?? {},
      };
    };
    // Overlay device-local sent messages (used for optimistic threads only).
    const overlaySent = (thread: MessageThread): MessageThread => {
      const sent = normalizeSentMessages(sentThreadMessages[thread.id]);
      if (sent.length === 0) return thread;
      const allMessages = [...thread.messages, ...sent].sort((a, b) =>
        (a.at ?? '').localeCompare(b.at ?? ''),
      );
      const last = allMessages[allMessages.length - 1];
      return {
        ...thread,
        messages: allMessages,
        lastMessage: last?.body ?? thread.lastMessage,
        lastAt: last?.at ?? thread.lastAt,
      };
    };

    // Not yet loaded: optimistic custom threads only.
    if (apiMessages === null) {
      return customThreads.map((t) => overlaySent(reconcileContacts(t)));
    }

    // ONLINE: the live API threads are the source of truth. An optimistic custom thread
    // already persisted (createdThreadIds maps it to a server id) is "promoted" — rendered
    // with its LOCAL id (so an open detail route stays valid) but the server's content; the
    // matching server thread is then not emitted again. Custom threads not yet persisted
    // stay optimistic, with their device-local messages overlaid.
    const consumed = new Set<string>();
    const out: MessageThread[] = [];
    for (const custom of customThreads) {
      const serverId = createdThreadIds[custom.id];
      const server = serverId
        ? apiMessages.find((t) => t.id === serverId)
        : undefined;
      if (server) {
        consumed.add(server.id);
        out.push({ ...server, id: custom.id, serverThreadId: server.id });
      } else {
        out.push(overlaySent(custom));
      }
    }
    for (const server of apiMessages) {
      if (consumed.has(server.id)) continue;
      out.push({ ...server, serverThreadId: server.id });
    }
    return out.map(reconcileContacts);
  }, [
    apiMessages,
    agentPortfolioId,
    properties,
    sentThreadMessages,
    customMessageThreads,
    createdThreadIds,
  ]);

  const sendMessage = useCallback(
    (threadId: string, body: string, mentions?: MessageMention[], channel?: 'app' | 'email') => {
      const from = user ? displayName(user) : 'Agent';
      const text = body.trim();
      if (!text) return;
      const thread = messages.find((m) => m.id === threadId);
      const serverThreadId = thread?.serverThreadId ?? createdThreadIds[threadId];

      // Connected + the thread is persisted → reply through the API; refresh() reconciles.
      if (apiConnected && serverThreadId) {
        void apiReplyToThread(serverThreadId, text)
          .then(() => refresh())
          .catch(() => {});
        return;
      }
      // Connected + an optimistic thread about a property → persist it (thread + first
      // message), remembering its server id so later replies route to the API and the
      // messages memo can promote the local thread onto its server content.
      if (apiConnected && thread?.propertyId) {
        sendThreadMessage(threadId, text, from, mentions, channel);
        void apiCreateThread({
          subject: thread.subject,
          body: text,
          department: messageCategoryToDepartment(
            thread.messageCategory ?? (thread.taskType as MessageCategory),
          ),
          propertyId: thread.propertyId,
        })
          .then((created) => {
            setCreatedThreadIds((prev) => ({ ...prev, [threadId]: created.id }));
            return refresh();
          })
          .catch(() => {});
        return;
      }
      // Offline / no property anchor → device-local optimistic only.
      sendThreadMessage(threadId, text, from, mentions, channel);
    },
    [user, messages, createdThreadIds, apiConnected, sendThreadMessage, refresh],
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
    async (input: import('@/lib/store').NewPropertyInput): Promise<Property> => {
      if (apiConnected && input.intakeMode === 'new') {
        if (!apiAgencies?.length && input.agencyName?.trim()) {
          await apiCreateAgency({
            name: input.agencyName.trim(),
            company: input.agencyCompany?.trim() || undefined,
          });
          await refresh();
        }
        const created = await apiCreateProperty({
          address: input.address.trim(),
          suburb: input.suburb.trim() || undefined,
          state: input.state,
          postcode: input.postcode,
          propertyType: input.propertyType,
          status: input.propertyStatus,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          parking: input.carSpaces,
          landlordName:
            input.homeOwnerName.trim() && input.homeOwnerName !== 'TBC'
              ? input.homeOwnerName.trim()
              : undefined,
          landlordEmail: input.homeOwnerEmail,
          landlordPhone: input.homeOwnerPhone,
          tenantName: input.tenantName.trim() !== 'Vacant' ? input.tenantName.trim() : undefined,
          tenantEmail: input.tenantEmail,
          tenantPhone: input.tenantPhone,
        });
        await refresh();
        return mapAgentProperty(created, agentPortfolioId);
      }
      return storeAddProperty(input, agentPortfolioId);
    },
    [apiConnected, apiAgencies, refresh, storeAddProperty, agentPortfolioId],
  );

  const addOpenInspection = useCallback(
    (input: import('@/lib/store').NewOpenInspectionInput) =>
      storeAddOpenInspection(input),
    [storeAddOpenInspection],
  );

  const uploadDocument = useCallback(
    (file: File, category: AgentDocument['category'], propertyAddress: string) => {
      // Connected: read the File as base64 and persist it (→ R2 + PortalDocument), then
      // refresh() surfaces it. Resolve the chosen address back to a managed property id;
      // an unmatched address (e.g. 'Portfolio') uploads as a portfolio-level document.
      if (apiConnected) {
        const prop = properties.find(
          (p) =>
            `${p.address}, ${p.suburb}` === propertyAddress ||
            (p.address.length > 0 && propertyAddress.includes(p.address)),
        );
        void (async () => {
          try {
            const contentBase64 = await fileToBase64(file);
            await apiUploadDocument({
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              sizeBytes: file.size,
              contentBase64,
              category,
              propertyId: prop?.id,
            });
            await refresh();
          } catch {
            // Swallow — the screen already toasts; the doc simply won't appear.
          }
        })();
        return;
      }
      // Offline: keep a blob URL so View/Download work on this device.
      const objectUrl = URL.createObjectURL(file);
      const doc: AgentDocument = {
        id: `upload-${Date.now()}`,
        title: file.name,
        propertyAddress,
        category,
        uploadedAt: new Date().toISOString(),
        href: objectUrl,
        downloadUrl: objectUrl,
      };
      addUploadedDocument(doc);
    },
    [apiConnected, properties, refresh, addUploadedDocument],
  );

  const documents = useMemo<AgentDocument[]>(() => {
    if (apiDocuments) return apiDocuments;
    const prefixes = properties.map((p) => p.address.split(',')[0]);
    return uploadedDocuments.filter((d) =>
      prefixes.some((a) => d.propertyAddress.includes(a) || d.propertyAddress === 'Portfolio'),
    );
  }, [apiDocuments, properties, uploadedDocuments]);

  const notifications = useMemo<AgentNotification[]>(() => {
    const base: AgentNotification[] = apiNotifications ?? [];
    return base.map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
  }, [apiNotifications, readIds]);

  const markNotificationRead = useCallback(
    (id: string) => {
      setReadIds((prev) => new Set(prev).add(id)); // optimistic
      if (apiConnected && apiNotifications?.some((n) => n.id === id)) {
        void apiMarkNotificationRead(id)
          .then(() => refresh())
          .catch(() => {});
      }
    },
    [apiConnected, apiNotifications, refresh],
  );

  const markAllNotificationsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const n of notifications) next.add(n.id);
      return next;
    });
    if (apiConnected && apiNotifications) {
      void apiMarkAllNotificationsRead()
        .then(() => refresh())
        .catch(() => {});
    }
  }, [notifications, apiConnected, apiNotifications, refresh]);

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
        source: 'api' as const,
      }));
    return [...maintDash, ...tenantDash];
  }, [maintenanceAll, tenantSelections]);

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
    agencies,
    primaryAgency,
    portalAccessReady,
    hasFullManagementAccess,
    isInspectionOnlyAgent,
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
    leasingCycles,
    accounting,
    needActionItems,
    needActionGroups,
    tribunalCases,
    remindingItems: needActionItems,
    getPropertyActions,
    markNotificationRead,
    markAllNotificationsRead,
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
