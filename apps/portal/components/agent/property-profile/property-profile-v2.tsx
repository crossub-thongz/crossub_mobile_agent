'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  User,
  Wrench,
} from 'lucide-react';

import { PropertyProfileActionsMenu } from '@/components/agent/property-profile/property-profile-actions-menu';
import { PropertyProfileCalendarDialog } from '@/components/agent/property-profile/property-profile-calendar-dialog';
import { PropertyProfilePhoto } from '@/components/agent/property-profile/property-profile-photo';
import { PropertyProfileDetails } from '@/components/agent/property-profile-details';
import {
  buildCrosHandlingJobs,
  buildPropertyCalendarEvents,
  buildPropertyProfileMetrics,
  buildPropertyUpcomingItems,
  filterNeedAttentionActions,
  leaseOccupancyLabel,
  PROPERTY_PROFILE_SECTIONS,
  type PropertyProfileSection,
} from '@/lib/property-profile-v2-data';
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
  resolveRentPaidTo,
} from '@/lib/property-overview';
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
import { cn, formatCurrency, formatDate } from '@/lib/utils';

import '@/components/agent/property-profile/property-profile-v2.css';

function ProfileCard({
  title,
  icon: Icon,
  count,
  children,
  footer,
  className,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'property-profile-v2__card v2-dashboard__card flex min-h-0 flex-col overflow-hidden rounded-2xl border',
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b px-4 py-3">
        <span className="bg-primary/10 text-primary flex size-8 items-center justify-center rounded-lg">
          <Icon className="size-4" />
        </span>
        <h3 className="text-sm font-semibold">
          {title}
          {count != null ? ` (${count})` : ''}
        </h3>
      </header>
      <div className="flex-1 p-4">{children}</div>
      {footer ? <footer className="border-t px-4 py-3">{footer}</footer> : null}
    </section>
  );
}

