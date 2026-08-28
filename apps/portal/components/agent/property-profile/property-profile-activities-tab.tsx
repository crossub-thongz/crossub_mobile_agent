'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  inspectionDetail,
  maintenanceDetail,
  rentReviewDetail,
  tenantSelectionDetail,
  tribunalDetail,
  vacatingDetail,
} from '@/constants/routes';
import {
  listAgentChargeHistory,
  type AgentBillingCharge,
} from '@/lib/crossub-api/agent-billing-client';
import { fromProperty } from '@/lib/detail-navigation';
import {
  buildPropertyProfileActivities,
  filterPropertyProfileActivities,
  groupPropertyProfileActivitiesByDay,
  PROPERTY_PROFILE_ACTIVITY_FILTERS,
  type PropertyProfileActivity,
  type PropertyProfileActivityFilter,
} from '@/lib/property-profile-activities';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import type {
  Inspection,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import { cn } from '@/lib/utils';

import '@/components/agent/property-profile/property-profile-v2.css';

function ActivitySubtitle({ activity }: { activity: PropertyProfileActivity }) {
  const hasSubtitle = Boolean(activity.subtitle);
  const hasCaseRef = Boolean(activity.caseRef && activity.href);

  if (!hasSubtitle && !hasCaseRef) return null;

  return (
    <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
      {hasSubtitle ? <span>{activity.subtitle}</span> : null}
      {hasCaseRef ? (
        <>
          {hasSubtitle ? <span> · </span> : null}
          <Link
            href={activity.href!}
            className="text-primary font-semibold tabular-nums hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {activity.caseRef}
          </Link>
        </>
      ) : null}
    </p>
  );
}

function ActivityRow({
  activity,
  onOpen,
}: {
  activity: PropertyProfileActivity;
  onOpen: (activity: PropertyProfileActivity) => void;
}) {
  const clickable = Boolean(activity.href);

  return (
    <div className="relative flex gap-4 py-4">
      <div className="w-16 shrink-0 pt-0.5 text-right text-sm font-medium tabular-nums">
        {activity.timeLabel}
      </div>

      <div className="relative flex w-4 shrink-0 justify-center">
        <span
          className="bg-primary ring-card relative z-10 mt-1.5 size-2.5 rounded-full ring-[3px]"
          aria-hidden
        />
      </div>

      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={() => {
          if (clickable) onOpen(activity);
        }}
        onKeyDown={(event) => {
          if (!clickable) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(activity);
          }
        }}
        className={cn(
          'grid min-w-0 flex-1 gap-1 text-left sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4',
          clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default',
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">{activity.title}</p>
          <ActivitySubtitle activity={activity} />
        </div>
        <p className="text-muted-foreground shrink-0 text-sm sm:text-right">
          by {activity.actorLabel}
        </p>
      </div>
    </div>
  );
}

export function PropertyProfileActivitiesTab({
  property,
  propertyId,
  maintenance,
  inspections,
  rentReviews,
  tenantSelections,
  vacatingCases,
  tribunalCases,
  accounting,
}: {
  property: Property;
  propertyId: string;
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  tribunalCases: TribunalCase[];
  accounting?: PropertyAccounting | null;
}) {
  const router = useRouter();
  const { apiConnected, notifications } = useAgentData();
  const { detail } = usePropertyPortalDetail(propertyId, apiConnected);
  const sync = usePropertyOverviewSync(property, apiConnected);
  const navContext = useMemo(() => fromProperty(propertyId, 'Activities'), [propertyId]);

  const [filter, setFilter] = useState<PropertyProfileActivityFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [billingCharges, setBillingCharges] = useState<AgentBillingCharge[]>([]);

  useEffect(() => {
    if (!apiConnected) {
      setBillingCharges([]);
      return;
    }
    let cancelled = false;
    void listAgentChargeHistory(propertyId)
      .then((rows) => {
        if (!cancelled) setBillingCharges(rows);
      })
      .catch(() => {
        if (!cancelled) setBillingCharges([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiConnected, propertyId]);

  const allActivities = useMemo(
    () =>
      buildPropertyProfileActivities({
        property,
        propertyId,
        maintenance,
        inspections,
        rentReviews,
        tenantSelections,
        vacatingCases,
        tribunalCases,
        notifications,
        accounting,
        portalAccounting: detail?.accounting ?? sync.accounting ?? null,
        maintenanceHref: (id) => maintenanceDetail(id, navContext),
        inspectionHref: (id) => inspectionDetail(id, navContext),
        rentReviewHref: (id) => rentReviewDetail(id, navContext),
        tenantSelectionHref: (id) => tenantSelectionDetail(id, navContext),
        vacatingHref: (id) => vacatingDetail(id, navContext),
        tribunalHref: (id) => tribunalDetail(id, navContext),
        financialsHref: `/properties/${propertyId}?section=financials`,
        billingCharges,
      }),
    [
      property,
      propertyId,
      maintenance,
      inspections,
      rentReviews,
      tenantSelections,
      vacatingCases,
      tribunalCases,
      notifications,
      accounting,
      detail?.accounting,
      sync.accounting,
      navContext,
      billingCharges,
    ],
  );

  const filteredActivities = useMemo(
    () => filterPropertyProfileActivities(allActivities, filter),
    [allActivities, filter],
  );

  const groupedActivities = useMemo(
    () => groupPropertyProfileActivitiesByDay(filteredActivities),
    [filteredActivities],
  );

  const activeFilterLabel =
    PROPERTY_PROFILE_ACTIVITY_FILTERS.find((option) => option.id === filter)?.label ??
    'All';

  const openActivity = (activity: PropertyProfileActivity) => {
    if (!activity.href) return;
    router.push(activity.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Activities</h3>

        <div className="relative">
          <button
            type="button"
            onClick={() => setFilterOpen((open) => !open)}
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold"
          >
            Filter
            <ChevronDown className={cn('size-4 transition', filterOpen && 'rotate-180')} />
          </button>

          {filterOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close filter menu"
                onClick={() => setFilterOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-2 min-w-[10rem] rounded-xl border bg-card p-1 shadow-lg">
                {PROPERTY_PROFILE_ACTIVITY_FILTERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setFilter(option.id);
                      setFilterOpen(false);
                    }}
                    className={cn(
                      'flex w-full rounded-lg px-3 py-2 text-left text-sm',
                      filter === option.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'hover:bg-muted/60',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {filter !== 'all' ? (
        <p className="text-muted-foreground text-xs">
          Showing <span className="font-medium text-foreground">{activeFilterLabel}</span>{' '}
          activities
        </p>
      ) : null}

      {groupedActivities.length === 0 ? (
        <div className="v2-dashboard__card rounded-2xl border px-4 py-8 text-center">
          <p className="text-sm font-medium">No activities yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Workflow updates, payments, and tenant actions for this property will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedActivities.map((group) => (
            <section key={group.dayKey} className="space-y-1">
              <h4 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                {group.label}
              </h4>
              <div className="property-profile-activities__day-card relative rounded-2xl border bg-card px-4">
                {group.items.length > 1 ? (
                  <span
                    className="property-profile-activities__timeline-line bg-border absolute"
                    aria-hidden
                  />
                ) : null}
                {group.items.map((activity, index) => (
                  <div
                    key={activity.id}
                    className={cn(index < group.items.length - 1 && 'border-b border-border/50')}
                  >
                    <ActivityRow activity={activity} onOpen={openActivity} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
