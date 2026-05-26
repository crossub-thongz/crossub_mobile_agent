'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

import { DataSourceBadge } from '@/components/agent/data-source-badge';
import { FilterChips } from '@/components/agent/filter-chips';
import { TaskCard } from '@/components/agent/task-card';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants/routes';
import { useAgentData } from '@/components/providers/agent-data-provider';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'approval', label: 'Approval' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
];

export default function DashboardPage() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const {
    dashboardItems,
    notifications,
    properties,
    loading,
    apiConnected,
    apiError,
    refresh,
    maintenanceKpis,
    maintenanceAll,
    inspections,
    rentReviews,
  } = useAgentData();

  const items = useMemo(() => {
    let list = [...dashboardItems];
    if (filter === 'approval') list = list.filter((i) => i.requiresApproval);
    if (filter === 'urgent') list = list.filter((i) => i.priority === 'urgent');
    if (filter === 'upcoming')
      list = list.filter((i) => i.dueAt && !i.requiresApproval);
    if (filter === 'overdue')
      list = list.filter((i) => i.overdueHours != null && i.overdueHours >= 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.propertyAddress.toLowerCase().includes(q),
      );
    }
    return list;
  }, [dashboardItems, filter, search]);

  const approvals = dashboardItems.filter((i) => i.requiresApproval);
  const unread = notifications.filter((n) => !n.read).length;
  const vacantCount = properties.filter((p) => p.leaseStatus === 'vacant').length;
  const maintenancePending = maintenanceAll.filter(
    (m) => m.requiresApproval || !['Closed', 'closed'].includes(m.status),
  ).length;
  const inspectionsScheduled = inspections.filter((i) =>
    ['Scheduled', 'Confirmed', 'In Progress'].includes(i.status),
  ).length;
  const rentReviewsDue = rentReviews.filter((r) => r.requiresApproval).length;
  const upcoming = dashboardItems.filter(
    (i) => i.dueAt && !i.requiresApproval && !i.overdueHours,
  );
  const pushShown = useRef(false);

  useEffect(() => {
    if (pushShown.current || loading) return;
    const urgent = notifications.filter((n) => !n.read && n.type === 'approval');
    if (urgent.length > 0) {
      pushShown.current = true;
      toast.info(urgent[0].title, {
        description: urgent[0].actionRequired ?? urgent[0].body,
        action: {
          label: 'Open',
          onClick: () => {
            window.location.href = urgent[0].href;
          },
        },
      });
    }
  }, [loading, notifications]);

  return (
    <AgentShell title="Command Centre">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search address, task…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link
            href={ROUTES.SEARCH}
            className="text-primary shrink-0 text-xs font-medium"
          >
            Global
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DataSourceBadge source={apiConnected ? 'api' : 'demo'} />
          {apiError && (
            <span className="text-destructive text-xs">{apiError}</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>

        {maintenanceKpis && maintenanceKpis.overdue > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs">
            <p className="text-destructive font-semibold">Overdue · SLA breached</p>
            <p className="text-muted-foreground mt-1">
              {maintenanceKpis.overdue} maintenance job(s) exceeded expected timeframe.
              CROSSUB has been notified internally.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={AlertTriangle} label="Approval required" value={approvals.length} tone="primary" href={ROUTES.NOTIFICATIONS} />
          <StatTile icon={Clock} label="Unread alerts" value={unread} tone="destructive" href={ROUTES.NOTIFICATIONS} />
          <StatTile icon={Building2} label="Active properties" value={properties.filter((p) => p.leaseStatus !== 'vacant').length} href={ROUTES.PROPERTIES} />
          <StatTile icon={Calendar} label="Portfolio tasks" value={dashboardItems.length} href={ROUTES.INSPECTIONS} />
        </div>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Portfolio snapshot</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <SnapshotItem label="Vacant" value={vacantCount} href={ROUTES.PROPERTIES} />
            <SnapshotItem label="Maint. pending" value={maintenancePending} href={ROUTES.MAINTENANCE} />
            <SnapshotItem label="Inspections scheduled" value={inspectionsScheduled} href={ROUTES.INSPECTIONS} />
            <SnapshotItem label="Rent reviews due" value={rentReviewsDue} href={ROUTES.RENT_REVIEW} />
          </dl>
        </section>

        {upcoming.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Upcoming tasks</h2>
            {upcoming.slice(0, 3).map((item) => (
              <TaskCard key={item.id} item={item} compact />
            ))}
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Approval required</h2>
          {approvals.length === 0 ? (
            <EmptyTile icon={CheckCircle2} text="No pending approvals" />
          ) : (
            approvals.slice(0, 5).map((item) => <TaskCard key={item.id} item={item} />)
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Recent updates</h2>
          <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
          <div className="space-y-2 pt-1">
            {items.map((item) => (
              <TaskCard key={item.id} item={item} compact />
            ))}
          </div>
        </section>
      </div>
    </AgentShell>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  href,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  tone?: 'primary' | 'destructive';
  href: string;
}) {
  return (
    <Link href={href} className="rounded-xl border bg-card p-3 active:bg-secondary/50">
      <Icon className={tone === 'primary' ? 'text-primary size-4' : tone === 'destructive' ? 'text-destructive size-4' : 'text-muted-foreground size-4'} />
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-muted-foreground text-[11px] leading-tight">{label}</p>
    </Link>
  );
}

function EmptyTile({ icon: Icon, text }: { icon: typeof CheckCircle2; text: string }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm">
      <Icon className="size-4 shrink-0" />
      {text}
    </div>
  );
}

function SnapshotItem({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="rounded-lg border px-3 py-2 active:bg-secondary/50">
      <p className="text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </Link>
  );
}
