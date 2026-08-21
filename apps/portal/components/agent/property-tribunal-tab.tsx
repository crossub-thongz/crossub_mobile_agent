'use client';

import { useEffect, useState } from 'react';

import { CreateTribunalRentChasingDialog } from '@/components/agent/create-tribunal-rent-chasing-dialog';
import { PropertyTribunalCasesTable } from '@/components/agent/property-tribunal-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { TribunalCaseDetailDialog } from '@/components/agent/tribunal-case-detail-dialog';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceItem,
  Property,
  RentReviewCase,
  TenantSelectionCase,
  TribunalCase,
  VacatingCase,
} from '@/lib/types';

export function PropertyTribunalTab({
  property,
  propertyId,
  tribunalCases,
  leasingCycles,
  rentReviews,
  vacatingCases,
  maintenance,
  inspections,
  tenantSelections,
  currentLease,
  focusCaseId,
  onRefresh,
}: {
  property: Property;
  propertyId: string;
  tribunalCases: TribunalCase[];
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceItem[];
  inspections: Inspection[];
  tenantSelections: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  focusCaseId?: string | null;
  onRefresh?: () => void;
}) {
  const { properties } = useAgentData();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(focusCaseId ?? null);
  const [tribunalOpen, setTribunalOpen] = useState(false);
  const selectedCase =
    tribunalCases.find((row) => row.id === selectedCaseId) ?? null;

  useEffect(() => {
    if (focusCaseId) setSelectedCaseId(focusCaseId);
  }, [focusCaseId]);

  return (
    <div className="space-y-4">
      <PropertyWorkflowPanel
        tab="tribunal"
        property={property}
        propertyId={propertyId}
        leasingCycles={leasingCycles}
        rentReviews={rentReviews}
        vacatingCases={vacatingCases}
        maintenance={maintenance}
        inspections={inspections}
        tribunalCases={tribunalCases}
        tenantSelections={tenantSelections}
        currentLease={currentLease}
        emptyTitle="No tribunal cases"
        emptyDescription="NCAT and tribunal matters for this property. Open a case from accounting arrears when rent, bills, or bond are outstanding."
        onCreated={() => void onRefresh?.()}
        onCustomAction={(actionId) => {
          if (actionId === 'open_tribunal') {
            setTribunalOpen(true);
            return true;
          }
          return false;
        }}
      />

      <CreateTribunalRentChasingDialog
        open={tribunalOpen}
        onOpenChange={setTribunalOpen}
        propertyId={propertyId}
        properties={properties}
        mode="tribunal"
        onCreated={() => {
          setTribunalOpen(false);
          void onRefresh?.();
        }}
      />

      <PropertyTribunalCasesTable
        items={tribunalCases}
        selectedId={selectedCaseId}
        onItemClick={(item) => setSelectedCaseId(item.id)}
      />

      <TribunalCaseDetailDialog
        open={selectedCaseId != null}
        onClose={() => setSelectedCaseId(null)}
        caseId={selectedCaseId}
        tribunalCase={selectedCase}
        onDeleted={async () => {
          setSelectedCaseId(null);
          await onRefresh?.();
        }}
      />
    </div>
  );
}
