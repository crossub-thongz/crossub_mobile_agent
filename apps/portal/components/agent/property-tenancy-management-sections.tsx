'use client';

import { useEffect, useMemo, useState } from 'react';
import { Archive } from 'lucide-react';

import { PropertyLeasingCaseWorkflowDialog } from '@/components/agent/property-leasing-case-workflow-dialog';
import { ContactTile } from '@/components/agent/property-contact-tile';
import { PropertyBondEditDialog } from '@/components/agent/property-bond-edit-dialog';
import {
  PropertyDocumentPreviewDialog,
  type DocumentPreviewItem,
} from '@/components/agent/property-document-preview-dialog';
import { PropertyLandlordOverviewEditDialog } from '@/components/agent/property-landlord-overview-edit-dialog';
import { PropertyTenancyEditDialog } from '@/components/agent/property-tenancy-edit-dialog';
import { MANAGEMENT_AGREEMENT_DOC_SLOT } from '@/components/agent/property-management-details-section';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  agentDocumentPreviewHref,
  isViewableDocumentUrl,
} from '@/lib/document-preview';
import { endLeasingVacateDate } from '@/lib/end-leasing/agent-workflow-model';
import { useEndLeasingStore } from '@/lib/end-leasing/store';
import { findPropertyDocument } from '@/lib/property-create-document-groups';
import { isPropertyVacant } from '@/lib/property-leasing';
import { isActiveEndLeasingCase, resolveTenantVacatingOnHint } from '@/lib/property-leasing-history';
import {
  endLeasingWorkflowCaseFromVacating,
  type PropertyLeasingWorkflowCase,
} from '@/lib/property-leasing-workflow-cases';
import {
  parseTenancyArchiveSnapshots,
  resolveTenancyArchiveReason,
  tenancyArchiveBanner,
} from '@/lib/property-archive';
import { resolvePropertyManagementFees } from '@/lib/management-fees';
import {
  derivePaymentCycle,
  resolveBondOverviewDisplay,
  resolveCurrentRent,
  resolveLeaseDates,
  resolveRentPaidTo,
} from '@/lib/property-overview';
import type { PropertyPortalDocument } from '@/lib/property-registry-api';
import { usePropertyOverviewSync } from '@/lib/use-property-overview-sync';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import type {
  AgentDocument,
  LeasingCycle,
  LeasingRecord,
  Property,
  TenantSelectionCase,
  VacatingCase,
} from '@/lib/types';
import { formatDate, formatDateTime, formatPropertyFullAddress } from '@/lib/utils';

function DetailsSubsection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border/60 border-t pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          {title}
        </h4>
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

function formatRoutineCadenceLine(
  frequency?: number | null,
  frequencyMonths?: number | null,
): string | null {
  const parts: string[] = [];
  if (frequency != null) parts.push(`${frequency}× per year`);
  if (frequencyMonths != null) parts.push(`Every ${frequencyMonths} months`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

function NextRoutineStatValue({
  date,
  frequency,
  frequencyMonths,
}: {
  date?: string;
  frequency?: number | null;
  frequencyMonths?: number | null;
}) {
  const cadence = formatRoutineCadenceLine(frequency, frequencyMonths);
  return (
    <div>
      <p className="text-sm font-semibold tabular-nums">
        {date ? formatDate(date) : '—'}
      </p>
      {cadence ? (
        <p className="text-muted-foreground mt-0.5 text-[10px] font-normal leading-snug">
          {cadence}
        </p>
      ) : null}
    </div>
  );
}

function sliceDate(value?: string | null): string {
  return value?.slice(0, 10) ?? '';
}

function firstDate(...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const day = sliceDate(value);
    if (day) return day;
  }
  return '';
}

function resolveManagementAgreementDoc(
  portalDocuments: PropertyPortalDocument[],
  fallbackDocs: Array<{
    id: string;
    title: string;
    uploadedAt: string;
    href?: string | null;
    category?: string;
  }>,
): { title: string; uploadedAt: string; href?: string | null } | undefined {
  // Same source as the Documents tab — address-filtered portfolio docs can miss
  // portal uploads when addresses are duplicated/normalized differently.
  const fromPortal = portalDocuments
    .filter((doc) => !doc.previousTenantName?.trim())
    .filter(
      (doc) =>
        doc.category === 'management_agreement' ||
        Boolean(findPropertyDocument([doc], MANAGEMENT_AGREEMENT_DOC_SLOT.label)),
    )
    .sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0];
  if (fromPortal) {
    return {
      title: fromPortal.title,
      uploadedAt: fromPortal.uploadedAt,
      href: agentDocumentPreviewHref(fromPortal.id, fromPortal.url),
    };
  }

  const byCategory = fallbackDocs
    .filter((doc) => doc.category === 'management_agreement')
    .sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0];
  if (byCategory) return byCategory;

  return findPropertyDocument(fallbackDocs, MANAGEMENT_AGREEMENT_DOC_SLOT.label);
}

