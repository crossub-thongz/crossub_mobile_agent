'use client';

import { useMemo, useState } from 'react';
import { Archive } from 'lucide-react';

import { ContactTile } from '@/components/agent/property-contact-tile';
import { PropertyBondEditDialog } from '@/components/agent/property-bond-edit-dialog';
import {
  PropertyDocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/property-document-preview-dialog';
import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyOverviewJobDialog } from '@/components/agent/property-overview-job-dialog';
import { PropertyLandlordOverviewEditDialog } from '@/components/agent/property-landlord-overview-edit-dialog';
import { PropertyTenancyEditDialog } from '@/components/agent/property-tenancy-edit-dialog';
import { MANAGEMENT_AGREEMENT_DOC_SLOT } from '@/components/agent/property-management-details-section';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { isViewableDocumentUrl } from '@/lib/document-preview';
import { buildPropertyOverviewJobRows, type PropertyJobRow } from '@/lib/property-job-rows';
import { buildPropertyLeasingWorkflowCases } from '@/lib/property-leasing-workflow-cases';
import { findPropertyDocument } from '@/lib/property-create-document-groups';
import {
  derivePaymentCycle,
  resolveBondOverviewDisplay,
  resolveRentPaidTo,
  resolveCurrentRent,
  resolveLeaseDates,
} from '@/lib/property-overview';
import { isPropertyVacant } from '@/lib/property-leasing';
import { isTenancyArchived } from '@/lib/property-archive';
import { resolvePropertyManagementFees } from '@/lib/management-fees';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import type {
  AgentDocument,
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
  Property,
} from '@/lib/types';
import { formatDate, formatDateTime, formatPropertyFullAddress } from '@/lib/utils';

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
  onEdit,
}: {
  label: string;
  value: React.ReactNode;
  onPreview?: () => void;
  onEdit?: () => void;
}) {
  const valueContent = onPreview ? (
    <button
      type="button"
      onClick={onPreview}
      className="text-primary mt-0.5 w-full min-w-0 text-left"
    >
      {value}
    </button>
  ) : (
    <div className="mt-0.5 min-w-0">{value}</div>
  );

  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 px-2.5 py-2">
      <div className="flex items-center justify-between gap-1">
        <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
          {label}
        </p>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-primary shrink-0 text-[10px] font-medium"
          >
            Edit
          </button>
        ) : null}
      </div>
      {valueContent}
    </div>
  );
}

function BondStatValue({
  amountLabel,
  bondIdLabel,
}: {
  amountLabel: string;
  bondIdLabel: string;
}) {
  const showId = bondIdLabel !== '—';
  if (!showId) {
    return <p className="text-sm font-semibold tabular-nums">{amountLabel}</p>;
  }

  return (
    <p className="flex min-w-0 items-baseline gap-1 whitespace-nowrap text-sm font-semibold leading-tight">
      <span className="shrink-0 tabular-nums">{amountLabel}</span>
      <span className="text-muted-foreground shrink-0 text-[10px] font-normal">·</span>
      <span className="text-primary min-w-0 truncate text-[10px] font-medium leading-none">
        {bondIdLabel}
      </span>
    </p>
  );
}

function sliceDate(value?: string | null): string {
  return value?.slice(0, 10) ?? '';
}

