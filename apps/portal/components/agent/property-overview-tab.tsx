'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { History, ListTodo } from 'lucide-react';

import { ContactTile } from '@/components/agent/property-contact-tile';
import {
  PropertyDocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/property-document-preview-dialog';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyLandlordOverviewEditDialog } from '@/components/agent/property-landlord-overview-edit-dialog';
import { PropertyTenancyEditDialog } from '@/components/agent/property-tenancy-edit-dialog';
import { MANAGEMENT_AGREEMENT_DOC_SLOT } from '@/components/agent/property-management-details-section';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { isViewableDocumentUrl } from '@/lib/document-preview';
import { buildPropertyOverviewJobRows } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { findPropertyDocument } from '@/lib/property-create-document-groups';
import {
  derivePaymentCycle,
  deriveRentPaidTo,
  resolveCurrentRent,
  resolveLeaseDates,
} from '@/lib/property-overview';
import { isPropertyVacant } from '@/lib/property-leasing';
import { dailyRentFromWeekly } from '@/lib/rent-calculations';
import { TenancyHistorySection } from '@/components/agent/tenancy-history-section';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import type {
  AgentDocument,
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
  PropertyNeedAction,
} from '@/lib/types';
import { formatCurrency, formatDate, formatDateTime, formatPropertyFullAddress } from '@/lib/utils';

function OverviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold">{title}</h3>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-primary text-[10px] font-medium"
          >
            Edit
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function StatCell({
  label,
  value,
  onPreview,
}: {
  label: string;
  value: string;
  onPreview?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 px-2 py-1.5">
      <p className="text-muted-foreground text-[9px] font-medium uppercase tracking-wide">
        {label}
      </p>
      {onPreview ? (
        <button
          type="button"
          onClick={onPreview}
          className="text-primary mt-0.5 text-left text-xs font-semibold"
        >
          {value}
        </button>
      ) : (
        <p className="mt-0.5 text-xs font-semibold tabular-nums">{value}</p>
      )}
    </div>
  );
}

function sliceDate(value?: string | null): string {
  return value?.slice(0, 10) ?? '';
}

export function PropertyOverviewTab({
  property,
  propertyId,
  needActions,
  maintenance,
  inspections,
  propertyDocs,
  leasing,
  currentLease,
  rentReviewDecisions,
  tenancyRentReviews,
  leasingCycles,
  tenantSelections,
  vacatingCases = [],
  tribunalCases = [],
  accounting,
  onViewHistory,
  onRefresh,
  onViewBondLodgement: _onViewBondLodgement,
}: {
  property: Property;
  propertyId: string;
  needActions: PropertyNeedAction[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  propertyDocs: AgentDocument[];
  leasing: LeasingRecord[];
  currentLease?: LeasingRecord;
  rentReviewDecisions: Record<string, { action: 'confirmed' | 'custom'; amount?: number } | null>;
  tenancyRentReviews: import('@/lib/types').RentReviewCase[];
  leasingCycles?: LeasingCycle[];
  tenantSelections?: import('@/lib/types').TenantSelectionCase[];
  vacatingCases?: import('@/lib/types').VacatingCase[];
  tribunalCases?: import('@/lib/types').TribunalCase[];
  accounting?: import('@/lib/types').PropertyAccounting | null;
  onViewHistory: () => void;
  onRefresh?: () => void;
  onViewBondLodgement?: () => void;
}) {
  const { apiConnected } = useAgentData();
  const activeCycle = leasingCycles?.[0];
  const sync = usePropertyOverviewSync(
    property,
    apiConnected,
    activeCycle,
    tenantSelections,
    currentLease,
  );

  const [tenancyDialogOpen, setTenancyDialogOpen] = useState(false);
  const [landlordDialogOpen, setLandlordDialogOpen] = useState(false);
  const [docPreview, setDocPreview] = useState<DocumentPreviewItem | null>(null);

  const fullAddress = formatPropertyFullAddress(property);

  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : []);
  const currentRent = resolveCurrentRent(property, currentLease);
  const financialRent = sync.financial?.currentRentWeekly;
  const registryRent = sync.record?.rentWeekly ?? property.rentWeekly;
  const displayRent =
    financialRent != null && financialRent > 0
      ? financialRent
      : registryRent != null && registryRent > 0
        ? registryRent
        : currentRent;

  const overview = sync.overview;
  const { start: leaseStart, end: leaseEnd } = resolveLeaseDates(property, currentLease);

  const landlord = useMemo(
    () => ({
      name: sync.record?.landlordName ?? property.homeOwnerName,
      email: sync.record?.landlordEmail ?? property.homeOwnerContact.email ?? '',
      phone: sync.record?.landlordPhone ?? property.homeOwnerContact.phone ?? '',
    }),
    [sync.record, property],
  );

  const tenant = useMemo(() => {
    if (sync.tenantContact?.name) {
      return {
        name: sync.tenantContact.name,
        email: sync.tenantContact.email || property.tenantContact.email,
        phone: sync.tenantContact.phone || property.tenantContact.phone,
        hint: sync.tenantContact.hint ?? null,
      };
    }
    return {
      name: isVacant ? 'Vacant' : sync.record?.tenantName ?? property.tenantName,
      email: sync.record?.tenantEmail ?? property.tenantContact.email,
      phone: sync.record?.tenantPhone ?? property.tenantContact.phone,
      hint: null as string | null,
    };
  }, [sync.tenantContact, sync.record, property, isVacant]);

  const landlordUpdatedHint =
    sync.record?.updatedAt && apiConnected
      ? `Updated ${formatDateTime(sync.record.updatedAt)}`
      : null;

  const tenancyDates = useMemo(
    () => ({
      leaseStart:
        overview?.leaseStartDate ??
        sliceDate(sync.record?.leaseStartDate) ??
        leaseStart,
      leaseEnd:
        overview?.leaseEndDate ?? sliceDate(sync.record?.leaseEndDate) ?? property.leaseEnd,
      nextRentReview:
        overview?.nextRentReviewDate ??
        sliceDate(sync.record?.nextRentReviewAt) ??
        property.nextRentReview,
      vacateDate: overview?.vacateDate ?? sliceDate(sync.record?.vacateDate),
      nextRoutine:
        overview?.nextRoutineInspectionDate ?? sliceDate(sync.record?.nextInspectionAt),
    }),
    [overview, sync.record, property, leaseStart, leaseEnd],
  );

  const rentPaidTo = deriveRentPaidTo(sync.accounting);
  const paymentCycle = derivePaymentCycle(displayRent);
  const displayDailyRent = dailyRentFromWeekly(displayRent);

  const registry = useMemo(() => {
    const record = sync.record;
    const gst =
      overview?.managementRateGst ??
      (record?.managementRateGst === 'include' || record?.managementRateGst === 'exclude'
        ? record.managementRateGst
        : property.managementRateGst);
    return {
      managementRatePercent:
        overview?.managementRatePercent ??
        record?.managementRatePercent ??
        property.managementRatePercent,
      managementRateGst: gst,
    };
  }, [overview, property, sync.record]);

  const managementGstLabel =
    registry.managementRateGst === 'include'
      ? 'Include GST'
      : registry.managementRateGst === 'exclude'
        ? 'Exclude GST'
        : '';

  const managementRateDisplay =
    registry.managementRatePercent != null
      ? `${registry.managementRatePercent}%${managementGstLabel ? ` · ${managementGstLabel}` : ''}`
      : '—';

  const displayDocs = useMemo(
    () =>
      propertyDocs.map((doc) => ({
        id: doc.id,
        title: doc.title,
        uploadedAt: doc.uploadedAt,
        href: doc.downloadUrl ?? doc.href,
      })),
    [propertyDocs],
  );

  const managementAgreementDoc = findPropertyDocument(
    displayDocs,
    MANAGEMENT_AGREEMENT_DOC_SLOT.label,
  );

  const tenancyInitial = useMemo(
    () => ({
      tenantName: tenant.name === 'Vacant' ? '' : tenant.name,
      tenantEmail: tenant.email ?? '',
      tenantPhone: tenant.phone ?? '',
      rentWeekly: displayRent > 0 ? String(Math.round(displayRent)) : '',
      leaseStartDate: tenancyDates.leaseStart ?? '',
      leaseEndDate: tenancyDates.leaseEnd ?? '',
      nextRentReviewAt: tenancyDates.nextRentReview ?? '',
      vacateDate: tenancyDates.vacateDate ?? '',
      nextInspectionAt: tenancyDates.nextRoutine ?? '',
    }),
    [tenant, displayRent, tenancyDates],
  );

  const landlordInitial = useMemo(
    () => ({
      landlordName: landlord.name === '—' ? '' : landlord.name,
      landlordEmail: landlord.email ?? '',
      landlordPhone: landlord.phone ?? '',
      managementRatePercent:
        registry.managementRatePercent != null
          ? String(registry.managementRatePercent)
          : '',
      managementRateGst: (registry.managementRateGst ?? '') as '' | 'include' | 'exclude',
    }),
    [landlord, registry],
  );

  const handleSaved = () => {
    onRefresh?.();
  };

  const openDocPreview = (
    doc: { title: string; uploadedAt: string; href?: string | null } | undefined,
    fallbackTitle: string,
  ) => {
    if (!doc?.href || !isViewableDocumentUrl(doc.href)) return;
    setDocPreview({
      title: fallbackTitle,
      uploadedAt: doc.uploadedAt,
      href: doc.href,
    });
  };

  const inProgressJobs = useMemo(() => {
    const leasingCases = buildPropertyLeasingWorkflowCases({
      propertyId,
      leasingCycles: leasingCycles ?? [],
      tenantSelections: tenantSelections ?? [],
      vacatingCases,
      rentReviews: tenancyRentReviews,
      rentReviewDecisions,
      currentLease,
      isVacant,
    });
    return buildPropertyOverviewJobRows({
      maintenance,
      inspections,
      rentReviews: tenancyRentReviews,
      rentReviewDecisions,
      leasingCases,
      tribunalCases,
      vacatingCases,
      accounting,
    });
  }, [
    propertyId,
    leasingCycles,
    tenantSelections,
    vacatingCases,
    tribunalCases,
    accounting,
    maintenance,
    inspections,
    tenancyRentReviews,
    rentReviewDecisions,
    currentLease,
    isVacant,
  ]);

  return (
    <div className="space-y-3">
      {needActions.length > 0 ? (
        <section className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <ListTodo className="text-primary size-3.5" />
            <h3 className="text-xs font-semibold">Action needed</h3>
          </div>
          <div className="space-y-1.5">
            {needActions.map((a) => (
              <Link
                key={a.id}
                href={a.href}
                className="block rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2 text-[11px] font-semibold text-destructive"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {inProgressJobs.length > 0 ? (
        <section className="rounded-xl border bg-card p-3">
          <div className="mb-3 flex items-center gap-1.5">
            <ListTodo className="text-primary size-3.5" />
            <h3 className="text-xs font-semibold">Jobs in progress</h3>
          </div>
          <PropertyJobCasesTable
            rows={inProgressJobs}
            showViewToggle={false}
            emptyTitle="No jobs in progress"
            emptyDescription="Active maintenance, inspections, leasing, and other cases appear here."
          />
        </section>
      ) : null}

      <OverviewSection
        title="Tenancy"
        onEdit={apiConnected ? () => setTenancyDialogOpen(true) : undefined}
      >
        <ContactTile
          title="Tenant"
          name={tenant.name}
          email={tenant.email}
          phone={tenant.phone}
          updatedHint={tenant.hint}
        />
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <StatCell
            label="Rent"
            value={displayRent > 0 ? `${formatCurrency(displayRent)}/wk` : '—'}
          />
          <StatCell
            label="Daily rent"
            value={
              displayDailyRent > 0
                ? `$${displayDailyRent.toLocaleString('en-AU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}/day`
                : '—'
            }
          />
          <StatCell
            label="Rent paid to"
            value={rentPaidTo ? formatDate(rentPaidTo) : '—'}
          />
          <StatCell label="Payment cycle" value={paymentCycle} />
          <StatCell
            label="Next rent review"
            value={tenancyDates.nextRentReview ? formatDate(tenancyDates.nextRentReview) : '—'}
          />
          <StatCell
            label="Lease start"
            value={tenancyDates.leaseStart ? formatDate(tenancyDates.leaseStart) : '—'}
          />
          <StatCell
            label="Lease end"
            value={tenancyDates.leaseEnd ? formatDate(tenancyDates.leaseEnd) : '—'}
          />
          <StatCell
            label="Vacate date"
            value={tenancyDates.vacateDate ? formatDate(tenancyDates.vacateDate) : '—'}
          />
          <StatCell
            label="Next routine"
            value={tenancyDates.nextRoutine ? formatDate(tenancyDates.nextRoutine) : '—'}
          />
        </div>
      </OverviewSection>

      <OverviewSection
        title="Management details"
        onEdit={apiConnected ? () => setLandlordDialogOpen(true) : undefined}
      >
        <ContactTile
          title="Landlord"
          name={landlord.name}
          email={landlord.email}
          phone={landlord.phone}
          updatedHint={landlordUpdatedHint}
        />
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-2">
          <StatCell label="Management rate" value={managementRateDisplay} />
          <StatCell
            label="Management agreement"
            value={managementAgreementDoc ? 'Uploaded' : 'Not uploaded'}
            onPreview={
              managementAgreementDoc?.href &&
              isViewableDocumentUrl(managementAgreementDoc.href)
                ? () =>
                    openDocPreview(
                      managementAgreementDoc,
                      MANAGEMENT_AGREEMENT_DOC_SLOT.label,
                    )
                : undefined
            }
          />
          {overview?.endOfManagementDate || property.endOfManagementDate ? (
            <StatCell
              label="End of management"
              value={formatDate(
                overview?.endOfManagementDate ?? property.endOfManagementDate ?? '',
              )}
            />
          ) : null}
        </div>
      </OverviewSection>

      <section className="rounded-xl border bg-card p-3">
        <div className="mb-2 flex items-center gap-1.5">
          <History className="text-primary size-3.5" />
          <h3 className="text-xs font-semibold">History</h3>
        </div>
        <TenancyHistorySection
          propertyId={propertyId}
          records={leasing}
          compact
          onViewAll={onViewHistory}
        />
      </section>

      <PropertyTenancyEditDialog
        open={tenancyDialogOpen}
        onOpenChange={setTenancyDialogOpen}
        propertyId={propertyId}
        initial={tenancyInitial}
        onSaved={handleSaved}
      />

      <PropertyLandlordOverviewEditDialog
        open={landlordDialogOpen}
        onOpenChange={setLandlordDialogOpen}
        propertyId={propertyId}
        property={property}
        initial={landlordInitial}
        onSaved={handleSaved}
      />

      <PropertyDocumentPreviewDialog
        doc={docPreview}
        propertyAddress={fullAddress}
        open={docPreview != null}
        onClose={() => setDocPreview(null)}
      />
    </div>
  );
}
