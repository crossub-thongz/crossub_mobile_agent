'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/components/providers/auth-provider';
import {
  createProperty as apiCreateProperty,
  endPropertyManagement as apiEndPropertyManagement,
  archiveProperty as apiArchiveProperty,
  deleteDraftProperty as apiDeleteDraftProperty,
  updateProperty as apiUpdateProperty,
  createAgency as apiCreateAgency,
  createThread as apiCreateThread,
  fetchAgencies,
  fetchDocuments,
  fetchMessageThreads,
  fetchNotifications,
  fetchPortfolio,
  fetchProperties,
  fetchArchivedProperties,
  markAllNotificationsRead as apiMarkAllNotificationsRead,
  markNotificationRead as apiMarkNotificationRead,
  markThreadRead as apiMarkThreadRead,
  replyToThread as apiReplyToThread,
  uploadDocument as apiUploadDocument,
  uploadAgentDocumentFileWithProgress as apiUploadAgentDocumentFileWithProgress,
  deleteDocument as apiDeleteDocument,
  type AgentPortfolio,
} from '@/lib/crossub-api/agent-client';
import {
  fetchAgentBillingSummary,
} from '@/lib/crossub-api/agent-billing-client';
import { isAgentPaymentNotification } from '@/lib/agent-payment-notification';
import { sanitizeCreatePropertyBody } from '@/lib/sanitize-create-property-body';
import {
  buildRegistryApiBody,
  type PropertyRegistryAutosaveState,
} from '@/lib/property-registry-persist';
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
  fileToBase64WithProgress,
  mapNetworkUploadProgress,
} from '@/lib/file-upload';
import {
  queueAgentDocumentUpload,
} from '@/lib/agent-pending-document-uploads';
import {
  flushAgentDocumentUploads,
  pendingAgentDocumentUploadToLocalDoc,
} from '@/lib/agent-pending-document-flush';
import {
  needsPasswordChange,
  needsSystemAccessAgreement,
} from '@/lib/system-access-agreement';
import {
  mapAgentAccounting,
  mapAgentAgencies,
  mapAgentDocuments,
  mapAgentInspections,
  mapAgentLeasing,
  mapAgentArchive,
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
  isOwnedByAgent,
  resolveAgentPortfolioId,
  type AgentPortfolioId,
} from '@/lib/agent-scope';
import { getLocalSessionAccount } from '@/lib/local-auth';
import {
  applyTenantSelectionDecision,
  tenantSelectionDecisionKey,
} from '@/lib/tenant-selection';
import { buildDashboardKpis } from '@/lib/dashboard-kpis';
import {
  buildStaffSupportContextBody,
  findStaffSupportThread,
  staffSupportSubject,
  type StaffCaseContext,
} from '@/lib/staff-support-thread';
import { buildNeedActionGroups } from '@/lib/need-action-groups';
import { buildRemindingQueue, getPropertyNeedActions } from '@/lib/property-actions';
import { buildSectionStatus } from '@/lib/section-status';
import { buildTaskStatusList } from '@/lib/task-status-list';
import { enrichPropertyAddresses, resolvePropertyDisplayAddress } from '@/lib/property-address';
import {
  fetchAgentInspections,
  fetchOpenInspectionSessions,
  mergeOpenSessionsIntoInspections,
} from '@/lib/inspections/fetch';
import { isDeletedInspection } from '@/lib/open-inspection-delete';
import { isInspectionDone } from '@/lib/inspections/presentation';
import {
  collectOpenViewingTwinKeys,
  foldOpenPoolTwinIntoSession,
  isOpenPoolTwinOfViewingSession,
  openPoolMatchesViewingSession,
  pickFresherInspection,
} from '@/lib/inspection-mappers';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { inspectionReferenceLabel } from '@/lib/workflow-case-reference';
import { openSessionInspectionId } from '@/lib/open-inspection/open-session-inspection-id';
import { notificationMatchesPrefs } from '@/lib/notification-prefs';
import { useAgentStore } from '@/lib/store';
import { displayName, formatCurrency, formatPropertyFullAddress } from '@/lib/utils';
import { fetchMaintenanceCase } from '@/lib/maintenance/fetch-maintenance-case';
import { pickLatestSubmittedQuote } from '@/lib/data/map-maintenance';
import {
  quotationSnapshotFromApi,
  reviewMaintenanceQuotationDecisionCase,
  sendMaintenanceContractorFeedbackCase,
  sendMaintenanceQuotationCounterOfferCase,
} from '@/lib/maintenance/maintenance-case-ops';
import {
  hasFullManagementAccess as computeFullManagementAccess,
  isInspectionOnlyAgent as computeInspectionOnlyAgent,
} from '@/lib/portal-service-level';
import type {
  Agency,
  AgentArchiveView,
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
import { LIVE_POLL_MS } from '@/lib/live-sync';

function isRecentAddedInspection(row: Inspection, maxAgeMs = 48 * 60 * 60 * 1000): boolean {
  if (row.type === 'OPEN') return true;
  const at = row.createdAt ? Date.parse(row.createdAt) : NaN;
  if (!Number.isFinite(at)) return true;
  return Date.now() - at < maxAgeMs;
}

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
function fileToBase64(file: File, onProgress?: (percent: number) => void): Promise<string> {
  return fileToBase64WithProgress(file, onProgress);
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
  /** True during a background portfolio refresh (does not blank the shell). */
  refreshing: boolean;
  apiConnected: boolean;
  apiError: string | null;
  agentPortfolioId: AgentPortfolioId;
  refresh: (options?: { force?: boolean }) => Promise<void>;
  maintenanceFromApi: AgentApiMaintenanceRef[];
  maintenanceAll: MaintenanceRequest[];
  maintenanceKpis: { total: number; overdue: number; breachRate: number } | null;
  properties: Property[];
  /** Properties whose management has ended — excluded from the active portfolio list. */
  archivedProperties: Property[];
  /** Reload archived properties (e.g. after ending management or opening the Archived filter). */
  refreshArchivedProperties: () => Promise<void>;
  agencies: Agency[];
  /** The agent's profile agency — earliest AccountManagerAssignment, not user-selectable. */
  primaryAgency: Agency | null;
  portalAccessReady: boolean;
  /** True when at least one assigned agency has Level 2 (full management) access. */
  hasFullManagementAccess: boolean;
  /** True when every assigned agency is Level 1 (inspection and tribunal only). */
  isInspectionOnlyAgent: boolean;
  /** Kill switch: Level 2/3 platform billing is off for this agent. */
  platformBillingDisabled: boolean;
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  vacating: VacatingCase[];
  tenantSelections: TenantSelectionCase[];
  messages: MessageThread[];
  documents: AgentDocument[];
  notifications: AgentNotification[];
  unreadNotificationCount: number;
  dashboardItems: DashboardItem[];
  sectionStatus: SectionStatus[];
  taskStatusList: TaskStatusItem[];
  dashboardKpis: DashboardKpis;
  leasingRecords: LeasingRecord[];
  leasingCycles: LeasingCycle[];
  archive: AgentArchiveView;
  accounting: PropertyAccounting[];
  needActionItems: PropertyNeedAction[];
  needActionGroups: NeedActionGroup[];
  tribunalCases: TribunalCase[];
  /** @deprecated use needActionItems */
  remindingItems: PropertyNeedAction[];
  getPropertyActions: (propertyId: string) => PropertyNeedAction[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  markThreadRead: (threadId: string) => void;
  uploadDocument: (
    file: File,
    category: AgentDocument['category'],
    propertyAddress: string,
    options?: { title?: string; propertyId?: string; onProgress?: (percent: number) => void; skipRefresh?: boolean },
  ) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
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
  /** Open (or reuse) a CROSSUB staff support thread with property / case context for admin. */
  openStaffSupportThread: (
    propertyId: string,
    caseContext?: StaffCaseContext,
  ) => Promise<string>;
  addProperty: (input: import('@/lib/store').NewPropertyInput) => Promise<Property>;
  savePropertyRegistryDraft: (
    propertyId: string | null,
    state: PropertyRegistryAutosaveState,
    options?: { complete?: boolean },
  ) => Promise<Property>;
  endPropertyManagement: (
    propertyId: string,
    endOfManagementDate: string,
    options?: { archiveOnBondRelease?: boolean },
  ) => Promise<void>;
  archiveProperty: (propertyId: string) => Promise<void>;
  deleteDraftProperty: (propertyId: string) => Promise<void>;
  addOpenInspection: (input: import('@/lib/store').NewOpenInspectionInput) => Promise<Inspection>;
  registerInspection: (inspection: Inspection) => void;
  approveMaintenanceQuote: (requestId: string) => Promise<void>;
  declineMaintenanceQuote: (requestId: string, reason: string) => Promise<void>;
  requoteMaintenanceQuote: (
    requestId: string,
    counterPrice: number,
    message?: string,
  ) => Promise<void>;
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
        ? `${m.contractorName}${
            m.quoteAmount != null ? ` — ${formatCurrency(m.quoteAmount)}` : ''
          }`
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
  const addedProperties = useAgentStore((s) => s.addedProperties ?? []);
  const addedInspections = useAgentStore((s) => s.addedInspections ?? []);
  const customMessageThreads = useAgentStore((s) => s.customMessageThreads ?? []);
  const storeAddProperty = useAgentStore((s) => s.addProperty);
  const storeAddOpenInspection = useAgentStore((s) => s.addOpenInspection);
  const registerInspection = useAgentStore((s) => s.registerInspection);
  const pruneStaleAddedInspections = useAgentStore((s) => s.pruneStaleAddedInspections);
  const storeEnsureMessageThread = useAgentStore((s) => s.ensureMessageThread);
  const uploadedDocuments = useAgentStore((s) => s.uploadedDocuments ?? []);
  const addUploadedDocument = useAgentStore((s) => s.addUploadedDocument);
  const notificationPrefs = useAgentStore((s) => s.notificationPrefs);
  const tenantSelectionDecisions = useAgentStore((s) => s.tenantSelectionDecisions);

  // The live agent facade: properties come pre-mapped (the mapping needs the portfolio
  // id); the operational portfolio is held raw and mapped per-domain in the memos below.
  // Both null = not loaded / failed → domains render empty until the API responds.
  // They are fetched together so real properties + real domains stay
  // coherently keyed by the same real property ids.
  const [apiProperties, setApiProperties] = useState<Property[] | null>(null);
  const [apiArchivedProperties, setApiArchivedProperties] = useState<Property[] | null>(null);
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
  const [platformBillingDisabled, setPlatformBillingDisabled] = useState(false);
  const [apiInspections, setApiInspections] = useState<Inspection[] | null>(null);
  // localThreadId → server thread id, populated when an optimistic thread is persisted via
  // createThread. Lets the messages memo promote the local thread (keeping its id so the
  // open detail route stays valid) onto its server content, and routes later replies to it.
  const [createdThreadIds, setCreatedThreadIds] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const hasLoadedOnceRef = useRef(false);
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(async (options?: { force?: boolean }) => {
    if (status !== 'authed') {
      setLoading(false);
      return;
    }
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;

    const isInitialLoad = !hasLoadedOnceRef.current;
    const force = options?.force === true;
    const showBlockingLoad = isInitialLoad || force;

    if (showBlockingLoad) {
      setLoading(true);
      setApiError(null);
      setApiAgencies(null);
      setApiInspections(null);
    } else {
      setRefreshing(true);
    }

    try {
      const [propsRes, portRes] = await Promise.allSettled([
        fetchProperties(),
        fetchPortfolio(),
      ]);

      if (propsRes.status === 'rejected' && portRes.status === 'rejected') {
        throw propsRes.reason;
      }

      const mappedProps =
        propsRes.status === 'fulfilled'
          ? mapAgentProperties(propsRes.value, agentPortfolioId)
          : null;

      if (mappedProps) {
        setApiProperties(mappedProps);
      }
      if (portRes.status === 'fulfilled') {
        setPortfolio(portRes.value);
      }

      setApiConnected(true);
      setApiError(
        propsRes.status === 'rejected' || portRes.status === 'rejected'
          ? 'Some property data could not be refreshed'
          : null,
      );

      const propsForMessages = mappedProps ?? [];
      // Messages + notifications + documents + agencies load after the portfolio; each
      // domain degrades independently (one hiccup never blanks the others).
      const [threadsRes, notifsRes, docsRes, agenciesRes, billingRes] = await Promise.allSettled([
        fetchMessageThreads(),
        fetchNotifications(),
        fetchDocuments(),
        fetchAgencies(),
        fetchAgentBillingSummary(),
      ]);
      setApiMessages(
        threadsRes.status === 'fulfilled'
          ? mapAgentMessages(threadsRes.value, propsForMessages, agentPortfolioId)
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
      setPlatformBillingDisabled(
        billingRes.status === 'fulfilled' &&
          billingRes.value.platformBillingDisabled === true,
      );
      try {
        if (showBlockingLoad) {
          const liveInspections = await fetchAgentInspections(propsForMessages, {
            includeStaffRecords: true,
          });
          setApiInspections(liveInspections);
        } else {
          const sessions = await fetchOpenInspectionSessions();
          setApiInspections((prev) =>
            mergeOpenSessionsIntoInspections(prev, propsForMessages, sessions),
          );
        }
      } catch {
        setApiInspections(
          portRes.status === 'fulfilled' && portRes.value.inspections?.length
            ? mapAgentInspections(portRes.value.inspections)
            : [],
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to reach CROSSUB API';
      // Only wipe the connected book on the first load failure. A later force
      // refresh blip must not sticky-disable mutations ("Connect to the API…")
      // while the user still has a live session and in-memory case data.
      if (showBlockingLoad && !hasLoadedOnceRef.current) {
        setApiConnected(false);
        setApiProperties(null);
        setPortfolio(null);
        setApiMessages(null);
        setApiNotifications(null);
        setApiDocuments(null);
        setApiAgencies(null);
        setApiInspections(null);
      }
      setApiError(message);
    } finally {
      hasLoadedOnceRef.current = true;
      refreshInFlightRef.current = false;
      if (showBlockingLoad) setLoading(false);
      else setRefreshing(false);
    }
  }, [status, agentPortfolioId]);

  const refreshArchivedProperties = useCallback(async () => {
    if (status !== 'authed') return;
    try {
      const rows = await fetchArchivedProperties();
      setApiArchivedProperties(mapAgentProperties(rows, agentPortfolioId));
    } catch {
      // Archived list is optional — keep the last loaded snapshot on failure.
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

  const postAuthReady =
    status === 'authed' &&
    !!user &&
    !needsSystemAccessAgreement(user) &&
    !needsPasswordChange(user);

  useEffect(() => {
    if (status === 'loading') return;
    if (status !== 'authed' || !user) {
      setLoading(false);
      setApiProperties(null);
      setPortfolio(null);
      setApiMessages(null);
      setApiNotifications(null);
      setApiDocuments(null);
      setApiAgencies(null);
      setApiInspections(null);
      setApiConnected(false);
      setApiError(null);
      hasLoadedOnceRef.current = false;
      return;
    }
    // Agreement / forced password-change pages still mount this provider. Hitting
    // portfolio APIs there returns 403 and used to sticky-set apiConnected=false,
    // so later "Add property" failed with "Connect to the API…". Wait until both
    // gates are clear, then load (or re-load) the book.
    if (!postAuthReady) {
      setLoading(false);
      return;
    }
    void refresh({ force: true });
  }, [
    refresh,
    status,
    user?.id,
    user?.systemAccessAccepted,
    user?.systemAccessAgreementRequired,
    user?.mustChangePassword,
    postAuthReady,
  ]);

  useEffect(() => {
    if (!postAuthReady || !apiConnected) return;
    void flushAgentDocumentUploads().then((count) => {
      if (count > 0) void refresh();
    });
  }, [postAuthReady, apiConnected, refresh]);

  // Background portfolio sync — same 5s cadence as the inspector app roster poll.
  useEffect(() => {
    if (!postAuthReady || !apiConnected) return;
    const id = window.setInterval(() => {
      void refresh();
    }, LIVE_POLL_MS);
    return () => window.clearInterval(id);
  }, [postAuthReady, apiConnected, refresh]);

  const properties = useMemo(() => {
    const scoped = (list: Property[]) =>
      list.filter((p) => isOwnedByAgent(p.assignedAgentId, agentPortfolioId));

    if (apiConnected) {
      return scoped(apiProperties ?? []);
    }

    return scoped(addedProperties);
  }, [apiConnected, apiProperties, agentPortfolioId, addedProperties]);

  const archivedProperties = useMemo(() => {
    const scoped = (list: Property[]) =>
      list.filter((p) => isOwnedByAgent(p.assignedAgentId, agentPortfolioId));

    if (apiConnected) {
      return scoped(apiArchivedProperties ?? []);
    }

    return [];
  }, [apiConnected, apiArchivedProperties, agentPortfolioId]);

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
    () => portalAccessReady && computeFullManagementAccess(agencies),
    [portalAccessReady, agencies],
  );

  const isInspectionOnlyAgent = useMemo(
    () => portalAccessReady && computeInspectionOnlyAgent(agencies),
    [portalAccessReady, agencies],
  );

  const maintenanceAll = useMemo(() => {
    if (!portfolio) return [];
    return enrichPropertyAddresses(
      mapAgentMaintenance(portfolio.maintenance ?? []),
      properties,
    );
  }, [portfolio, properties]);

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
    const rows = portfolio.maintenance ?? [];
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
    const added = enrichPropertyAddresses(
      filterByPropertyIds(addedInspections, propertyIds),
      properties,
    );
    // Portfolio is the unpaginated agency book; live open-viewings / staff list
    // overlay fresher rows. Never replace the book with a single page of /inspections.
    const portfolioRows = portfolio
      ? enrichPropertyAddresses(
          filterByPropertyIds(mapAgentInspections(portfolio.inspections ?? []), propertyIds),
          properties,
        )
      : [];
    const liveRows =
      apiConnected && apiInspections
        ? enrichPropertyAddresses(
            filterByPropertyIds(apiInspections, propertyIds),
            properties,
          )
        : [];

    // New-leasing OPEN creates both a ViewingSession (agent case) and an OPEN
    // Inspection pool job (inspector task pool). Hide the pool twin of *any*
    // viewing session (live or completed) by inspection id / OP- ref so one case
    // is not listed twice. Property-level hide stays limited to *live* sessions
    // so a completed open does not swallow a newly paid OPEN on the same property.
    const sessionTwinKeys = collectOpenViewingTwinKeys(
      [...portfolioRows, ...liveRows, ...added].filter(
        (row) =>
          row.type === 'OPEN' &&
          row.source === 'open_viewing' &&
          !isDeletedInspection(row),
      ),
    );
    const propertiesWithLiveOpenSessions = new Set(
      [...portfolioRows, ...liveRows]
        .filter(
          (row) =>
            row.type === 'OPEN' &&
            row.source === 'open_viewing' &&
            !isDeletedInspection(row) &&
            !isInspectionDone(row) &&
            row.propertyId,
        )
        .map((row) => row.propertyId),
    );
    const isHiddenOpenPoolTwin = (row: Inspection) =>
      isOpenPoolTwinOfViewingSession(row, sessionTwinKeys) ||
      (row.type === 'OPEN' &&
        row.source !== 'open_viewing' &&
        Boolean(row.propertyId) &&
        propertiesWithLiveOpenSessions.has(row.propertyId));

    const byId = new Map<string, Inspection>();
    const hiddenPools: Inspection[] = [];
    for (const row of portfolioRows) {
      if (isHiddenOpenPoolTwin(row)) {
        hiddenPools.push(row);
        continue;
      }
      byId.set(row.id, row);
    }
    for (const row of liveRows) {
      if (isHiddenOpenPoolTwin(row)) {
        hiddenPools.push(row);
        continue;
      }
      const existing = byId.get(row.id);
      byId.set(row.id, existing ? pickFresherInspection(existing, row) : row);
    }
    // Optimistic create rows stick in localStorage until pruned. Once the agency
    // book is loaded, drop stale non-OPEN orphans so admin hard-deletes don't ghost
    // (OPEN still waits on live inspections — it may only exist as a viewing session).
    // Keep a recently created routine/ingoing/outgoing so pay-at-create cases don't
    // vanish before the portfolio snapshot includes them.
    // Keep fetched OPEN *pool* rows (bill deep-link / get-by-id) so they appear on
    // the Inspection tab even when the viewing-session list omitted them.
    for (const row of added) {
      if (isHiddenOpenPoolTwin(row)) {
        hiddenPools.push(row);
        continue;
      }
      const existing = byId.get(row.id);
      if (existing) {
        byId.set(row.id, pickFresherInspection(existing, row));
        continue;
      }
      if (portfolio != null && row.type !== 'OPEN' && !isRecentAddedInspection(row)) continue;
      if (
        apiInspections != null &&
        row.type === 'OPEN' &&
        row.source === 'open_viewing'
      ) {
        if (byId.has(row.id)) {
          byId.set(row.id, pickFresherInspection(byId.get(row.id)!, row));
          continue;
        }
        const createdMs = row.createdAt ? Date.parse(row.createdAt) : NaN;
        const isFresh =
          !Number.isFinite(createdMs) || Date.now() - createdMs < 10 * 60 * 1000;
        if (!isFresh) continue;
      }
      byId.set(row.id, row);
    }
    for (const pool of hiddenPools) {
      for (const [id, session] of byId) {
        if (!openPoolMatchesViewingSession(pool, session)) continue;
        byId.set(id, foldOpenPoolTwinIntoSession(session, pool));
        break;
      }
    }
    return [...byId.values()].sort((a, b) => {
      const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return bt - at;
    });
  }, [apiConnected, apiInspections, portfolio, propertyIds, addedInspections, properties]);

  useEffect(() => {
    if (!portfolio) return;
    const knownIds = new Set<string>([
      ...(portfolio.inspections ?? []).map((row) => row.id),
      ...(apiInspections ?? []).map((row) => row.id),
    ]);
    pruneStaleAddedInspections(knownIds);
  }, [portfolio, apiInspections, pruneStaleAddedInspections]);

  const rentReviews = useMemo(
    () =>
      portfolio
        ? enrichPropertyAddresses(mapAgentRentReviews(portfolio.rentReviews ?? []), properties)
        : [],
    [portfolio, properties],
  );

  const vacating = useMemo(
    () =>
      portfolio
        ? enrichPropertyAddresses(mapAgentVacating(portfolio.vacating ?? []), properties)
        : [],
    [portfolio, properties],
  );

  const tenantSelections = useMemo(() => {
    const base = portfolio
      ? enrichPropertyAddresses(
          mapAgentTenantSelections(portfolio.tenantSelections ?? []),
          properties,
        )
      : [];
    return base.map((selection) => {
      const key = tenantSelectionDecisionKey(selection.propertyId, selection.id);
      return applyTenantSelectionDecision(
        selection,
        tenantSelectionDecisions[key],
      );
    });
  }, [portfolio, properties, tenantSelectionDecisions]);

  const leasingRecords = useMemo(
    () => (portfolio ? mapAgentLeasing(portfolio.leasing ?? []) : []),
    [portfolio],
  );

  const leasingCycles = useMemo(
    () =>
      portfolio
        ? enrichPropertyAddresses(
            mapAgentLeasingCycles(portfolio.leasingCycles ?? []),
            properties,
          )
        : [],
    [portfolio, properties],
  );

  const archive = useMemo(() => {
    const mapped = mapAgentArchive(portfolio?.archive);
    const addressSource = [...properties, ...archivedProperties];
    return {
      cancelledLeasingCycles: enrichPropertyAddresses(
        mapped.cancelledLeasingCycles,
        addressSource,
      ),
      cancelledEndLeasing: enrichPropertyAddresses(mapped.cancelledEndLeasing, addressSource),
      cancelledRentReviews: enrichPropertyAddresses(mapped.cancelledRentReviews, addressSource),
    };
  }, [archivedProperties, portfolio, properties]);

  const accounting = useMemo(
    () =>
      portfolio
        ? enrichPropertyAddresses(mapAgentAccounting(portfolio.accounting ?? []), properties)
        : [],
    [portfolio, properties],
  );

  const tribunalCases = useMemo(
    () =>
      portfolio
        ? enrichPropertyAddresses(mapAgentTribunal(portfolio.tribunal ?? []), properties)
        : [],
    [portfolio, properties],
  );

  const messages = useMemo<MessageThread[]>(() => {
    const customThreads = customMessageThreads.filter(
      (m) => isOwnedByAgent(m.assignedAgentId, agentPortfolioId),
    );

    // Fill the parties from the live property by id (or address fallback).
    const reconcileContacts = (thread: MessageThread): MessageThread => {
      const prop = thread.propertyId
        ? properties.find((p) => p.id === thread.propertyId)
        : properties.find((p) => p.address && thread.propertyAddress.includes(p.address));
      return {
        ...thread,
        propertyAddress: prop
          ? formatPropertyFullAddress(prop)
          : resolvePropertyDisplayAddress(
              properties,
              thread.propertyId,
              thread.propertyAddress,
            ),
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

  const openStaffSupportThread = useCallback(
    async (propertyId: string, caseContext?: StaffCaseContext): Promise<string> => {
      const property = properties.find((p) => p.id === propertyId);
      if (!property) {
        throw new Error('Property not found');
      }

      const existing = findStaffSupportThread(messages, propertyId, caseContext);
      if (existing) {
        return existing.id;
      }

      const propertyAddress = formatPropertyFullAddress(property);
      const subject = staffSupportSubject(propertyAddress);
      const body = buildStaffSupportContextBody({
        propertyAddress,
        propertyId,
        case: caseContext,
      });
      const from = user ? displayName(user) : 'Agent';
      const now = new Date().toISOString();

      const localId = storeEnsureMessageThread(property, agentPortfolioId, undefined, {
        category: 'Others',
        subject,
        caseId: caseContext?.caseId,
        initialBody: body,
        initialFrom: from,
        initialAt: now,
      });

      if (apiConnected && !createdThreadIds[localId]) {
        void apiCreateThread({
          subject,
          body,
          propertyId,
          department: 'GENERAL',
          ...(caseContext && caseContext.caseType !== 'PROPERTY'
            ? { caseType: caseContext.caseType, caseId: caseContext.caseId }
            : {}),
        })
          .then((created) => {
            setCreatedThreadIds((prev) => ({ ...prev, [localId]: created.id }));
            return refresh();
          })
          .catch(() => {});
      }

      return localId;
    },
    [
      agentPortfolioId,
      apiConnected,
      createdThreadIds,
      messages,
      properties,
      refresh,
      storeEnsureMessageThread,
      user,
    ],
  );

  const addProperty = useCallback(
    async (input: import('@/lib/store').NewPropertyInput): Promise<Property> => {
      if (apiConnected && input.intakeMode === 'new') {
        if (!apiAgencies?.length && input.agencyName?.trim()) {
          await apiCreateAgency({
            name: input.agencyName.trim(),
            company: input.agencyCompany?.trim() || undefined,
            contactEmail: user?.email,
            contactName: user
              ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined
              : undefined,
            contactPhone: user?.phone ?? undefined,
          });
          await refresh();
        }
        const created = await apiCreateProperty(
          sanitizeCreatePropertyBody({
            address: input.address.trim(),
            suburb: input.suburb.trim() || undefined,
            state: input.state,
            postcode: input.postcode,
            propertyType: input.propertyType,
            status: input.propertyStatus,
            bedrooms: input.bedrooms,
            bathrooms: input.bathrooms,
            parking: input.carSpaces,
            furnished: input.furnished,
            landlordName:
              input.homeOwnerName.trim() && input.homeOwnerName !== 'TBC'
                ? input.homeOwnerName.trim()
                : undefined,
            landlordEmail: input.homeOwnerEmail,
            landlordPhone: input.homeOwnerPhone,
            tenantName: input.tenantName.trim() !== 'Vacant' ? input.tenantName.trim() : undefined,
            tenantEmail: input.tenantEmail,
            tenantPhone: input.tenantPhone,
            latitude: input.latitude,
            longitude: input.longitude,
            leaseStartDate: input.leaseStart,
            leaseEndDate: input.leaseEnd,
            nextRentReviewAt: input.nextRentReview,
            rentWeekly: input.rentWeekly,
            bondAmount: input.bondAmount,
            depositAmount: input.depositAmount,
            buildingName: input.buildingName,
            strataPlanNumber: input.strataPlanNumber,
            buildingManagerName: input.buildingManagerName,
            buildingManagerEmail: input.buildingManagerEmail,
            buildingManagerPhone: input.buildingManagerPhone,
            strataContactName: input.strataContactName,
            strataContactEmail: input.strataContactEmail,
            strataContactPhone: input.strataContactPhone,
            landlordInsuranceExpiry: input.landlordInsuranceExpiry,
            administrationFee: input.administrationFee,
            documentationFee: input.documentationFee,
            lettingFee: input.lettingFee,
            managementRatePercent: input.managementRatePercent,
            managementRateGst: input.managementRateGst,
          }),
        );
        await refresh();
        const mapped = mapAgentProperty(created, agentPortfolioId);
        return {
          ...mapped,
          leaseStatus: input.leaseStatus,
          leaseStart: input.leaseStart ?? mapped.leaseStart,
          leaseEnd: input.leaseEnd ?? mapped.leaseEnd,
          furnished: input.furnished ?? mapped.furnished,
          rentWeekly: input.rentWeekly || mapped.rentWeekly,
          bondAmount: input.bondAmount ?? mapped.bondAmount,
          depositAmount: input.depositAmount ?? mapped.depositAmount,
          nextRentReview: input.nextRentReview ?? mapped.nextRentReview,
        };
      }
      return storeAddProperty(input, agentPortfolioId);
    },
    [apiConnected, apiAgencies, refresh, storeAddProperty, agentPortfolioId, user],
  );

  const savePropertyRegistryDraft = useCallback(
    async (
      propertyId: string | null,
      state: PropertyRegistryAutosaveState,
      options?: { complete?: boolean },
    ): Promise<Property> => {
      if (!apiConnected) {
        throw new Error('Connect to the API to save properties');
      }

      const complete = options?.complete ?? false;
      const body = sanitizeCreatePropertyBody(
        buildRegistryApiBody(state.form, {
          complete,
          step: state.step,
          furthestStepIndex: state.furthestStepIndex,
        }),
      );

      // Autosave must never downgrade a completed property back to draft. Only send
      // registryIntakeComplete on create (false) or explicit complete (true).
      if (propertyId && !complete) {
        delete (body as { registryIntakeComplete?: boolean }).registryIntakeComplete;
      } else if (!propertyId && !complete) {
        body.registryIntakeComplete = false;
      }

      if (!apiAgencies?.length && state.form.agencyName?.trim()) {
        await apiCreateAgency({
          name: state.form.agencyName.trim(),
          company: state.form.agencyCompany?.trim() || undefined,
          contactEmail: user?.email,
          contactName: user
            ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || undefined
            : undefined,
          contactPhone: user?.phone ?? undefined,
        });
        await refresh();
      }

      const mapWithFormLease = (dto: Awaited<ReturnType<typeof apiCreateProperty>>) => {
        const mapped = mapAgentProperty(dto, agentPortfolioId);
        const leaseStatus = state.form.leaseStatus as Property['leaseStatus'] | '';
        return {
          ...mapped,
          leaseStatus: leaseStatus || mapped.leaseStatus,
          registryIntakeComplete: complete,
        };
      };

      if (propertyId) {
        const updated = await apiUpdateProperty(propertyId, body);
        await refresh();
        return mapWithFormLease(updated);
      }

      const created = await apiCreateProperty(body);
      await refresh();
      return mapWithFormLease(created);
    },
    [apiConnected, apiAgencies, refresh, agentPortfolioId, user],
  );

  const endPropertyManagement = useCallback(
    async (
      propertyId: string,
      endOfManagementDate: string,
      _options?: { archiveOnBondRelease?: boolean },
    ) => {
      if (!apiConnected) {
        throw new Error('Connect to the API to end property management');
      }
      await apiEndPropertyManagement(propertyId, { endOfManagementDate });
      await refresh();
    },
    [apiConnected, refresh],
  );

  const archiveProperty = useCallback(
    async (propertyId: string) => {
      if (!apiConnected) {
        throw new Error('Connect to the API to archive this property');
      }
      await apiArchiveProperty(propertyId);
      setApiProperties((prev) => prev?.filter((p) => p.id !== propertyId) ?? null);
      await refreshArchivedProperties();
      await refresh();
    },
    [apiConnected, refresh, refreshArchivedProperties],
  );

  const deleteDraftProperty = useCallback(
    async (propertyId: string) => {
      if (!apiConnected) {
        throw new Error('Connect to the API to delete this draft');
      }
      await apiDeleteDraftProperty(propertyId);
      setApiProperties((prev) => prev?.filter((p) => p.id !== propertyId) ?? null);
      await refresh();
    },
    [apiConnected, refresh],
  );

  const addOpenInspection = useCallback(
    async (input: import('@/lib/store').NewOpenInspectionInput) => {
      if (apiConnected) {
        const start = input.scheduledAt ?? new Date().toISOString();
        const end = new Date(new Date(start).getTime() + 60 * 60_000).toISOString();
        const session = await openViewingsApi.create({
          propertyId: input.property.id,
          startTime: start,
          endTime: end,
          shortNote: input.preferredNotes,
          // The acting agent, not the property: `Property` carries no agentName/agentPhone
          // and never has, so both of these were `undefined` on the wire and every session
          // this app opened reached the API with no agent contact on it at all.
          agentName:
            [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || undefined,
          agentPhone: user?.phone ?? undefined,
          agentRole: 'leasing_agent',
        });
        await refresh();
        const inspectionId = openSessionInspectionId(session);
        return {
          id: session.id,
          inspectionRecordId: inspectionId,
          trackingNumber: inspectionReferenceLabel(inspectionId, 'OPEN'),
          type: 'OPEN' as const,
          propertyId: input.property.id,
          propertyAddress: formatPropertyFullAddress(input.property),
          scheduledAt: session.startTime,
          status: session.sessionStatus,
          apiStatus: session.sessionStatus,
          reportStatus: 'pending' as const,
          openConductedBy: input.openConductedBy,
          openListingContext: input.openListingContext,
          agentTenantNotifiedConfirmed: input.agentTenantNotifiedConfirmed,
          timeline: [],
          source: 'open_viewing' as const,
        };
      }
      return storeAddOpenInspection(input);
    },
    [apiConnected, refresh, storeAddOpenInspection, user],
  );

  const uploadDocument = useCallback(
    async (
      file: File,
      category: AgentDocument['category'],
      propertyAddress: string,
      options?: { title?: string; propertyId?: string; onProgress?: (percent: number) => void; skipRefresh?: boolean },
    ) => {
      const displayTitle = options?.title?.trim() || file.name;
      const onProgress = options?.onProgress;
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`File exceeds the ${MAX_UPLOAD_LABEL} limit`);
      }
      // Resolve the property once, BEFORE the branch. Prefer an explicit propertyId
      // (create-property / Documents tab); otherwise resolve from the address string.
      // ⭐ This used to be declared inside `if (apiConnected)` while the offline branch
      // below still read `prop?.id` — and optional chaining guards the property access,
      // not the binding, so queuing a document while offline threw a bare
      // `ReferenceError: prop is not defined` instead of queuing it.
      const prop =
        (options?.propertyId
          ? properties.find((p) => p.id === options.propertyId)
          : undefined) ??
        properties.find(
          (p) =>
            formatPropertyFullAddress(p) === propertyAddress ||
            `${p.address}, ${p.suburb}` === propertyAddress ||
            (Boolean(p.address?.trim()) && propertyAddress.includes(p.address)),
        );
      const propertyId = options?.propertyId ?? prop?.id;
      // Connected: read the File as base64 and persist it (→ R2 + PortalDocument), then
      // refresh() surfaces it.
      if (apiConnected) {
        try {
          await apiUploadAgentDocumentFileWithProgress(
            file,
            {
              category,
              propertyId,
              title: displayTitle,
            },
            (networkPct) => onProgress?.(mapNetworkUploadProgress(networkPct)),
          );
          onProgress?.(100);
          if (!options?.skipRefresh) {
            await refresh();
          }
        } catch (err) {
          throw err instanceof Error ? err : new Error('Failed to upload document');
        }
        return;
      }
      // Offline: queue in IndexedDB and keep a blob URL for local preview until sync.
      const record = {
        id: `upload-${Date.now()}`,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        title: displayTitle,
        category,
        propertyAddress,
        propertyId,
        blob: file,
      };
      await queueAgentDocumentUpload(record);
      addUploadedDocument(pendingAgentDocumentUploadToLocalDoc(record));
    },
    [apiConnected, properties, refresh, addUploadedDocument],
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (!apiConnected) {
        throw new Error('Connect to the API to delete documents');
      }
      await apiDeleteDocument(documentId);
      await refresh();
    },
    [apiConnected, refresh],
  );

  const documents = useMemo<AgentDocument[]>(() => {
    const enrichDoc = (d: AgentDocument): AgentDocument =>
      d.propertyAddress === 'Portfolio'
        ? d
        : {
            ...d,
            propertyAddress: resolvePropertyDisplayAddress(
              properties,
              undefined,
              d.propertyAddress,
            ),
          };
    if (apiDocuments) return apiDocuments.map(enrichDoc);
    const prefixes = properties
      .map((p) => (p.address ?? '').split(',')[0])
      .filter(Boolean);
    return uploadedDocuments
      .filter((d) =>
        prefixes.some((a) => d.propertyAddress.includes(a) || d.propertyAddress === 'Portfolio'),
      )
      .map(enrichDoc);
  }, [apiDocuments, properties, uploadedDocuments]);

  const notifications = useMemo<AgentNotification[]>(() => {
    const base: AgentNotification[] = apiNotifications ?? [];
    const mapped = base.map((n) => ({
      ...n,
      read: n.read || readIds.has(n.id),
      propertyAddress: n.propertyAddress
        ? resolvePropertyDisplayAddress(properties, undefined, n.propertyAddress)
        : n.propertyAddress,
    }));
    if (!platformBillingDisabled) return mapped;
    return mapped.filter((n) => !isAgentPaymentNotification(n));
  }, [apiNotifications, readIds, properties, platformBillingDisabled]);

  const unreadNotificationCount = useMemo(
    () =>
      notifications.filter(
        (n) => !n.read && notificationMatchesPrefs(n, notificationPrefs),
      ).length,
    [notifications, notificationPrefs],
  );

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

  const markThreadRead = useCallback(
    (threadId: string) => {
      const thread = messages.find((m) => m.id === threadId);
      const serverThreadId = thread?.serverThreadId ?? createdThreadIds[threadId] ?? threadId;

      // Optimistic: clear unread badge immediately in the local list.
      setApiMessages((prev) =>
        prev
          ? prev.map((t) =>
              t.id === serverThreadId || t.id === threadId ? { ...t, unread: 0 } : t,
            )
          : prev,
      );

      if (apiConnected && serverThreadId) {
        void apiMarkThreadRead(serverThreadId)
          .then(() => refresh())
          .catch(() => {});
      }
    },
    [messages, createdThreadIds, apiConnected, refresh],
  )

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

  const resolveLiveSubmittedQuote = useCallback(async (requestId: string) => {
    const snapshot = await fetchMaintenanceCase(requestId);
    if (!snapshot) {
      throw new Error('No submitted quotation on this maintenance case');
    }
    const quote =
      pickLatestSubmittedQuote(snapshot.quotations, {
        id: requestId,
        assignedContractorId:
          snapshot.mapped.apiRequest.assignedContractorId ??
          snapshot.workflowRequest?.assignedContractorId,
      }) ??
      snapshot.quotations.find((q) => q.id === snapshot.mapped.submittedQuotationId);
    if (!quote || quote.status !== 'submitted') {
      throw new Error('No submitted quotation on this maintenance case');
    }
    return quote;
  }, []);

  const approveMaintenanceQuote = useCallback(
    async (requestId: string) => {
      const quote = await resolveLiveSubmittedQuote(requestId);
      await reviewMaintenanceQuotationDecisionCase(
        quote.id,
        'approved',
        undefined,
        quotationSnapshotFromApi(quote),
      );
      await refresh();
    },
    [refresh, resolveLiveSubmittedQuote],
  );

  const declineMaintenanceQuote = useCallback(
    async (requestId: string, reason: string) => {
      const quote = await resolveLiveSubmittedQuote(requestId);
      const snapshot = quotationSnapshotFromApi(quote);
      await reviewMaintenanceQuotationDecisionCase(quote.id, 'declined', reason, snapshot);
      try {
        await sendMaintenanceContractorFeedbackCase(quote.id, reason);
      } catch {
        // Decision is recorded even if the contractor email cannot be sent.
      }
      await refresh();
    },
    [refresh, resolveLiveSubmittedQuote],
  );

  const requoteMaintenanceQuote = useCallback(
    async (requestId: string, counterPrice: number, message?: string) => {
      const quote = await resolveLiveSubmittedQuote(requestId);
      await sendMaintenanceQuotationCounterOfferCase(quote.id, counterPrice, message);
      await refresh();
    },
    [refresh, resolveLiveSubmittedQuote],
  );

  const value: AgentDataContextValue = {
    loading,
    refreshing,
    apiConnected,
    apiError,
    agentPortfolioId,
    refresh,
    maintenanceFromApi,
    maintenanceAll,
    maintenanceKpis,
    properties,
    archivedProperties,
    refreshArchivedProperties,
    agencies,
    primaryAgency,
    portalAccessReady,
    hasFullManagementAccess,
    isInspectionOnlyAgent,
    platformBillingDisabled,
    inspections,
    rentReviews,
    vacating,
    tenantSelections,
    messages,
    documents,
    notifications,
    unreadNotificationCount,
    dashboardItems,
    sectionStatus,
    taskStatusList,
    dashboardKpis,
    leasingRecords,
    leasingCycles,
    archive,
    accounting,
    needActionItems,
    needActionGroups,
    tribunalCases,
    remindingItems: needActionItems,
    getPropertyActions,
    markNotificationRead,
    markAllNotificationsRead,
    markThreadRead,
    sendMessage,
    ensureMessageThread,
    openStaffSupportThread,
    addProperty,
    savePropertyRegistryDraft,
    endPropertyManagement,
    archiveProperty,
    deleteDraftProperty,
    addOpenInspection,
    registerInspection,
    uploadDocument,
    deleteDocument,
    approveMaintenanceQuote,
    declineMaintenanceQuote,
    requoteMaintenanceQuote,
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
