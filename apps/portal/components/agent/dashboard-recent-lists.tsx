'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Building2, ChevronRight, ClipboardList } from 'lucide-react';

import { propertyDetail } from '@/constants/routes';
import {
  readRecentCaseVisits,
  RECENT_CASES_UPDATED_EVENT,
  type RecentCaseVisit,
} from '@/lib/recent-cases';
import {
  readRecentPropertyVisits,
  RECENT_PROPERTIES_UPDATED_EVENT,
  type RecentPropertyVisit,
} from '@/lib/recent-properties';

function RecentList({
  title,
  icon: Icon,
  emptyMessage,
  items,
  renderItem,
  showTitle = true,
}: {
  title: string;
  icon: typeof Building2;
  emptyMessage: string;
  items: { id: string }[];
  renderItem: (item: { id: string }) => React.ReactNode;
  showTitle?: boolean;
}) {
  return (
    <section className="flex h-full flex-col gap-2">
      {showTitle ? (
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="text-primary size-4" />
          {title}
        </h3>
      ) : null}
      {items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center">
          <p className="text-muted-foreground text-xs">{emptyMessage}</p>
        </div>
      ) : (
        <ul className="divide-y overflow-auto rounded-xl border bg-card shadow-sm">
          {items.map((item) => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

const MODULE_LABEL: Record<RecentCaseVisit['module'], string> = {
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  rent_review: 'Rent review',
  leasing: 'Leasing',
  end_leasing: 'End leasing',
  tribunal: 'Tribunal',
};

function useRecentVisits() {
  const [recentProperties, setRecentProperties] = useState<RecentPropertyVisit[]>([]);
  const [recentCases, setRecentCases] = useState<RecentCaseVisit[]>([]);

  const refresh = useCallback(() => {
    setRecentProperties(readRecentPropertyVisits());
    setRecentCases(readRecentCaseVisits());
  }, []);

  useEffect(() => {
    refresh();
    const onProperties = () => refresh();
    const onCases = () => refresh();
    const onStorage = () => refresh();
    window.addEventListener(RECENT_PROPERTIES_UPDATED_EVENT, onProperties);
    window.addEventListener(RECENT_CASES_UPDATED_EVENT, onCases);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(RECENT_PROPERTIES_UPDATED_EVENT, onProperties);
      window.removeEventListener(RECENT_CASES_UPDATED_EVENT, onCases);
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  return { recentProperties, recentCases };
}

export function DashboardRecentPropertiesList({ showTitle = true }: { showTitle?: boolean }) {
  const { recentProperties } = useRecentVisits();

  return (
    <RecentList
      title="Recent properties"
      icon={Building2}
      showTitle={showTitle}
      emptyMessage="Properties you open will appear here."
      items={recentProperties}
      renderItem={(item) => {
        const visit = recentProperties.find((p) => p.id === item.id)!;
        return (
          <Link
            href={propertyDetail(visit.id)}
            className="flex items-center gap-3 px-3 py-3 text-sm transition hover:bg-muted/30"
          >
            <span className="min-w-0 flex-1 leading-snug font-medium">{visit.label}</span>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </Link>
        );
      }}
    />
  );
}

export function DashboardRecentCasesList({ showTitle = true }: { showTitle?: boolean }) {
  const { recentCases } = useRecentVisits();

  return (
    <RecentList
      title="Recent cases"
      icon={ClipboardList}
      showTitle={showTitle}
      emptyMessage="Maintenance, inspections, and other cases you open will appear here."
      items={recentCases}
      renderItem={(item) => {
        const visit = recentCases.find((c) => c.id === item.id)!;
        return (
          <Link
            href={visit.href}
            className="flex items-center gap-3 px-3 py-3 text-sm transition hover:bg-muted/30"
          >
            <div className="min-w-0 flex-1">
              <p className="leading-snug font-medium">{visit.label}</p>
              <p className="text-muted-foreground mt-0.5 text-[11px]">
                {MODULE_LABEL[visit.module]}
              </p>
            </div>
            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
          </Link>
        );
      }}
    />
  );
}

export function DashboardRecentLists() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <DashboardRecentPropertiesList />
      <DashboardRecentCasesList />
    </div>
  );
}
