'use client';

import Link from 'next/link';
import { notFound, useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bath,
  BedDouble,
  Car,
  History,
  ListTodo,
} from 'lucide-react';

import { InfoPanel } from '@/components/agent/info-panel';
import { InspectionDetailDialog } from '@/components/agent/inspection-detail-dialog';
import { PropertyInspectionTab } from '@/components/agent/property-inspection-tab';
import { PropertyLeasingJobPanel } from '@/components/agent/property-leasing-job-panel';
import { PropertyMaintenanceTab } from '@/components/agent/property-maintenance-tab';
import { PropertyOverviewTab } from '@/components/agent/property-overview-tab';
import { PropertyProfileDetails } from '@/components/agent/property-profile-details';
import { PropertyTabBar } from '@/components/agent/property-tab-bar';
import { PropertyChatDialog } from '@/components/agent/property-chat-dialog';
import { PropertyAccountingTab } from '@/components/agent/property-accounting-tab';
import { PropertyDocumentsTab } from '@/components/agent/property-documents-tab';
import { PropertyRentReviewTab } from '@/components/agent/property-rent-review-tab';
import { RentReviewDetailDialog } from '@/components/agent/rent-review-detail-dialog';
import { TenancyHistorySection } from '@/components/agent/tenancy-history-section';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import {
  filterTenancyRentReviews,
  getActiveOpenInspection,
  getActiveOutgoingInspection,
  getNextRentReviewCase,
  getNextRentReviewDate,
  isInOpenInspectionPhase,
  isPropertyVacant,
} from '@/lib/property-leasing';
import {
  isPropertyLeasingBondFocus,
  propertyLeasingBondFocusPath,
} from '@/lib/property-leasing-navigation';
import { useAgentStore } from '@/lib/store';
import { formatCurrency, formatPropertyFullAddress } from '@/lib/utils';
import { formatCarSpaces } from '@/lib/property-overview';
import {
  PROPERTY_DETAIL_TABS,
  propertyDetailTabsForAgency,
  type PropertyDetailTab,
} from '@/lib/portal-service-level';

type Tab = PropertyDetailTab;