export function PropertyTenancyManagementSections({
  property,
  propertyId,
  currentLease,
  propertyDocs,
  leasingCycles,
  tenantSelections,
  vacatingCases = [],
  onRefresh,
}: {
  property: Property;
  propertyId: string;
  currentLease?: LeasingRecord;
  propertyDocs: AgentDocument[];
  leasingCycles?: LeasingCycle[];
  tenantSelections?: TenantSelectionCase[];
  vacatingCases?: VacatingCase[];
  onRefresh?: () => void;
}) {
  const { apiConnected } = useAgentData();
  const { detail } = usePropertyPortalDetail(propertyId, apiConnected);
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
  const [tenantHistoryIndex, setTenantHistoryIndex] = useState<number | null>(null);
  const [endLeasingDialogCase, setEndLeasingDialogCase] =
    useState<PropertyLeasingWorkflowCase | null>(null);

  const tenancyArchives = useMemo(
    () => parseTenancyArchiveSnapshots(property.registryDraft),
    [property.registryDraft],
  );

  const openVacatingCaseId = useMemo(
    () => vacatingCases.find(isActiveEndLeasingCase)?.id ?? null,
    [vacatingCases],
  );
  const loadEndLeasingCase = useEndLeasingStore((s) => s.loadCase);
  const openEndLeasingCase = useEndLeasingStore((s) =>
    openVacatingCaseId ? s.cases[openVacatingCaseId] : undefined,
  );

  useEffect(() => {
    if (!apiConnected || !openVacatingCaseId) return;
    void loadEndLeasingCase(openVacatingCaseId);
  }, [apiConnected, openVacatingCaseId, loadEndLeasingCase]);

  const fullAddress = formatPropertyFullAddress(property);
  const isVacant = isPropertyVacant(property, currentLease ? [currentLease] : []);
  const tenancyArchiveReason = resolveTenancyArchiveReason({
    property,
    vacatingCases,
    currentLease,
  });
  const tenancyArchived = tenancyArchiveReason != null;
  const archiveBanner = tenancyArchiveBanner(tenancyArchiveReason);
  const canEditTenancy = apiConnected && !tenancyArchived;
  const currentRent = resolveCurrentRent(property, currentLease);
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
    if (tenantHistoryIndex != null && tenancyArchives[tenantHistoryIndex]) {
      const archived = tenancyArchives[tenantHistoryIndex];
      return {
        name: archived.tenantName ?? 'Previous tenant',
        email: archived.tenantEmail ?? '',
        phone: archived.tenantPhone ?? '',
        hint: archived.vacateDate ? `Vacated ${formatDate(archived.vacateDate)}` : null,
      };
    }
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
  }, [sync.tenantContact, sync.record, property, isVacant, tenantHistoryIndex, tenancyArchives]);

  const landlordUpdatedHint =
    sync.record?.updatedAt && apiConnected
      ? `Updated ${formatDateTime(sync.record.updatedAt)}`
      : null;

  const tenancyDates = useMemo(() => {
    const caseVacateFromList =
      vacatingCases.find((c) => isActiveEndLeasingCase(c) && c.vacateDate)?.vacateDate ?? null;
    const caseVacateFromCompleted =
      vacatingCases.find(
        (c) => c.apiStatus?.toUpperCase() === 'COMPLETED' && c.vacateDate,
      )?.vacateDate ?? null;
    const caseVacateFromDetail = openEndLeasingCase
      ? endLeasingVacateDate(openEndLeasingCase)
      : null;
    const archiveVacate =
      parseTenancyArchiveSnapshots(property.registryDraft)[0]?.vacateDate ?? null;
    return {
      leaseStart: firstDate(overview?.leaseStartDate, sync.record?.leaseStartDate, leaseStart),
      leaseEnd: firstDate(
        overview?.leaseEndDate,
        sync.record?.leaseEndDate,
        property.leaseEnd,
      ),
      nextRentReview: firstDate(
        overview?.nextRentReviewDate,
        sync.record?.nextRentReviewAt,
        property.nextRentReview,
      ),
      vacateDate: firstDate(
        caseVacateFromDetail,
        caseVacateFromList,
        caseVacateFromCompleted,
        overview?.vacateDate,
        sync.record?.vacateDate,
        property.vacateDate,
        archiveVacate,
      ),
      nextRoutine: firstDate(overview?.nextRoutineInspectionDate, sync.record?.nextInspectionAt),
      routineAnnualVisits: overview?.routineInspectionFrequency ?? null,
      routineCycleMonths: overview?.routineInspectionFrequencyMonths ?? null,
    };
  }, [overview, sync.record, property, leaseStart, vacatingCases, openEndLeasingCase]);

  const tenantVacatingHint = useMemo(() => {
    if (tenantHistoryIndex != null) return null;
    return resolveTenantVacatingOnHint({
      vacatingCases,
      vacateDate: tenancyDates.vacateDate,
      tenantName: tenant.name,
      isVacant,
      viewingArchivedTenant: tenantHistoryIndex != null,
      formatDate,
    });
  }, [vacatingCases, tenancyDates.vacateDate, tenant.name, isVacant, tenantHistoryIndex]);

  const openCompletedEndLeasingCase = () => {
    if (!tenantVacatingHint) return;
    const vacatingCase = vacatingCases.find((row) => row.id === tenantVacatingHint.caseId);
    if (!vacatingCase) return;
    if (apiConnected) void loadEndLeasingCase(vacatingCase.id);
    setEndLeasingDialogCase(endLeasingWorkflowCaseFromVacating(vacatingCase));
  };

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
        category: doc.category,
        href: agentDocumentPreviewHref(doc.id, doc.downloadUrl ?? doc.href),
      })),
    [propertyDocs],
  );

  const managementAgreementDoc = useMemo(
    () => resolveManagementAgreementDoc(detail?.documents ?? [], displayDocs),
    [detail?.documents, displayDocs],
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
        registry.managementRatePercent != null ? String(registry.managementRatePercent) : '',
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

  return (
    <>
      <DetailsSubsection
        title="Tenancy details"
        onEdit={canEditTenancy ? () => setTenancyDialogOpen(true) : undefined}
      >
        {archiveBanner ? (
          <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs">
            <Archive className="size-3.5 shrink-0" />
            {archiveBanner}
          </p>
        ) : null}
        <ContactTile
          title="Tenant"
          layout="row"
          name={tenant.name}
          email={tenant.email}
          phone={tenant.phone}
          meta={tenantVacatingHint?.label}
          metaOnClick={tenantVacatingHint ? openCompletedEndLeasingCase : undefined}
          updatedHint={tenant.hint}
        />
        {tenancyArchives.length > 0 ? (
          <div className="mt-2">
            <label className="text-muted-foreground mb-1 block text-[10px] font-semibold uppercase tracking-wide">
              Tenant history
            </label>
            <select
              className="border-input bg-background h-8 w-full max-w-md rounded-lg border px-2 text-xs"
              value={tenantHistoryIndex == null ? 'current' : String(tenantHistoryIndex)}
              onChange={(event) => {
                const value = event.target.value;
                setTenantHistoryIndex(value === 'current' ? null : Number(value));
              }}
            >
              <option value="current">
                {sync.tenantContact?.name || property.tenantName
                  ? `Current — ${sync.tenantContact?.name ?? property.tenantName}`
                  : 'Current — Vacant'}
              </option>
              {tenancyArchives.map((archived, index) => (
                <option key={`${archived.archivedAt}-${index}`} value={String(index)}>
                  Previous — {archived.tenantName ?? 'Tenant'}
                  {archived.vacateDate ? ` · vacated ${formatDate(archived.vacateDate)}` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell label="Rent paid to" value={rentPaidTo ? formatDate(rentPaidTo) : '—'} />
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
            value={
              <NextRoutineStatValue
                date={tenancyDates.nextRoutine || undefined}
                frequency={tenancyDates.routineAnnualVisits}
                frequencyMonths={tenancyDates.routineCycleMonths}
              />
            }
          />
        </div>
      </DetailsSubsection>

      <DetailsSubsection
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
                    openDocPreview(managementAgreementDoc, MANAGEMENT_AGREEMENT_DOC_SLOT.label)
                : undefined
            }
          />
          {overview?.endOfManagementDate || property.endOfManagementDate ? (
            <StatCell
              label="End of management"
              value={formatDate(overview?.endOfManagementDate ?? property.endOfManagementDate ?? '')}
            />
          ) : null}
        </div>
      </DetailsSubsection>

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

      <PropertyDocumentPreviewDialog
        doc={docPreview}
        propertyAddress={fullAddress}
        open={docPreview != null}
        onClose={() => setDocPreview(null)}
      />

      <PropertyLeasingCaseWorkflowDialog
        open={endLeasingDialogCase != null}
        onClose={() => setEndLeasingDialogCase(null)}
        item={endLeasingDialogCase}
        property={property}
        propertyId={propertyId}
        rentReviews={[]}
        rentReviewDecisions={{}}
        vacatingCases={vacatingCases}
        rentWeekly={displayRent ?? undefined}
        onCaseClosed={() => {
          void onRefresh?.();
          setEndLeasingDialogCase(null);
        }}
      />
    </>
  );
}
