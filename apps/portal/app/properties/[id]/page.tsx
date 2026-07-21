'use client';

import Link from 'next/link';
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bath,
  BedDouble,
  Car,
  ListTodo,
} from 'lucide-react';

import { InspectionCaseDetailDialog } from '@/components/inspections/inspection-case-detail-dialog';
import { PropertyGiiPanel } from '@/components/agent/property-gii-panel';
import { PropertyInspectionTab } from '@/components/agent/property-inspection-tab';
import { PropertyLeasingJobPanel } from '@/components/agent/property-leasing-job-panel';
import { PropertyMaintenanceTab } from '@/components/agent/property-maintenance-tab';
import { PropertyRemindersDialog } from '@/components/agent/property-reminders-dialog';
import { PropertyProfileDetails } from '@/components/agent/property-profile-details';
import { PropertyTabBar } from '@/components/agent/property-tab-bar';
import { PropertyChatDialog } from '@/components/agent/property-chat-dialog';
import { PropertyAccountingTab } from '@/components/agent/property-accounting-tab';
import { PropertyTribunalTab } from '@/components/agent/property-tribunal-tab';
import { PropertyDocumentsTab } from '@/components/agent/property-documents-tab';
import { PropertyFeesTab } from '@/components/agent/property-fees-tab';
import { PropertyHistoryTab } from '@/components/agent/property-history-tab';
import { PropertyRentReviewTab } from '@/components/agent/property-rent-review-tab';
import { RentReviewDetailDialog } from '@/components/agent/rent-review-detail-dialog';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { propertyRegistryResume, ROUTES } from '@/constants/routes';
import { fetchProperty } from '@/lib/crossub-api/agent-client';
import { mapAgentProperty } from '@/lib/crossub-api/agent-mappers';
import { fromProperty } from '@/lib/detail-navigation';
import {
  filterTenancyRentReviews,
  getActiveOpenInspection,
  getActiveOutgoingInspection,
  getNextRentReviewCase,
  getNextRentReviewDate,
  isInOpenInspectionPhase,
  isPropertyVacant,
  rentReviewsForProperty,
} from '@/lib/property-leasing';
import { archivedDocumentGroups, isTenancyArchived } from '@/lib/property-archive';
import {
  isPropertyLeasingBondFocus,
  propertyLeasingBondFocusPath,
} from '@/lib/property-leasing-navigation';
import {
  propertyInspectionFocusPath,
  readPropertyInspectionFocusId,
} from '@/lib/property-inspection-navigation';
import { useAgentStore } from '@/lib/store';
import type { Property } from '@/lib/types';
import { formatCurrency, formatDate, formatPropertyFullAddress } from '@/lib/utils';
import { useRecordRecentPropertyVisit } from '@/hooks/use-record-recent-visit';
import { formatCarSpaces } from '@/lib/property-overview';
import {
  PROPERTY_DETAIL_TABS,
  propertyDetailTabsForAgency,
  type PropertyDetailTab,
} from '@/lib/portal-service-level';

type Tab = PropertyDetailTab;