function normalizeTab(raw: string | null, allowedTabs: readonly Tab[]): Tab {
  if (raw === 'Tenancy' || raw === 'Communication') {
    if (allowedTabs.includes('Leasing')) return 'Leasing';
    return allowedTabs[0] ?? 'Overview';
  }
  if (allowedTabs.includes(raw as Tab)) return raw as Tab;
  return allowedTabs[0] ?? 'Overview';
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const {
    properties,
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
    getPropertyActions,
    refresh,
  } = useAgentData();
  const decisions = useAgentStore((s) => s.rentReviewDecisions);
  const property = properties.find((p) => p.id === id);
  const propertyTabs = useMemo(
    () =>
      property
        ? propertyDetailTabsForAgency(agencies, property.agencyId)
        : [...PROPERTY_DETAIL_TABS],
    [agencies, property],
  );
  const [tab, setTab] = useState<Tab>('Overview');
  const [overviewView, setOverviewView] = useState<'summary' | 'history'>('summary');
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);
  const [selectedRentReviewId, setSelectedRentReviewId] = useState<string | null>(null);
  const [leasingChatOpen, setLeasingChatOpen] = useState(false);
  const arrearsSectionRef = useRef<HTMLElement | null>(null);
  const leasingFocusBond = isPropertyLeasingBondFocus(searchParams);

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
    if (searchParams.get('focus') !== 'arrears' || tab !== 'Accounting') return;
    arrearsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [searchParams, tab]);

  const needActions = useMemo(
    () => (property ? getPropertyActions(property.id) : []),
    [property, getPropertyActions],
  );

  if (!property) notFound();

  const tasks = {
    maintenance: maintenanceAll.filter(
      (m) => m.propertyId === id || m.propertyAddress.includes(property.address),
    ),
    inspections: inspections.filter((i) => i.propertyId === id),
    rentReviews: rentReviews.filter((r) => r.propertyId === id),
  };
  const propertyDocs = documents.filter((d) =>
    d.propertyAddress.includes(property.address.split(',')[0]),
  );
  const leasing = leasingRecords.filter((l) => l.propertyId === id);
  const acct = accounting.find((a) => a.propertyId === id);
  const propertyLeasingCases = tenantSelections.filter((t) => t.propertyId === id);
  const propertyVacatingCases = vacating.filter((v) => v.propertyId === id);
  const currentTenancy = leasing.filter((l) => l.status === 'current');
  const currentLease = currentTenancy[0];
  const isVacant = isPropertyVacant(property, currentTenancy);
  const tenancyRentReviews = filterTenancyRentReviews(tasks.rentReviews, isVacant);
  const activeOpenInspection = getActiveOpenInspection(tasks.inspections, id);
  const activeOutgoingInspection = getActiveOutgoingInspection(tasks.inspections, id);
  const inOpenInspectionPhase = isInOpenInspectionPhase({
    isVacant,
    currentLease,
    activeOpenInspection,
  });
  const propertyLeasingCycles = leasingCycles.filter((c) => c.propertyId === id);
  const nextRentReviewDate = getNextRentReviewDate(property, tenancyRentReviews, {
    isVacant,
  });
  const nextRentReviewCase = getNextRentReviewCase(property, tenancyRentReviews, {
    isVacant,
  });
  const selectedInspection =
    selectedInspectionId != null
      ? tasks.inspections.find((i) => i.id === selectedInspectionId) ?? null
      : null;
  const selectedRentReview =
    selectedRentReviewId != null
      ? tenancyRentReviews.find((r) => r.id === selectedRentReviewId) ?? null
      : null;

  const showAmenityIcons =
    property.bedrooms != null || property.bathrooms != null || property.carSpaces != null;
  const fullAddress = formatPropertyFullAddress(property);

  return (
    <AgentShell title={fullAddress} backHref={ROUTES.PROPERTIES} backLabel="Properties">
      <div className="space-y-4 pb-8">
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
              {property.rentWeekly > 0 && (
                <p className="text-primary mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(property.rentWeekly)}
                  <span className="text-muted-foreground text-xs font-normal">/week</span>
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {needActions.length > 0 && (
                <Link
                  href={ROUTES.TASKS}
                  className="flex flex-col items-center gap-0.5 rounded-xl border border-destructive/30 bg-destructive/10 px-2.5 py-2 text-destructive"
                  aria-label="Need action"
                >
                  <ListTodo className="size-4" />
                  <span className="text-[10px] font-bold">{needActions.length}</span>
                </Link>
              )}
            </div>
          </div>

          {tab === 'Overview' ? (
            <PropertyProfileDetails
              property={property}
              propertyId={id}
              currentLease={currentLease}
              inspections={tasks.inspections}
              propertyDocs={propertyDocs}
              leasingCycles={propertyLeasingCycles}
              tenantSelections={propertyLeasingCases}
              onViewBondLodgement={viewBondLodgement}
              onRefresh={() => void refresh()}
            />
          ) : null}
        </div>

        <PropertyTabBar tabs={propertyTabs} active={tab} onChange={setTab} />

        {tab === 'Overview' && (
          <div className="space-y-4">
            {overviewView === 'history' ? (
              <>
                <button
                  type="button"
                  onClick={() => setOverviewView('summary')}
                  className="text-primary text-sm font-medium"
                >
                  ← Back to overview
                </button>
                <InfoPanel title="Tenancy history" icon={History}>
                  <TenancyHistorySection propertyId={id} records={leasing} />
                </InfoPanel>
              </>
            ) : (
              <PropertyOverviewTab
                property={property}
                propertyId={id}
                needActions={needActions}
                maintenance={tasks.maintenance}
                inspections={tasks.inspections}
                propertyDocs={propertyDocs}
                leasing={leasing}
                currentLease={currentLease}
                rentReviewDecisions={decisions}
                tenancyRentReviews={tenancyRentReviews}
                leasingCycles={propertyLeasingCycles}
                tenantSelections={propertyLeasingCases}
                vacatingCases={propertyVacatingCases}
                tribunalCases={tribunalCases.filter((t) => t.propertyId === id)}
                accounting={acct}
                onViewHistory={() => setOverviewView('history')}
                onRefresh={() => void refresh()}
                onViewBondLodgement={viewBondLodgement}
              />
            )}
          </div>
        )}

        {tab === 'Documents' && (
          <PropertyDocumentsTab
            property={property}
            propertyId={id}
            fallbackDocuments={propertyDocs}
          />
        )}

        {tab === 'Rent Review' && (
          <PropertyRentReviewTab
            property={property}
            propertyId={id}
            rentReviews={tenancyRentReviews}
            rentReviewDecisions={decisions}
            leasingRecords={leasing}
            leasingCycles={propertyLeasingCycles}
            vacatingCases={propertyVacatingCases}
            maintenance={tasks.maintenance}
            inspections={tasks.inspections}
            tribunalCases={tribunalCases.filter((t) => t.propertyId === id)}
            tenantSelections={propertyLeasingCases}
            currentLease={currentLease}
            onViewRentReview={setSelectedRentReviewId}
            onWorkflowCreated={() => void refresh()}
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
      </div>

      <InspectionDetailDialog
        open={selectedInspectionId !== null}
        onClose={() => setSelectedInspectionId(null)}
        inspection={selectedInspection}
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
    </AgentShell>
  );
}
