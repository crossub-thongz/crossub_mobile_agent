'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Briefcase,
  Calendar,
  ChevronRight,
  User,
  Wrench,
} from 'lucide-react';

import { PropertyProfileActionsMenu } from '@/components/agent/property-profile/property-profile-actions-menu';
import { PropertyProfileIncludedUsage } from '@/components/agent/property-profile/property-profile-included-usage';
import { PropertyProfilePhoto } from '@/components/agent/property-profile/property-profile-photo';
import { PropertyProfileDetails } from '@/components/agent/property-profile-details';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  buildCrosHandlingJobs,
  buildPropertyProfileMetrics,
  filterNeedAttentionActions,
  leaseOccupancyLabel,
  propertyProfileSectionsForAccess,
  type PropertyProfileSection,
} from '@/lib/property-profile-v2-data';
import {
  propertyJobDisplaySubtext,
  propertyJobDisplayTitle,
} from '@/lib/property-job-rows';
import {
  buildPropertyProfileTasks,
  countPropertyProfileTabTasks,
} from '@/lib/property-profile-tasks';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import { isPropertyVacant } from '@/lib/property-leasing';
import {
  formatProfileLeaseStatus,
  resolveBondOverviewDisplay,
  resolveCurrentRent,
  resolveLeaseDates,
} from '@/lib/property-overview';
import { householdTenantsFromOverview } from '@/lib/property-parties';
import { parseTenancyArchiveSnapshots } from '@/lib/property-archive';
import { TenancyPagerControls } from '@/components/agent/tenancy-pager-controls';
import { buildTenancyViewPages, wrapTenancyPageIndex } from '@/lib/tenancy-view-pages';
import { tenancyReferenceLabel } from '@/lib/workflow-case-reference';
import type {
  AgentDocument,
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyAccounting,
  PropertyNeedAction,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';
import type { RentReviewDecision } from '@/lib/rent-review';
import type { PropertyWorkflowActionId } from '@/lib/property-workflow-actions';
import { usePropertyIncludedUsage } from '@/lib/use-property-included-usage';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

import '@/components/agent/property-profile/property-profile-v2.css';

function ProfileCard({
  title,
  subtitle,
  icon: Icon,
  count,
  headerExtra,
  children,
  footer,
  className,
  bodyClassName,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  headerExtra?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        'property-profile-v2__card v2-dashboard__card flex min-h-0 flex-col overflow-hidden rounded-2xl border',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">
              {title}
              {count != null ? ` (${count})` : ''}
            </h3>
            {subtitle ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {headerExtra}
      </header>
      <div className={cn('flex-1 p-4', bodyClassName)}>{children}</div>
      {footer ? <footer className="border-t px-4 py-3">{footer}</footer> : null}
    </section>
  );
}

function DetailRow({ label, value, valueClassName }: { label: string; value: ReactNode; valueClassName?: string }) {
  return (
    <div className="grid grid-cols-1 items-baseline gap-0.5 border-b border-border/40 py-1.5 text-sm last:border-b-0 sm:col-span-2 sm:grid-cols-subgrid sm:gap-x-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('min-w-0 text-left font-medium', valueClassName)}>{value}</span>
    </div>
  );
}

function OverviewGrid({
  property,
  propertyId,
  currentLease,
  sync,
  accounting,
  needActions,
  maintenance,
  inspections,
  rentReviews,
  rentReviewDecisions,
  leasingCycles,
  tenantSelections,
  vacatingCases,
  tribunalCases,
  onViewTasks,
  onNeedActionClick,
}: {
  property: Property;
  propertyId: string;
  currentLease?: LeasingRecord;
  sync: ReturnType<typeof usePropertyOverviewSync>;
  accounting?: PropertyAccounting | null;
  needActions: PropertyNeedAction[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null>;
  leasingCycles: LeasingCycle[];
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  tribunalCases: TribunalCase[];
  onViewTasks: () => void;
  onNeedActionClick: (href: string) => void;
}) {
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
  const bond = resolveBondOverviewDisplay(bondAmount, sync.bond, Boolean(leasingCycles[0]?.id));
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
  const archives = parseTenancyArchiveSnapshots(property.registryDraft);
  const tenancyPages = buildTenancyViewPages({
    household,
    archives,
    fallback: tenantName ? { name: tenantName } : undefined,
  });
  const currentTenants = tenancyPages.filter((page) => page.kind === 'current');
  const previousPages = tenancyPages.filter((page) => page.kind === 'previous');
  const tenancyOverviewCount = 1 + previousPages.length;
  const [tenancyPageIndex, setTenancyPageIndex] = useState(0);
  useEffect(() => {
    setTenancyPageIndex(0);
  }, [propertyId]);
  useEffect(() => {
    if (tenancyPageIndex >= tenancyOverviewCount) setTenancyPageIndex(0);
  }, [tenancyPageIndex, tenancyOverviewCount]);
  const viewingPrevious = tenancyPageIndex > 0;
  const activePrevious = viewingPrevious ? previousPages[tenancyPageIndex - 1] : undefined;
  const archive = activePrevious?.archive;
  const tenancyRef = tenancyReferenceLabel(currentLease?.id?.trim() || propertyId);
  const currentTenancyTitle = isVacant ? 'Current Tenancy' : `Current Tenancy (${tenancyRef})`;
  const previousSubtitle = archive?.vacateDate ? `Vacated ${formatDate(archive.vacateDate)}` : undefined;
  const previousLeaseStart = archive?.leaseStartDate;
  const previousLeaseEnd = archive?.leaseEndDate;
  const crosJobs = buildCrosHandlingJobs({
    propertyId,
    property,
    maintenance,
    inspections,
    rentReviews,
    rentReviewDecisions,
    leasingCycles,
    tenantSelections,
    vacatingCases,
    tribunalCases,
    accounting,
    currentLease,
  });
  const attention = filterNeedAttentionActions(needActions);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProfileCard
        title={viewingPrevious ? 'Previous Tenancy' : currentTenancyTitle}
        subtitle={viewingPrevious ? previousSubtitle : undefined}
        icon={User}
        headerExtra={
          <TenancyPagerControls
            index={tenancyPageIndex}
            count={tenancyOverviewCount}
            onPrev={() =>
              setTenancyPageIndex((index) =>
                wrapTenancyPageIndex(index, tenancyOverviewCount, -1),
              )
            }
            onNext={() =>
              setTenancyPageIndex((index) =>
                wrapTenancyPageIndex(index, tenancyOverviewCount, 1),
              )
            }
          />
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-[max-content_minmax(0,1fr)]">
          {viewingPrevious ? (
            <DetailRow
              label="Previous Tenant"
              value={activePrevious?.name || '—'}
            />
          ) : isVacant || currentTenants.length === 0 ? (
            <DetailRow label="Tenant" value="Vacant" />
          ) : (
            currentTenants.map((tenant, index) => (
              <DetailRow
                key={tenant.id}
                label={currentTenants.length > 1 ? `Tenant ${index + 1}` : 'Tenant'}
                value={tenant.name}
              />
            ))
          )}
          <DetailRow
            label="Lease Period"
            value={
              viewingPrevious
                ? previousLeaseStart && previousLeaseEnd
                  ? `${formatDate(previousLeaseStart)} – ${formatDate(previousLeaseEnd)}`
                  : previousLeaseStart || previousLeaseEnd
                    ? formatDate(previousLeaseStart || previousLeaseEnd || '')
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
            label="Rent Review"
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
      </ProfileCard>

      <ProfileCard
        title="CROS Is Handling"
        icon={Briefcase}
        count={crosJobs.length}
        bodyClassName="p-0"
        footer={
          crosJobs.length > 0 ? (
            <button
              type="button"
              onClick={onViewTasks}
              className="text-primary flex w-full items-center justify-center gap-1 text-sm font-semibold"
            >
              View All Tasks
              <ChevronRight className="size-4" />
            </button>
          ) : null
        }
      >
        {crosJobs.length === 0 ? (
          <p className="text-muted-foreground px-4 py-4 text-sm">
            No active CROSSUB jobs for this property.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {crosJobs.map((job) => (
              <li key={job.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
                    {job.kind === 'maintenance' ? (
                      <Wrench className="size-4" />
                    ) : job.kind === 'inspection' ? (
                      <Calendar className="size-4" />
                    ) : (
                      <Briefcase className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">
                        {propertyJobDisplayTitle(job)}
                      </p>
                      <span className="bg-primary/12 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        {job.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {propertyJobDisplaySubtext(job)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[10px]">No Action Required</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ProfileCard>

      <ProfileCard
        title="Needs Your Attention"
        icon={AlertCircle}
        count={attention.length}
        className={attention.length > 0 ? 'property-profile-v2__attention' : undefined}
      >
        {attention.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing needs your approval right now.</p>
        ) : (
          <ul className="space-y-3">
            {attention.slice(0, 3).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNeedActionClick(item.href)}
                  className="property-profile-v2__attention w-full rounded-xl border p-3 text-left transition hover:opacity-90"
                >
                  <div className="flex items-start gap-2.5">
                    <Wrench className="text-rose-600 mt-0.5 size-4 shrink-0 dark:text-rose-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.label}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">{item.propertyAddress}</p>
                      <span className="mt-2 inline-block rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Approval Required
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ProfileCard>
    </div>
  );
}

export function PropertyProfileV2({
  property,
  propertyId,
  section,
  onSectionChange,
  needActions,
  currentLease,
  inspections,
  propertyDocs,
  leasingCycles,
  tenantSelections,
  vacatingCases,
  rentReviews,
  rentReviewDecisions,
  maintenance,
  tribunalCases,
  accounting,
  onViewBondLodgement,
  onRefresh,
  onNeedActionNavigate,
  onCustomWorkflowAction,
  onPhotoUpdated,
  tasksPanel,
  financialsPanel,
  documentsPanel,
  archivePanel,
  activitiesPanel,
  banners,
}: {
  property: Property;
  propertyId: string;
  section: PropertyProfileSection;
  onSectionChange: (section: PropertyProfileSection) => void;
  needActions: PropertyNeedAction[];
  currentLease?: LeasingRecord;
  inspections: Inspection[];
  propertyDocs: AgentDocument[];
  leasingCycles: LeasingCycle[];
  tenantSelections: TenantSelectionCase[];
  vacatingCases: VacatingCase[];
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null>;
  maintenance: MaintenanceRequest[];
  tribunalCases: TribunalCase[];
  accounting?: PropertyAccounting | null;
  onViewBondLodgement?: () => void;
  onRefresh?: () => void;
  onNeedActionNavigate: (href: string) => void;
  onCustomWorkflowAction?: (actionId: PropertyWorkflowActionId) => boolean;
  onPhotoUpdated?: (url: string) => void;
  tasksPanel: ReactNode;
  financialsPanel: ReactNode;
  documentsPanel: ReactNode;
  archivePanel: ReactNode;
  activitiesPanel: ReactNode;
  banners?: ReactNode;
}) {
  const { hasFullManagementAccess } = useAgentData();
  const activeCycle = leasingCycles[0];

  useEffect(() => {
    if (section === 'financials' && !hasFullManagementAccess) {
      onSectionChange('overview');
    }
  }, [hasFullManagementAccess, onSectionChange, section]);
  const sync = usePropertyOverviewSync(
    property,
    true,
    activeCycle,
    tenantSelections,
    currentLease,
  );
  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : []);
  const metrics = buildPropertyProfileMetrics({
    property,
    currentLease,
    sync,
    accounting,
    portalAccounting: sync.accounting,
  });
  const includedUsage = usePropertyIncludedUsage(propertyId, property.agencyId);
  const taskCount = useMemo(
    () =>
      countPropertyProfileTabTasks(
        buildPropertyProfileTasks({
          property,
          propertyId,
          maintenance,
          inspections,
          rentReviews,
          rentReviewDecisions,
          leasingCycles,
          tenantSelections,
          vacatingCases,
          tribunalCases,
          accounting,
          currentLease,
          needActions,
        }),
      ),
    [
      accounting,
      currentLease,
      inspections,
      leasingCycles,
      maintenance,
      needActions,
      property,
      propertyId,
      rentReviewDecisions,
      rentReviews,
      tenantSelections,
      tribunalCases,
      vacatingCases,
    ],
  );

  const streetLine = property.address;
  const suburbLine = [property.suburb, property.state, property.postcode].filter(Boolean).join(' ');

  const sectionTabs = useMemo(
    () =>
      propertyProfileSectionsForAccess(hasFullManagementAccess).map((tab) => ({
        ...tab,
        label:
          tab.id === 'tasks' && taskCount > 0 ? `${tab.label} (${taskCount})` : tab.label,
      })),
    [hasFullManagementAccess, taskCount],
  );

  return (
    <div className="v2-dashboard normal-case space-y-4 pb-8">
      {banners}

      <div className="v2-dashboard__card rounded-2xl border p-4 lg:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <PropertyProfilePhoto
            propertyId={propertyId}
            imageUrl={property.imageUrl}
            onImageUpdated={onPhotoUpdated}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight">{streetLine}</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">{suburbLine}</p>
                <span
                  className={cn(
                    'mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                    isVacant
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-primary/12 text-primary',
                  )}
                >
                  {leaseOccupancyLabel(property, isVacant)}
                </span>
              </div>
              <PropertyProfileActionsMenu
                property={property}
                propertyId={propertyId}
                leasingCycles={leasingCycles}
                rentReviews={rentReviews}
                vacatingCases={vacatingCases}
                maintenance={maintenance}
                inspections={inspections}
                tribunalCases={tribunalCases}
                currentLease={currentLease}
                tenantSelections={tenantSelections}
                onRefresh={onRefresh}
                onCustomAction={onCustomWorkflowAction}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { label: 'Rent', value: metrics.rentLabel },
            { label: 'Lease Expiry', value: metrics.leaseExpiryLabel },
            { label: 'Bond', value: metrics.bondLabel },
            ...(hasFullManagementAccess
              ? [
                  {
                    label: 'Arrears',
                    value: metrics.arrearsLabel,
                    tone: metrics.rentStatusTone,
                    onClick: () => onSectionChange('financials'),
                  },
                ]
              : []),
          ].map((metric) => {
            const clickable = 'onClick' in metric && typeof metric.onClick === 'function';
            const inner = (
              <>
                <p className="text-muted-foreground text-[10px] font-medium">
                  {metric.label}
                </p>
                <p
                  className={cn(
                    'mt-1 text-sm font-semibold leading-snug tabular-nums',
                    'tone' in metric &&
                      metric.tone === 'warn' &&
                      'text-amber-700 dark:text-amber-300',
                  )}
                >
                  {metric.value}
                </p>
              </>
            );
            return clickable ? (
              <button
                key={metric.label}
                type="button"
                onClick={metric.onClick}
                className="property-profile-v2__metric rounded-xl border bg-background/40 px-3 py-2.5 text-left"
              >
                {inner}
              </button>
            ) : (
              <div
                key={metric.label}
                className="property-profile-v2__metric rounded-xl border bg-background/40 px-3 py-2.5"
              >
                {inner}
              </div>
            );
          })}
          {includedUsage ? <PropertyProfileIncludedUsage usage={includedUsage} /> : null}
        </div>
      </div>

      <nav className="border-border/60 -mx-1 flex gap-1 overflow-x-auto border-b px-1 pb-px">
        {sectionTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSectionChange(tab.id)}
            className={cn(
              'property-profile-v2__tab text-muted-foreground shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition',
              section === tab.id && 'property-profile-v2__tab--active',
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {section === 'overview' ? (
        <div className="space-y-4">
          <OverviewGrid
            property={property}
            propertyId={propertyId}
            currentLease={currentLease}
            sync={sync}
            accounting={accounting}
            needActions={needActions}
            maintenance={maintenance}
            inspections={inspections}
            rentReviews={rentReviews}
            rentReviewDecisions={rentReviewDecisions}
            leasingCycles={leasingCycles}
            tenantSelections={tenantSelections}
            vacatingCases={vacatingCases}
            tribunalCases={tribunalCases}
            onViewTasks={() => onSectionChange('tasks')}
            onNeedActionClick={onNeedActionNavigate}
          />

          <PropertyProfileDetails
            property={property}
            propertyId={propertyId}
            currentLease={currentLease}
            inspections={inspections}
            propertyDocs={propertyDocs}
            leasingCycles={leasingCycles}
            tenantSelections={tenantSelections}
            vacatingCases={vacatingCases}
            rentReviews={rentReviews}
            onViewBondLodgement={onViewBondLodgement}
            onRefresh={onRefresh}
          />
        </div>
      ) : null}

      {section === 'tasks' ? <div className="space-y-4">{tasksPanel}</div> : null}
      {section === 'financials' && hasFullManagementAccess ? (
        <div className="space-y-4">{financialsPanel}</div>
      ) : null}
      {section === 'documents' ? <div className="space-y-4">{documentsPanel}</div> : null}
      {section === 'archive' ? <div className="space-y-4">{archivePanel}</div> : null}
      {section === 'activities' ? <div className="space-y-4">{activitiesPanel}</div> : null}
    </div>
  );
}