function normalizeTab(raw: string | null, allowedTabs: readonly Tab[]): Tab {
  if (raw === 'Overview' || raw === 'Tenancy' || raw === 'Communication') {
    if (allowedTabs.includes('Leasing')) return 'Leasing';
    return allowedTabs[0] ?? 'Documents';
  }
  if (raw === 'History' && allowedTabs.includes('Archive')) return 'Archive';
  if (allowedTabs.includes(raw as Tab)) return raw as Tab;
  return allowedTabs[0] ?? 'Documents';
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const {
    properties,
    archivedProperties,
    agencies,
    maintenanceAll,
    inspections,
    rentReviews,
    documents,
    leasingRecords,
    accounting,
    tenantSelections,
    vacating,
    leasingCycles,
    tribunalCases,
    archive,
    getPropertyActions,
    refresh,
    agentPortfolioId,
  } = useAgentData();
  const decisions = useAgentStore((s) => s.rentReviewDecisions);
  const listProperty =
    properties.find((p) => p.id === id) ?? archivedProperties.find((p) => p.id === id);
  const [fetchedProperty, setFetchedProperty] = useState<Property | null>(null);
  const [propertyLoadState, setPropertyLoadState] = useState<'loading' | 'ready' | 'missing'>(() =>
    listProperty ? 'ready' : 'loading',
  );
  const property = listProperty ?? fetchedProperty;
  const isArchivedProperty = Boolean(
    property?.endOfManagementDate ||
      archivedProperties.some((p) => p.id === id),
  );

  // Properties archived after end-leasing or end-of-management drop out of the active
  // portfolio list — load by id so the detail page does not 404 on first paint.
  useEffect(() => {
    if (listProperty) {
      setFetchedProperty(null);
      setPropertyLoadState('ready');
      return;
    }
    let cancelled = false;
    setPropertyLoadState('loading');
    void fetchProperty(id)
      .then((dto) => {
        if (cancelled) return;
        setFetchedProperty(mapAgentProperty(dto, agentPortfolioId));
        setPropertyLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedProperty(null);
        setPropertyLoadState('missing');
      });
    return () => {
      cancelled = true;
    };
  }, [agentPortfolioId, id, listProperty]);

  useRecordRecentPropertyVisit(property);
  const propertyTabs = useMemo(
    () =>
      property
        ? propertyDetailTabsForAgency(agencies, property.agencyId)
        : [...PROPERTY_DETAIL_TABS],
    [agencies, property],
  );
  const [tab, setTab] = useState<Tab>('Documents');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [selectedRentReviewId, setSelectedRentReviewId] = useState<string | null>(null);
  const [leasingChatOpen, setLeasingChatOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const arrearsSectionRef = useRef<HTMLElement | null>(null);
  const leasingFocusBond = isPropertyLeasingBondFocus(searchParams);
  const inspectionFocusId = readPropertyInspectionFocusId(searchParams);

  const openPropertyInspection = useCallback(
    (inspectionId: string) => {
      setTab('Inspection');
      setSelectedInspectionId(inspectionId);
      router.replace(propertyInspectionFocusPath(id, inspectionId));
    },
    [id, router],
  );

  const clearLeasingBondFocus = useCallback(() => {
    if (!leasingFocusBond) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete('focus');
    next.delete('step');
    next.delete('workflow');
    const query = next.toString();
    router.replace(query ? `/properties/${id}?${query}` : `/properties/${id}`);
  }, [id, leasingFocusBond, router, searchParams]);

  const viewBondLodgement = useCallback(() => {
    setTab('Leasing');
    router.push(propertyLeasingBondFocusPath(id));
  }, [id, router]);

  useEffect(() => {
    setTab(normalizeTab(searchParams.get('tab'), propertyTabs));
  }, [searchParams, propertyTabs]);

  useEffect(() => {
    if (!inspectionFocusId || !propertyTabs.includes('Inspection')) return;
    setTab('Inspection');
    setSelectedInspectionId(inspectionFocusId);
  }, [inspectionFocusId, propertyTabs]);

  useEffect(() => {
    if (searchParams.get('focus') !== 'arrears' || tab !== 'Accounting') return;
    arrearsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams, tab]);

  const needActions = useMemo(
    () => (property ? getPropertyActions(property.id) : []),
    [property, getPropertyActions],
  );

  if (!property && propertyLoadState === 'loading') {
    return (
      <AgentShell>
        <p className="text-muted-foreground py-16 text-center text-sm">Loading property…</p>
      </AgentShell>
    );
  }

  if (!property && propertyLoadState === 'missing') notFound();

  const tasks = {
    maintenance: maintenanceAll.filter(
      (m) => m.propertyId === id || m.propertyAddress.includes(property.address),
    ),
    inspections: inspections.filter((i) => i.propertyId === id),
    rentReviews: rentReviewsForProperty(rentReviews, id, property),
  };
  // Prefer exact address match — substring-on-street leaked other properties' docs into
  // this property's Documents checklist and inflated per-slot counts.
  const propertyFullAddress = formatPropertyFullAddress(property);
  const propertyStreet = property.address.split(',')[0]?.trim() ?? '';
  const propertyDocs = documents.filter((d) => {
    const addr = d.propertyAddress.trim();
    if (!addr || addr === 'Portfolio') return false;
    if (addr === propertyFullAddress || addr === property.address) return true;
    // Aggregated rows sometimes omit suburb/state; allow street-only equality, not substring.
    return Boolean(propertyStreet) && addr === propertyStreet;
  });
  const leasing = leasingRecords.filter((l) => l.propertyId === id);
  const acct = accounting.find((a) => a.propertyId === id);
  const propertyLeasingCases = tenantSelections.filter((t) => t.propertyId === id);
  const propertyVacatingCases = vacating.filter((v) => v.propertyId === id);
  const currentTenancy = leasing.filter(
    (l) => l.status === 'current' || l.status === 'upcoming',
  );
  const currentLease =
    currentTenancy.find((l) => l.status === 'current') ?? currentTenancy[0];
  const isVacant = isPropertyVacant(property, currentTenancy);
  const tenancyArchived = isTenancyArchived({
    property,
    vacatingCases: propertyVacatingCases,
    currentLease,
  });
  const readOnlyDocumentGroups = archivedDocumentGroups(tenancyArchived);
  const tenancyRentReviews = filterTenancyRentReviews(tasks.rentReviews, isVacant);
  const activeOpenInspection = getActiveOpenInspection(tasks.inspections, id);
  const activeOutgoingInspection = getActiveOutgoingInspection(tasks.inspections, id);
  const inOpenInspectionPhase = isInOpenInspectionPhase({
    isVacant,
    currentLease,
    activeOpenInspection,
  });
  const propertyLeasingCycles = leasingCycles.filter((c) => c.propertyId === id);
  const propertyDeletedLeasingCycles = useMemo(
    () => archive.cancelledLeasingCycles.filter((c) => c.propertyId === id),
    [archive.cancelledLeasingCycles, id],
  );
  const propertyDeletedEndLeasingCases = useMemo(
    () => archive.cancelledEndLeasing.filter((c) => c.propertyId === id),
    [archive.cancelledEndLeasing, id],
  );
  const propertyDeletedRentReviews = useMemo(
    () => archive.cancelledRentReviews.filter((r) => r.propertyId === id),
    [archive.cancelledRentReviews, id],
  );
  const nextRentReviewDate = getNextRentReviewDate(property, tenancyRentReviews, {
    isVacant,
  });
  const nextRentReviewCase = getNextRentReviewCase(property, tenancyRentReviews, {
    isVacant,
  });
  const propertyTribunalCases = tribunalCases.filter((t) => t.propertyId === id);
  const clearPropertyInspectionFocus = useCallback(() => {
    setSelectedInspectionId(null);
    if (!searchParams.get('inspection')) return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete('inspection');
    const query = next.toString();
    router.replace(query ? `/properties/${id}?${query}` : `/properties/${id}`);
  }, [id, router, searchParams]);

  const selectedRentReview =
    selectedRentReviewId != null
      ? tasks.rentReviews.find((r) => r.id === selectedRentReviewId) ?? null
      : null;

  const showAmenityIcons =
    property.bedrooms != null || property.bathrooms != null || property.carSpaces != null;
  const fullAddress = formatPropertyFullAddress(property);

  return (
    <AgentShell title={fullAddress} backHref={ROUTES.PROPERTIES} backLabel="Properties">
      <div className="space-y-4 pb-8">
        {isArchivedProperty ? (
          <div className="rounded-xl border border-muted-foreground/20 bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Archived property</p>
            <p className="text-muted-foreground mt-1">
              Management ended
              {property.endOfManagementDate
                ? ` on ${formatDate(property.endOfManagementDate)}`
                : ''}
              . This record is read-only for reference.
            </p>
          </div>
        ) : null}
        {property.registryIntakeComplete === false ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="text-amber-950 dark:text-amber-100">
              Property registration is incomplete. Resume the wizard to finish intake.
            </p>
            <Link
              href={propertyRegistryResume(property.id)}
              className="font-semibold text-amber-900 underline underline-offset-2 dark:text-amber-200"
            >
              Resume registration
            </Link>
          </div>
        ) : null}
        <div className="rounded-2xl border bg-gradient-to-br from-card to-secondary/30 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-snug">{fullAddress}</p>
              {showAmenityIcons ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {property.bedrooms != null ? (
                    <span className="inline-flex items-center gap-1 text-sm">
                      <BedDouble className="text-primary size-3.5" aria-hidden />
                      <span className="font-semibold tabular-nums">{property.bedrooms}</span>
                    </span>
                  ) : null}
                  {property.bathrooms != null ? (
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Bath className="text-primary size-3.5" aria-hidden />
                      <span className="font-semibold tabular-nums">{property.bathrooms}</span>
                    </span>
                  ) : null}
                  {property.carSpaces != null ? (
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Car className="text-primary size-3.5" aria-hidden />
                      <span className="font-semibold tabular-nums">
                        {formatCarSpaces(property.carSpaces)}
                      </span>
                    </span>
                  ) : null}
                </div>
              ) : null}
              {/* {property.rentWeekly > 0 && (
                <p className="text-primary mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(property.rentWeekly)}
                  <span className="text-muted-foreground text-xs font-normal">/week</span>
                </p>
              )} */}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {needActions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById('property-gii-panel')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    setRemindersOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-xl border-2 border-amber-500/60 bg-amber-500/15 px-3 py-2 text-amber-950 shadow-sm transition hover:bg-amber-500/25 dark:text-amber-100"
                  aria-label={`${needActions.length} reminder${needActions.length === 1 ? '' : 's'}`}
                >
                  <ListTodo className="size-4 shrink-0" />
                  <span className="text-xs font-bold leading-none">Reminder</span>
                  <span className="bg-amber-600 min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold text-white tabular-nums">
                    {needActions.length}
                  </span>
                </button>
              )}
            </div>
          </div>

          <PropertyProfileDetails
            property={property}
            propertyId={id}
            currentLease={currentLease}
            inspections={tasks.inspections}
            propertyDocs={propertyDocs}
            leasingCycles={propertyLeasingCycles}
            tenantSelections={propertyLeasingCases}
            vacatingCases={propertyVacatingCases}
            rentReviews={tasks.rentReviews}
            onViewBondLodgement={viewBondLodgement}
            onRefresh={() => void refresh()}
          />
        </div>

        <PropertyTabBar tabs={propertyTabs} active={tab} onChange={setTab} />

        <PropertyGiiPanel propertyId={id} propertyAddress={fullAddress} />

        {tab === 'Documents' && (
          <PropertyDocumentsTab
            property={property}
            propertyId={id}
            fallbackDocuments={propertyDocs}
            readOnlyGroups={readOnlyDocumentGroups}
            readOnlyHint={
              tenancyArchived
                ? 'Tenancy and tenant application documents are archived and cannot be edited.'
                : undefined
            }
          />
        )}

        {tab === 'Fees' && <PropertyFeesTab property={property} propertyId={id} />}

        {tab === 'Rent Review' && (
          <PropertyRentReviewTab
            property={property}
            propertyId={id}
            rentReviews={tasks.rentReviews}
            rentReviewDecisions={decisions}
            leasingRecords={leasing}
            leasingCycles={propertyLeasingCycles}
            vacatingCases={propertyVacatingCases}
            maintenance={tasks.maintenance}
            inspections={tasks.inspections}
            tribunalCases={tribunalCases.filter((t) => t.propertyId === id)}
            tenantSelections={propertyLeasingCases}
            currentLease={currentLease}
            onWorkflowCreated={() => void refresh()}
            deletedRentReviews={propertyDeletedRentReviews}
          />
        )}

        {tab === 'Leasing' && (
          <PropertyLeasingJobPanel
            property={property}
            propertyId={id}
            tenantSelections={propertyLeasingCases}
            vacatingCases={propertyVacatingCases}
            outgoingInspection={activeOutgoingInspection}
            rentReviews={tenancyRentReviews}
            rentReviewDecisions={decisions}
            currentLease={currentLease}
            leasingCycles={propertyLeasingCycles}
            maintenance={tasks.maintenance}
            inspections={tasks.inspections}
            tribunalCases={tribunalCases.filter((t) => t.propertyId === id)}
            nextRentReviewDate={nextRentReviewDate}
            nextRentReviewCase={nextRentReviewCase}
            inOpenInspectionPhase={inOpenInspectionPhase}
            isVacant={isVacant}
            onViewRentReview={setSelectedRentReviewId}
            onWorkflowCreated={() => void refresh()}
            leasingFocusBond={leasingFocusBond}
            leasingInitialCategory={leasingFocusBond ? 'leasing' : undefined}
            onLeasingFocusBondHandled={clearLeasingBondFocus}
            onOpenInspectionCreated={openPropertyInspection}
            deletedLeasingCycles={propertyDeletedLeasingCycles}
            deletedEndLeasingCases={propertyDeletedEndLeasingCases}
          />
        )}

        {tab === 'Maintenance' && (
          <PropertyMaintenanceTab
            property={property}
            propertyId={id}
            maintenance={tasks.maintenance}
            leasingCycles={propertyLeasingCycles}
            rentReviews={tenancyRentReviews}
            vacatingCases={propertyVacatingCases}
            inspections={tasks.inspections}
            tribunalCases={tribunalCases.filter((t) => t.propertyId === id)}
            tenantSelections={propertyLeasingCases}
            currentLease={currentLease}
            onRefresh={() => void refresh()}
          />
        )}

        {tab === 'Inspection' && (
          <PropertyInspectionTab
            property={property}
            propertyId={id}
            inspections={tasks.inspections}
            leasingCycles={propertyLeasingCycles}
            rentReviews={tenancyRentReviews}
            vacatingCases={propertyVacatingCases}
            maintenance={tasks.maintenance}
            tribunalCases={tribunalCases.filter((t) => t.propertyId === id)}
            tenantSelections={propertyLeasingCases}
            currentLease={currentLease}
            isVacant={isVacant}
            onViewInspection={setSelectedInspectionId}
            onRefresh={() => void refresh()}
          />
        )}

        {tab === 'Accounting' && (
          <PropertyAccountingTab
            propertyId={id}
            accounting={acct}
            arrearsSectionRef={arrearsSectionRef}
          />
        )}

        {tab === 'Tribunal' && (
          <PropertyTribunalTab
            property={property}
            propertyId={id}
            tribunalCases={propertyTribunalCases}
            leasingCycles={propertyLeasingCycles}
            rentReviews={tenancyRentReviews}
            vacatingCases={propertyVacatingCases}
            maintenance={tasks.maintenance}
            inspections={tasks.inspections}
            tenantSelections={propertyLeasingCases}
            currentLease={currentLease}
            onRefresh={() => void refresh()}
          />
        )}

        {tab === 'Archive' && (
          <PropertyHistoryTab property={property} propertyId={id} leasing={leasing} />
        )}
      </div>

      <InspectionCaseDetailDialog
        open={selectedInspectionId !== null}
        onClose={clearPropertyInspectionFocus}
        inspectionId={selectedInspectionId}
        navContext={fromProperty(id, 'Inspection')}
      />
      <RentReviewDetailDialog
        open={selectedRentReviewId !== null}
        onClose={() => setSelectedRentReviewId(null)}
        review={selectedRentReview}
        navContext={fromProperty(id, 'Rent Review')}
      />
      <PropertyChatDialog
        open={leasingChatOpen}
        onClose={() => setLeasingChatOpen(false)}
        propertyId={id}
        propertyAddress={fullAddress}
        category="Leasing"
        title="Leasing messages"
      />
      <PropertyRemindersDialog
        needActions={needActions}
        open={remindersOpen}
        onOpenChange={setRemindersOpen}
      />
    </AgentShell>
  );
}
