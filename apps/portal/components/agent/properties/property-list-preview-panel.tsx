'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  Wrench,
  X,
} from 'lucide-react';

import { PropertyProfileIncludedUsage } from '@/components/agent/property-profile/property-profile-included-usage';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { propertyDetail } from '@/constants/routes';
import {
  buildCrosHandlingJobs,
  buildPropertyProfileMetrics,
  buildPropertyUpcomingItems,
  filterNeedAttentionActions,
  leaseOccupancyLabel,
  propertyProfileSectionsForAccess,
  type PropertyProfileSection,
} from '@/lib/property-profile-v2-data';
import { isPropertyVacant } from '@/lib/property-leasing';
import {
  propertyJobDisplaySubtext,
  propertyJobDisplayTitle,
} from '@/lib/property-job-rows';
import {
  formatProfileLeaseStatus,
  resolveBondOverviewDisplay,
  resolveCurrentRent,
  resolveLeaseDates,
} from '@/lib/property-overview';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import { householdTenantsFromOverview } from '@/lib/property-parties';
import { parseTenancyArchiveSnapshots } from '@/lib/property-archive';
import { TenancyPagerControls } from '@/components/agent/tenancy-pager-controls';
import { buildTenancyViewPages, wrapTenancyPageIndex } from '@/lib/tenancy-view-pages';
import { tenancyReferenceLabel } from '@/lib/workflow-case-reference';
import { useAgentStore } from '@/lib/store';
import type { Property } from '@/lib/types';
import { usePropertyIncludedUsage } from '@/lib/use-property-included-usage';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

import '@/components/agent/property-profile/property-profile-v2.css';

