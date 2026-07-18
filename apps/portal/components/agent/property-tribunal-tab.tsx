'use client';

import { useRouter } from 'next/navigation';

import { PropertyTribunalCasesTable } from '@/components/agent/property-tribunal-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { tribunalDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
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
  const router = useRouter();

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
            router.push(tribunalDetail(result.id, fromProperty(propertyId, 'Tribunal')));
          }
        }}
        actionsOnly
      />

      <PropertyTribunalCasesTable
        items={tribunalCases}
        onItemClick={(item) =>
          router.push(tribunalDetail(item.id, fromProperty(propertyId, 'Tribunal')))
        }
      />
    </div>
  );
}
