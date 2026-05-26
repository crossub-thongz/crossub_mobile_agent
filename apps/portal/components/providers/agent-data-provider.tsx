'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  approveMaintenanceQuotation,
  declineMaintenanceQuotation,
  fetchMaintenanceKpis,
  fetchMaintenanceState,
} from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceState } from '@/lib/crossub-api/types';
import {
  maintenanceNotificationsToAgent,
  mapApiMaintenanceRequest,
  type MappedMaintenance,
} from '@/lib/data/map-maintenance';
import {
  DASHBOARD_ITEMS,
  DOCUMENTS,
  INSPECTIONS,
  MAINTENANCE as DEMO_MAINTENANCE,
  MESSAGE_THREADS,
  NOTIFICATIONS as DEMO_NOTIFICATIONS,
  PROPERTIES,
  RENT_REVIEWS,
  TENANT_SELECTIONS,
  VACATING,
} from '@/lib/mock-data';
import type {
  AgentDocument,
  AgentNotification,
  DashboardItem,
  Inspection,
  MaintenanceRequest,
  MessageThread,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  VacatingCase,
} from '@/lib/types';
import { maintenanceDetail, tenantSelectionDetail } from '@/constants/routes';

interface AgentDataContextValue {
  loading: boolean;
  apiConnected: boolean;
  apiError: string | null;
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
  markNotificationRead: (id: string) => void;
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
      title: `${kpis.overdue} maintenance item(s) overdue SLA`,
      subtitle: 'Escalated internally — action may be required',
      priority: 'urgent',
      status: 'Overdue',
      overdueHours: 24,
      requiresApproval: false,
      href: '/maintenance?filter=overdue',
      updatedAt: new Date().toISOString(),
      source: 'api' as const,
    });
  }

  return fromApi;
}

export function AgentDataProvider({ children }: { children: React.ReactNode }) {
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
    void refresh();
  }, [refresh]);

  const maintenanceFromApi = useMemo(() => {
    if (!apiState) return [];
    return apiState.maintenanceRequests.map((req) =>
      mapApiMaintenanceRequest(
        req,
        apiState.contractors,
        apiState.quotations,
        apiState.maintenanceAuditLog,
        apiState.maintenanceNotifications,
      ),
    );
  }, [apiState]);

  const maintenanceAll = useMemo(() => {
    const demoIds = new Set(DEMO_MAINTENANCE.map((m) => m.id));
    const apiOnly = maintenanceFromApi.filter((m) => !demoIds.has(m.id));
    return [...apiOnly, ...DEMO_MAINTENANCE.map((m) => ({ ...m, source: 'demo' as const }))];
  }, [maintenanceFromApi]);

  const notifications = useMemo(() => {
    const apiNotifs = apiState
      ? maintenanceNotificationsToAgent(
          apiState.maintenanceNotifications,
          apiState.maintenanceRequests,
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
  }, [apiState, readIds]);

  const dashboardItems = useMemo(() => {
    const apiDash = buildDashboardFromApi(maintenanceFromApi, kpis);
    const tenantDash: DashboardItem[] = TENANT_SELECTIONS.filter(
      (t) => t.requiresApproval,
    ).map((t) => ({
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
    return [...apiDash, ...tenantDash, ...DASHBOARD_ITEMS];
  }, [maintenanceFromApi, kpis]);

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
    refresh,
    maintenanceFromApi,
    maintenanceAll,
    maintenanceKpis: kpis,
    properties: PROPERTIES,
    inspections: INSPECTIONS,
    rentReviews: RENT_REVIEWS,
    vacating: VACATING,
    tenantSelections: TENANT_SELECTIONS,
    messages: MESSAGE_THREADS,
    documents: DOCUMENTS,
    notifications,
    dashboardItems,
    markNotificationRead: (id) =>
      setReadIds((prev) => new Set(prev).add(id)),
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