function PreviewMetric({
  label,
  value,
  tone,
  frosted = false,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warn' | 'muted';
  frosted?: boolean;
}) {
  return (
    <div
      className={cn(
        'property-profile-v2__metric rounded-xl border px-3 py-2.5',
        frosted ? 'v2-frosted-surface' : 'bg-background/60',
      )}
    >
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-sm font-semibold leading-snug tabular-nums',
          tone === 'good' && 'text-primary',
          tone === 'warn' && 'text-amber-700 dark:text-amber-300',
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DetailRow({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5 text-sm sm:flex-row sm:items-baseline sm:gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn('min-w-0 font-medium', valueClassName)}>{value}</span>
    </div>
  );
}

const PANEL_ICON_BUTTON =
  'text-muted-foreground hover:text-foreground hover:bg-muted/70 rounded-lg border p-1.5 transition-colors';

function formatTabLabel(label: string, count?: number) {
  if (count != null && count > 0) return `${label} (${count})`;
  return label;
}

export function PropertyListPreviewPanel({
  property,
  onClose,
  variant = 'inline',
}: {
  property: Property;
  onClose: () => void;
  variant?: 'inline' | 'shell';
}) {
  const propertyId = property.id;
  const {
    maintenanceAll,
    inspections,
    rentReviews,
    leasingCycles,
    tenantSelections,
    vacating,
    tribunalCases,
    accounting,
    leasingRecords,
    apiConnected,
    getPropertyActions,
    hasFullManagementAccess,
  } = useAgentData();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);

  const currentLease = leasingRecords.find(
    (row) => row.propertyId === propertyId && row.status === 'current',
  );
  const includedUsage = usePropertyIncludedUsage(propertyId, property.agencyId);
  const acct = accounting.find((row) => row.propertyId === propertyId) ?? null;
  const sync = usePropertyOverviewSync(property, apiConnected);

  const propertyMaintenance = useMemo(
    () => maintenanceAll.filter((row) => row.propertyId === propertyId),
    [maintenanceAll, propertyId],
  );
  const propertyInspections = useMemo(
    () => inspections.filter((row) => row.propertyId === propertyId),
    [inspections, propertyId],
  );
  const propertyRentReviews = useMemo(
    () => rentReviews.filter((row) => row.propertyId === propertyId),
    [propertyId, rentReviews],
  );
  const propertyLeasingCycles = useMemo(
    () => leasingCycles.filter((row) => row.propertyId === propertyId),
    [leasingCycles, propertyId],
  );
  const propertyTenantSelections = useMemo(
    () => tenantSelections.filter((row) => row.propertyId === propertyId),
    [propertyId, tenantSelections],
  );
  const propertyVacatingCases = useMemo(
    () => vacating.filter((row) => row.propertyId === propertyId),
    [propertyId, vacating],
  );
  const propertyTribunalCases = useMemo(
    () => tribunalCases.filter((row) => row.propertyId === propertyId),
    [propertyId, tribunalCases],
  );
  const needActions = useMemo(() => getPropertyActions(propertyId), [getPropertyActions, propertyId]);

  const metrics = useMemo(() => {
    return buildPropertyProfileMetrics({
      property,
      currentLease,
      sync,
      accounting: acct,
      portalAccounting: sync.accounting,
    });
  }, [acct, currentLease, property, sync]);

  const crosJobs = useMemo(() => {
    return buildCrosHandlingJobs({
      propertyId,
      property,
      maintenance: propertyMaintenance,
      inspections: propertyInspections,
      rentReviews: propertyRentReviews,
      rentReviewDecisions,
      leasingCycles: propertyLeasingCycles,
      tenantSelections: propertyTenantSelections,
      vacatingCases: propertyVacatingCases,
      tribunalCases: propertyTribunalCases,
      accounting: acct,
      currentLease,
    });
  }, [
    acct,
    currentLease,
    property,
    propertyId,
    propertyInspections,
    propertyLeasingCycles,
    propertyMaintenance,
    propertyRentReviews,
    propertyTenantSelections,
    propertyTribunalCases,
    propertyVacatingCases,
    rentReviewDecisions,
  ]);

  const attention = filterNeedAttentionActions(needActions);
  const taskCount = crosJobs.length + attention.length;
  const [activeTab, setActiveTab] = useState<PropertyProfileSection>('overview');
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [tenancyPageIndex, setTenancyPageIndex] = useState(0);
  const previewTabs = useMemo(
    () => propertyProfileSectionsForAccess(hasFullManagementAccess),
    [hasFullManagementAccess],
  );

  useEffect(() => {
    setActiveTab('overview');
    setOptionsOpen(false);
  }, [propertyId]);

  useEffect(() => {
    if (activeTab === 'financials' && !hasFullManagementAccess) setActiveTab('overview');
  }, [activeTab, hasFullManagementAccess]);
  const upcoming = useMemo(() => {
    return buildPropertyUpcomingItems({
      sync,
      property,
      currentLease,
      inspections: propertyInspections,
      propertyId,
    });
  }, [currentLease, property, propertyId, propertyInspections, sync]);

  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : []);
  const { start: leaseStart, end: leaseEnd } = resolveLeaseDates(property, currentLease);
  const currentRent = resolveCurrentRent(property, currentLease);
  const financialRent = sync.financial?.currentRentWeekly;
  const registryRent = sync.record?.rentWeekly ?? property.rentWeekly;
  const displayRent =
    financialRent != null && financialRent > 0
      ? financialRent
      : registryRent != null && registryRent > 0
        ? registryRent
        : currentRent;
  const bondAmount =
    sync.financial?.bondAmount ??
    sync.record?.bondAmount ??
    property.bondAmount ??
    sync.bond?.amount ??
    null;
  const bond = resolveBondOverviewDisplay(
    bondAmount,
    sync.bond,
    Boolean(propertyLeasingCycles[0]?.id),
  );
  const leaseStatus = formatProfileLeaseStatus(
    property,
    sync.overview?.leaseEndDate ?? sync.record?.leaseEndDate ?? leaseEnd ?? property.leaseEnd,
  );
  const tenantName = sync.tenantContact?.name ?? sync.record?.tenantName ?? property.tenantName;
  const household = householdTenantsFromOverview({
    isVacant,
    record: sync.record,
    tenantContact: sync.tenantContact,
    property,
    contacts: sync.tenantContacts,
  });
  const tenancyPages = buildTenancyViewPages({
    household,
    archives: parseTenancyArchiveSnapshots(property.registryDraft),
    fallback: tenantName ? { name: tenantName } : undefined,
  });
  useEffect(() => {
    setTenancyPageIndex(0);
  }, [propertyId]);
  useEffect(() => {
    if (tenancyPageIndex >= tenancyPages.length) setTenancyPageIndex(0);
  }, [tenancyPageIndex, tenancyPages.length]);
  const activeTenancyPage = tenancyPages[tenancyPageIndex];
  const viewingPrevious = activeTenancyPage?.kind === 'previous';
  const archive = activeTenancyPage?.archive;
  const currentTenantCount = tenancyPages.filter((page) => page.kind === 'current').length;
  const tenancyRef = tenancyReferenceLabel(currentLease?.id?.trim() || propertyId);
  const tenancyHeading = isVacant
    ? 'Vacant'
    : viewingPrevious
      ? `${activeTenancyPage?.name ?? 'Previous tenant'}${
          archive?.vacateDate ? ` · vacated ${formatDate(archive.vacateDate)}` : ''
        }`
      : `${activeTenancyPage?.name ?? tenantName ?? '—'} (${tenancyRef})`;
  const tenantRowLabel = viewingPrevious
    ? 'Previous tenant'
    : currentTenantCount > 1
      ? `Tenant ${tenancyPageIndex + 1} of ${currentTenantCount}`
      : 'Tenant';
  const tenantRowValue = isVacant ? 'Vacant' : activeTenancyPage?.name || tenantName || '—';
  const profileHref = (section?: PropertyProfileSection) =>
    section && section !== 'overview'
      ? `${propertyDetail(propertyId)}?section=${section}`
      : propertyDetail(propertyId);

  const shell = variant === 'shell';
  const nestedSurface = shell ? 'v2-frosted-surface' : 'bg-card';
  const panelIconButton = cn(
    PANEL_ICON_BUTTON,
    shell && 'v2-frosted-nav border-transparent hover:border-border/60',
  );

  const content = (
    <>
      <div className={cn('border-border/40 border-b', shell ? 'px-4 py-4' : 'p-4')}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug">{property.address}</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {property.suburb}
              {property.state ? ` ${property.state}` : ''}
              {property.postcode ? ` ${property.postcode}` : ''}
            </p>
            <span
              className={cn(
                'mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                isVacant
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
              )}
            >
              {leaseOccupancyLabel(property, isVacant)}
            </span>
          </div>
          <div className="relative z-10 flex shrink-0 items-center gap-1">
            <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={panelIconButton}
                  aria-label="Property options"
                >
                  <MoreHorizontal className="size-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-48 p-1">
                <Link
                  href={profileHref()}
                  onClick={() => setOptionsOpen(false)}
                  className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  View property
                </Link>
                <Link
                  href={profileHref('tasks')}
                  onClick={() => setOptionsOpen(false)}
                  className="hover:bg-muted/60 block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                >
                  View tasks
                </Link>
              </PopoverContent>
            </Popover>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              className={panelIconButton}
              aria-label="Close property preview"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {metrics ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <PreviewMetric label="Rent" value={metrics.rentLabel} frosted={shell} />
            <PreviewMetric label="Lease expiry" value={metrics.leaseExpiryLabel} frosted={shell} />
            <PreviewMetric label="Bond" value={metrics.bondLabel} frosted={shell} />
            {hasFullManagementAccess ? (
              <PreviewMetric
                label="Arrears"
                value={metrics.arrearsLabel}
                tone={metrics.rentStatusTone === 'warn' ? 'warn' : undefined}
                frosted={shell}
              />
            ) : includedUsage ? (
              <PropertyProfileIncludedUsage
                usage={includedUsage}
                className={shell ? 'v2-frosted-surface' : 'bg-background/60'}
              />
            ) : null}
            {hasFullManagementAccess && includedUsage ? (
              <PropertyProfileIncludedUsage
                usage={includedUsage}
                className={shell ? 'v2-frosted-surface' : 'bg-background/60'}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-border/40 border-b px-2">
        <nav className="scrollbar-none flex gap-1 overflow-x-auto">
          {previewTabs.map((tab) => {
            const count = tab.id === 'tasks' ? taskCount : undefined;
            const label = formatTabLabel(tab.label, count);
            const isActive = shell ? activeTab === tab.id : tab.id === 'overview';

            if (shell) {
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'shrink-0 border-b-2 px-2.5 py-2.5 text-xs font-semibold transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground border-transparent hover:border-primary/30',
                  )}
                >
                  {label}
                </button>
              );
            }

            return (
              <Link
                key={tab.id}
                href={profileHref(tab.id)}
                className={cn(
                  'shrink-0 border-b-2 px-2.5 py-2.5 text-xs font-semibold transition-colors',
                  tab.id === 'overview'
                    ? 'border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground border-transparent hover:border-primary/30',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        <section className="space-y-4">
          {(shell ? activeTab === 'overview' : true) ? (
            <>
              <div>
                <div className="mb-0.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">
                      {viewingPrevious ? 'Previous tenancy' : 'Current tenancy'}
                    </h3>
                    <p className="text-muted-foreground text-xs">{tenancyHeading}</p>
                  </div>
                  <TenancyPagerControls
                    index={tenancyPageIndex}
                    count={tenancyPages.length}
                    onPrev={() =>
                      setTenancyPageIndex((index) =>
                        wrapTenancyPageIndex(index, tenancyPages.length, -1),
                      )
                    }
                    onNext={() =>
                      setTenancyPageIndex((index) =>
                        wrapTenancyPageIndex(index, tenancyPages.length, 1),
                      )
                    }
                  />
                </div>
                <div className={cn('mt-2 rounded-xl border p-3', nestedSurface)}>
                  <DetailRow label={tenantRowLabel} value={tenantRowValue} />
                  <DetailRow
                    label="Lease period"
                    value={
                      viewingPrevious
                        ? archive?.leaseStartDate && archive?.leaseEndDate
                          ? `${formatDate(archive.leaseStartDate)} – ${formatDate(archive.leaseEndDate)}`
                          : archive?.leaseStartDate || archive?.leaseEndDate
                            ? formatDate(archive?.leaseStartDate || archive?.leaseEndDate || '')
                            : '—'
                        : leaseStart && leaseEnd
                          ? `${formatDate(leaseStart)} – ${formatDate(leaseEnd)}`
                          : leaseStatus
                    }
                  />
                  <DetailRow
                    label="Rent"
                    value={
                      viewingPrevious
                        ? '—'
                        : displayRent != null && displayRent > 0
                          ? `${formatCurrency(displayRent)} / week`
                          : '—'
                    }
                  />
                  <DetailRow
                    label="Rent review"
                    value={
                      viewingPrevious
                        ? '—'
                        : sync.overview?.nextRentReviewDate ??
                            sync.record?.nextRentReviewAt ??
                            property.nextRentReview
                          ? formatDate(
                              sync.overview?.nextRentReviewDate ??
                                sync.record?.nextRentReviewAt ??
                                property.nextRentReview!,
                            )
                          : '—'
                    }
                  />
                  <DetailRow
                    label="Bond"
                    value={
                      viewingPrevious
                        ? archive?.bondAmount != null
                          ? formatCurrency(archive.bondAmount)
                          : '—'
                        : bond.amountLabel !== '—'
                          ? `${bond.amountLabel}${bond.bondIdLabel !== '—' ? ' (Held)' : ''}`
                          : '—'
                    }
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">CROS is handling ({crosJobs.length})</h3>
                  <Link
                    href={profileHref('tasks')}
                    className="text-primary text-xs font-semibold transition-colors hover:underline"
                  >
                    View all tasks →
                  </Link>
                </div>
                {crosJobs.length === 0 ? (
                  <p className={cn('text-muted-foreground rounded-xl border p-3 text-sm', nestedSurface)}>
                    No active CROSSUB jobs for this property.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {crosJobs.map((job) => (
                      <li
                        key={job.id}
                        className={cn(
                          'property-profile-v2__cros-item rounded-xl border p-3',
                          shell && 'v2-frosted-surface',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                            {job.kind === 'maintenance' ? (
                              <Wrench className="size-4" />
                            ) : job.kind === 'inspection' ? (
                              <Calendar className="size-4" />
                            ) : (
                              <Briefcase className="size-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {propertyJobDisplayTitle(job)}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {propertyJobDisplaySubtext(job)}
                            </p>
                            <span className="mt-1.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              No action required
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Needs your attention ({attention.length})</h3>
                {attention.length === 0 ? (
                  <p className={cn('text-muted-foreground rounded-xl border p-3 text-sm', nestedSurface)}>
                    No action required at the moment.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {attention.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="property-profile-v2__attention block rounded-xl border p-3 text-sm font-medium transition-opacity hover:opacity-90"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Upcoming</h3>
                {upcoming.length === 0 ? (
                  <p className={cn('text-muted-foreground rounded-xl border p-3 text-sm', nestedSurface)}>
                    No upcoming dates scheduled.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {upcoming.map((item) => (
                      <li
                        key={item.id}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm',
                          nestedSurface,
                        )}
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {item.dateLabel}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}

          {shell && activeTab === 'tasks' ? (
            <>
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">CROS is handling ({crosJobs.length})</h3>
                  <Link
                    href={profileHref('tasks')}
                    className="text-primary text-xs font-semibold transition-colors hover:underline"
                  >
                    View all tasks →
                  </Link>
                </div>
                {crosJobs.length === 0 ? (
                  <p className={cn('text-muted-foreground rounded-xl border p-3 text-sm', nestedSurface)}>
                    No active CROSSUB jobs for this property.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {crosJobs.map((job) => (
                      <li
                        key={job.id}
                        className={cn(
                          'property-profile-v2__cros-item rounded-xl border p-3',
                          shell && 'v2-frosted-surface',
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                            {job.kind === 'maintenance' ? (
                              <Wrench className="size-4" />
                            ) : job.kind === 'inspection' ? (
                              <Calendar className="size-4" />
                            ) : (
                              <Briefcase className="size-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold">
                              {propertyJobDisplayTitle(job)}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {propertyJobDisplaySubtext(job)}
                            </p>
                            <span className="mt-1.5 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              No action required
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold">Needs your attention ({attention.length})</h3>
                {attention.length === 0 ? (
                  <p className={cn('text-muted-foreground rounded-xl border p-3 text-sm', nestedSurface)}>
                    No action required at the moment.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {attention.map((item) => (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="property-profile-v2__attention block rounded-xl border p-3 text-sm font-medium transition-opacity hover:opacity-90"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}

          {shell && activeTab === 'financials' ? (
            <div className={cn('rounded-xl border p-4 text-sm', nestedSurface)}>
              <p className="font-medium">Arrears and rent chasing</p>
              <p className="text-muted-foreground mt-1">
                Record rent, bill, or bond arrears, then open a tribunal case from the property
                profile.
              </p>
              <Link
                href={profileHref('financials')}
                className="text-primary mt-3 inline-flex items-center gap-1 font-semibold transition-colors hover:underline"
              >
                View financials
                <ChevronRight className="size-4" />
              </Link>
            </div>
          ) : null}

          {shell && activeTab === 'documents' ? (
            <div className={cn('rounded-xl border p-4 text-sm', nestedSurface)}>
              <p className="text-muted-foreground">
                Leases, notices, and property documents are available on the property profile.
              </p>
              <Link
                href={profileHref('documents')}
                className="text-primary mt-3 inline-flex items-center gap-1 font-semibold transition-colors hover:underline"
              >
                View documents
                <ChevronRight className="size-4" />
              </Link>
            </div>
          ) : null}

          {shell && activeTab === 'archive' ? (
            <div className={cn('rounded-xl border p-4 text-sm', nestedSurface)}>
              <p className="text-muted-foreground">
                Previous landlords and tenancies for this property are kept on Archive.
              </p>
              <Link
                href={profileHref('archive')}
                className="text-primary mt-3 inline-flex items-center gap-1 font-semibold transition-colors hover:underline"
              >
                View archive
                <ChevronRight className="size-4" />
              </Link>
            </div>
          ) : null}

          {shell && activeTab === 'activities' ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold">Upcoming</h3>
              {upcoming.length === 0 ? (
                <p className={cn('text-muted-foreground rounded-xl border p-3 text-sm', nestedSurface)}>
                  No upcoming dates scheduled.
                </p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((item) => (
                    <li
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm',
                        nestedSurface,
                      )}
                    >
                      <span className="font-medium">{item.label}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {item.dateLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={profileHref('activities')}
                className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:underline"
              >
                View all activity
                <ChevronRight className="size-4" />
              </Link>
            </div>
          ) : null}
        </section>
      </div>

      <div className="border-t p-4">
        <Link
          href={profileHref()}
          className="text-primary inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:underline"
        >
          View property
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </>
  );

  if (shell) {
    return (
      <div className="property-list-v2__shell-panel v2-frosted-surface flex h-full min-h-0 w-full flex-col overflow-hidden rounded-none border-0">
        {content}
      </div>
    );
  }

  return (
    <aside className="property-list-v2__panel v2-dashboard__card hidden w-[22rem] shrink-0 flex-col overflow-hidden rounded-2xl border xl:flex xl:w-[24rem]">
      {content}
    </aside>
  );
}