export function PropertyOverviewTab({
  property,
  propertyId,
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
  onRefresh,
  onViewBondLodgement,
  onViewRentReview,
  onOpenInspectionCreated,
}: {
  property: Property;
  propertyId: string;
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
  onRefresh?: () => void;
  onViewBondLodgement?: () => void;
  onViewRentReview?: (reviewId: string) => void;
  onOpenInspectionCreated?: (inspectionId: string) => void;
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
  const [bondDialogOpen, setBondDialogOpen] = useState(false);
  const [docPreview, setDocPreview] = useState<DocumentPreviewItem | null>(null);
  const [selectedJob, setSelectedJob] = useState<PropertyJobRow | null>(null);

  const fullAddress = formatPropertyFullAddress(property);

  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : []);
  const tenancyArchived = isTenancyArchived({
    property,
    vacatingCases,
    currentLease,
  });
  const canEditTenancy = apiConnected && !tenancyArchived;
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

  const rentPaidTo = resolveRentPaidTo(
    sync.record?.rentPaidUntil ?? sync.overview?.rentPaidUntilDate,
    sync.accounting,
  );
  const paymentCycle = derivePaymentCycle(displayRent);

  const displayBond =
    sync.financial?.bondAmount ??
    sync.record?.bondAmount ??
    property.bondAmount ??
    sync.bond?.amount ??
    null;
  const bondOverview = resolveBondOverviewDisplay(
    displayBond,
    sync.bond,
    Boolean(activeCycle?.id),
  );

  const registry = useMemo(() => {
    const record = sync.record;
    const fromFees = resolvePropertyManagementFees(property).find(
      (f) => f.feeType === 'management_fee',
    );
    const feeRate = fromFees?.amount.trim()
      ? Number(fromFees.amount.replace(/,/g, ''))
      : undefined;
    const gstFromFees =
      fromFees?.gst === 'include' || fromFees?.gst === 'exclude' ? fromFees.gst : undefined;
    const gst =
      overview?.managementRateGst ??
      (record?.managementRateGst === 'include' || record?.managementRateGst === 'exclude'
        ? record.managementRateGst
        : property.managementRateGst) ??
      gstFromFees;
    const rate =
      overview?.managementRatePercent ??
      record?.managementRatePercent ??
      property.managementRatePercent ??
      (feeRate != null && Number.isFinite(feeRate) ? feeRate : undefined);
    return {
      managementRatePercent: rate,
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
      leaseStartDate: tenancyDates.leaseStart ?? '',
      leaseEndDate: tenancyDates.leaseEnd ?? '',
      nextRentReviewAt: tenancyDates.nextRentReview ?? '',
      rentPaidUntil: rentPaidTo ?? '',
      vacateDate: tenancyDates.vacateDate ?? '',
      vacateDateChangeReason: '',
      nextInspectionAt: tenancyDates.nextRoutine ?? '',
    }),
    [tenant, tenancyDates, rentPaidTo],
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

  const leasingWorkflowCases = useMemo(
    () =>
      buildPropertyLeasingWorkflowCases({
        propertyId,
        leasingCycles: leasingCycles ?? [],
        tenantSelections: tenantSelections ?? [],
        vacatingCases,
        rentReviews: tenancyRentReviews,
        rentReviewDecisions,
        currentLease,
        isVacant,
      }),
    [
      propertyId,
      leasingCycles,
      tenantSelections,
      vacatingCases,
      tenancyRentReviews,
      rentReviewDecisions,
      currentLease,
      isVacant,
    ],
  );

  const inProgressJobs = useMemo(
    () =>
      buildPropertyOverviewJobRows({
        maintenance,
        inspections,
        rentReviews: tenancyRentReviews,
        rentReviewDecisions,
        leasingCases: leasingWorkflowCases,
        tribunalCases,
        vacatingCases,
        accounting,
      }),
    [
      maintenance,
      inspections,
      tenancyRentReviews,
      rentReviewDecisions,
      leasingWorkflowCases,
      tribunalCases,
      vacatingCases,
      accounting,
    ],
  );

  const handleJobClick = (id: string) => {
    const job = inProgressJobs.find((row) => row.id === id) ?? null;
    setSelectedJob(job);
  };

  return (
    <div className="space-y-3">
      <OverviewSection
        title="Tenancy"
        onEdit={canEditTenancy ? () => setTenancyDialogOpen(true) : undefined}
      >
        {tenancyArchived ? (
          <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
            <Archive className="size-3.5 shrink-0" />
            Archived — vacate date reached. Tenancy details and tenancy documents are read-only.
          </p>
        ) : null}
        <ContactTile
          title="Tenant"
          layout="row"
          name={tenant.name}
          email={tenant.email}
          phone={tenant.phone}
          updatedHint={tenant.hint}
        />
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell
            label="Rent paid to"
            value={rentPaidTo ? formatDate(rentPaidTo) : '—'}
          />
          <StatCell label="Payment cycle" value={paymentCycle} />
          <StatCell
            label="Bond"
            value={
              <BondStatValue
                amountLabel={bondOverview.amountLabel}
                bondIdLabel={bondOverview.bondIdLabel}
              />
            }
            onPreview={
              canEditTenancy || bondOverview.bondIdLinked
                ? () => setBondDialogOpen(true)
                : undefined
            }
            onEdit={canEditTenancy ? () => setBondDialogOpen(true) : undefined}
          />
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
          layout="row"
          name={landlord.name}
          email={landlord.email}
          phone={landlord.phone}
          updatedHint={landlordUpdatedHint}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <StatCell label="Management rate" value={managementRateDisplay} />
          <StatCell
            label="Management agreement"
            value={
              managementAgreementDoc?.href && isViewableDocumentUrl(managementAgreementDoc.href)
                ? 'View agreement'
                : 'Not uploaded'
            }
            onPreview={
              managementAgreementDoc?.href && isViewableDocumentUrl(managementAgreementDoc.href)
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

      <OverviewSection title="Jobs in progress">
        <p className="text-muted-foreground mb-2 text-[11px]">
          Choose a job type from the dropdown to view active jobs, then click a row to open the
          workflow.
        </p>
        <PropertyJobCasesTable
          rows={inProgressJobs}
          showViewToggle={false}
          groupByJobType
          requireJobTypeFilterSelection
          showRentReviewSchedule={false}
          selectedId={selectedJob?.id}
          onRowClick={handleJobClick}
          emptyTitle="No jobs in progress"
          emptyDescription="Active maintenance, inspections, leasing, and other cases appear here."
        />
      </OverviewSection>

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

      <PropertyBondEditDialog
        open={bondDialogOpen}
        onOpenChange={setBondDialogOpen}
        propertyId={propertyId}
        initialAmount={displayBond}
        bondId={bondOverview.bondIdLabel !== '—' ? bondOverview.bondIdLabel : null}
        bondLodgementUrl={sync.bond?.agentLink}
        onSaved={handleSaved}
      />

      <PropertyOverviewJobDialog
        job={selectedJob}
        onClose={() => setSelectedJob(null)}
        property={property}
        propertyId={propertyId}
        maintenance={maintenance}
        inspections={inspections}
        rentReviews={tenancyRentReviews}
        rentReviewDecisions={rentReviewDecisions}
        leasingCases={leasingWorkflowCases}
        vacatingCases={vacatingCases}
        tribunalCases={tribunalCases}
        accounting={accounting}
        tenantSelections={tenantSelections}
        currentLease={currentLease}
        onViewRentReview={(reviewId) => {
          setSelectedJob(null);
          onViewRentReview?.(reviewId);
        }}
        onOpenInspectionCreated={(inspectionId) => {
          setSelectedJob(null);
          onOpenInspectionCreated?.(inspectionId);
        }}
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
