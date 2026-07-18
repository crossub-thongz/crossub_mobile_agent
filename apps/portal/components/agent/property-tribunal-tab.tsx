'use client';

import { useState } from 'react';

import { PropertyTribunalCasesTable } from '@/components/agent/property-tribunal-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { TribunalCaseDetailDialog } from '@/components/agent/tribunal-case-detail-dialog';
import {
  isWorkflowCreatedCase,
  type PropertyWorkflowCreatedResult,
} from '@/lib/property-workflow-created';
import type {
  Inspection,
  LeasingCycle,
  LeasingRecord,
  MaintenanceRequest,
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
  onRefresh,
}: {
  property: Property;
  propertyId: string;
  tribunalCases: TribunalCase[];
  leasingCycles: LeasingCycle[];
  rentReviews: RentReviewCase[];
  vacatingCases: VacatingCase[];
  maintenance: MaintenanceRequest[];
  inspections: Inspection[];
  tenantSelections: TenantSelectionCase[];
  currentLease?: LeasingRecord;
  onRefresh?: () => void;
}) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const selectedCase =
    tribunalCases.find((row) => row.id === selectedCaseId) ?? null;

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
        onCreated={async (result?: PropertyWorkflowCreatedResult) => {
          await onRefresh?.();
          if (result && isWorkflowCreatedCase(result) && result.kind === 'tribunal') {
            setSelectedCaseId(result.id);
          }
        }}
        actionsOnly
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
      />
    </div>
  );
}