function DetailRow({ label, value, valueClassName }: { label: string; value: ReactNode; valueClassName?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn('min-w-0 text-right font-medium', valueClassName)}>{value}</span>
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
  onViewCalendar,
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
  onViewCalendar: () => void;
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
  const rentPaidTo = resolveRentPaidTo(
    sync.record?.rentPaidUntil ?? sync.overview?.rentPaidUntilDate,
    sync.accounting,
  );
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
  const upcoming = buildPropertyUpcomingItems({
    sync,
    property,
    currentLease,
    inspections,
    propertyId,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProfileCard title="Tenancy" icon={User}>
        <div className="divide-y">
          <DetailRow label="Tenant" value={isVacant ? 'Vacant' : tenantName || '—'} />
          <DetailRow
            label="Lease period"
            value={
              leaseStart && leaseEnd
                ? `${formatDate(leaseStart)} – ${formatDate(leaseEnd)}`
                : leaseStatus
            }
          />
          <DetailRow
            label="Rent"
            value={
              displayRent != null && displayRent > 0 ? `${formatCurrency(displayRent)} / week` : '—'
            }
          />
          <DetailRow
            label="Rent review"
            value={
              sync.overview?.nextRentReviewDate ??
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
              bond.amountLabel !== '—'
                ? `${bond.amountLabel}${bond.bondIdLabel !== '—' ? ' (Held)' : ''}`
                : '—'
            }
          />
          <DetailRow
            label="Rent status"
            value={rentPaidTo ? `Paid up to ${formatDate(rentPaidTo)}` : '—'}
            valueClassName="text-primary"
          />
        </div>
      </ProfileCard>

      <ProfileCard
        title="CROS is handling"
        icon={Briefcase}
        count={crosJobs.length}
        footer={
          crosJobs.length > 0 ? (
            <button
              type="button"
              onClick={onViewTasks}
              className="text-primary flex w-full items-center justify-center gap-1 text-sm font-semibold"
            >
              View all tasks
              <ChevronRight className="size-4" />
            </button>
          ) : null
        }
      >
        {crosJobs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active CROSSUB jobs for this property.</p>
        ) : (
          <ul className="space-y-3">
            {crosJobs.map((job) => (
              <li key={job.id} className="property-profile-v2__cros-item rounded-xl border p-3">
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
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{job.name}</p>
                      <span className="bg-primary/12 text-primary rounded-full px-2 py-0.5 text-[10px] font-semibold">
                        {job.status}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">{job.description}</p>
                    <p className="text-muted-foreground mt-1 text-[10px]">No action required</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </ProfileCard>

      <ProfileCard
        title="Needs your attention"
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
                        Approval required
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ProfileCard>

      <ProfileCard
        title="Upcoming"
        icon={Calendar}
        footer={
          <button
            type="button"
            onClick={onViewCalendar}
            className="text-primary flex w-full items-center justify-center gap-1 text-sm font-semibold"
          >
            View calendar
            <ChevronRight className="size-4" />
          </button>
        }
      >
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground text-sm">No upcoming dates on file.</p>
        ) : (
          <ul className="space-y-2.5">
            {upcoming.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <Calendar className="text-muted-foreground size-4 shrink-0" />
                  <span className="truncate font-medium">{item.label}</span>
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {item.dateLabel}
                </span>
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
  activitiesPanel: ReactNode;
  banners?: ReactNode;
}) {
  const activeCycle = leasingCycles[0];
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarEvents = useMemo(
    () =>
      buildPropertyCalendarEvents({
        property,
        propertyId,
        currentLease,
        sync,
        inspections,
        rentReviews,
        rentReviewDecisions,
        vacatingCases,
        tribunalCases,
      }),
    [
      property,
      propertyId,
      currentLease,
      sync,
      inspections,
      rentReviews,
      rentReviewDecisions,
      vacatingCases,
      tribunalCases,
    ],
  );

  const streetLine = property.address;
  const suburbLine = [property.suburb, property.state, property.postcode].filter(Boolean).join(' ');

  const sectionTabs = useMemo(
    () =>
      PROPERTY_PROFILE_SECTIONS.map((tab) => ({
        ...tab,
        label:
          tab.id === 'tasks' && taskCount > 0 ? `${tab.label} (${taskCount})` : tab.label,
      })),
    [taskCount],
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

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Rent', value: metrics.rentLabel },
            { label: 'Lease expiry', value: metrics.leaseExpiryLabel },
            { label: 'Arrears', value: metrics.arrearsLabel },
            { label: 'Bond', value: metrics.bondLabel },
            {
              label: 'Rent status',
              value: metrics.rentStatusLabel,
              tone: metrics.rentStatusTone,
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="property-profile-v2__metric rounded-xl border bg-background/40 px-3 py-2.5"
            >
              <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
                {metric.label}
              </p>
              <p
                className={cn(
                  'mt-1 text-sm font-semibold leading-snug tabular-nums',
                  metric.tone === 'good' && 'text-primary',
                  metric.tone === 'warn' && 'text-amber-700 dark:text-amber-300',
                )}
              >
                {metric.value}
              </p>
            </div>
          ))}
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
            onViewCalendar={() => setCalendarOpen(true)}
            onNeedActionClick={onNeedActionNavigate}
          />

          <div className="v2-dashboard__card rounded-2xl border p-4">
            <div className="mb-3 flex items-center gap-2">
              <Building2 className="text-primary size-4" />
              <h2 className="text-sm font-semibold">Full property details</h2>
            </div>
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
        </div>
      ) : null}

      {section === 'tasks' ? <div className="space-y-4">{tasksPanel}</div> : null}
      {section === 'financials' ? <div className="space-y-4">{financialsPanel}</div> : null}
      {section === 'documents' ? <div className="space-y-4">{documentsPanel}</div> : null}
      {section === 'activities' ? <div className="space-y-4">{activitiesPanel}</div> : null}

      <PropertyProfileCalendarDialog
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        propertyAddress={[streetLine, suburbLine].filter(Boolean).join(', ')}
        events={calendarEvents}
      />
    </div>
  );
}
