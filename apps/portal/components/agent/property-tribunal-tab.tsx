'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { PropertyJobCasesTable } from '@/components/agent/property-job-cases-table';
import { PropertyWorkflowPanel } from '@/components/agent/property-workflow-panel';
import { tribunalDetail } from '@/constants/routes';
import { fromProperty } from '@/lib/detail-navigation';
import { tribunalJobRows } from '@/lib/property-job-rows';
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
  const jobRows = useMemo(() => tribunalJobRows(tribunalCases), [tribunalCases]);

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
        onCreated={() => onRefresh?.()}
        actionsOnly
      />

      <PropertyJobCasesTable
        rows={jobRows}
        onRowClick={(id) =>
          router.push(tribunalDetail(id, fromProperty(propertyId, 'Tribunal')))
        }
        showKeyDateColumn={false}
        emptyTitle="No tribunal cases"
        emptyDescription="NCAT / tribunal matters for this property will appear here."
      />
    </div>
  );
}
