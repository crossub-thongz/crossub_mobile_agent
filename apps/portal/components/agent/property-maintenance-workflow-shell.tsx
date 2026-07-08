'use client';

import { useEffect, useMemo, useState } from 'react';

import { PropertyMaintenanceJobPanel } from '@/components/agent/property-maintenance-job-panel';
import { WorkflowCategoryTabs } from '@/components/agent/workflow-category-tabs';
import {
  buildPropertyMaintenanceWorkflowCases,
  pickPrimaryMaintenanceCase,
  type PropertyMaintenanceWorkflowCase,
} from '@/lib/property-maintenance-workflow-cases';
import type { Property } from '@/lib/types';

export function PropertyMaintenanceWorkflowShell({
  cases,
  property,
  propertyId,
}: {
  cases: PropertyMaintenanceWorkflowCase[];
  property: Property;
  propertyId: string;
}) {
  const jobTabs = useMemo(
    () =>
      cases.map((item) => ({
        id: item.id,
        label: item.label,
        count: 1,
      })),
    [cases],
  );

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (cases.length === 0) {
      setSelectedCaseId(null);
      return;
    }
    if (!selectedCaseId || !cases.some((item) => item.id === selectedCaseId)) {
      setSelectedCaseId(pickPrimaryMaintenanceCase(cases)?.id ?? cases[0]?.id ?? null);
    }
  }, [cases, selectedCaseId]);

  if (cases.length === 0) return null;

  const selectedCase =
    cases.find((item) => item.id === selectedCaseId) ?? pickPrimaryMaintenanceCase(cases) ?? cases[0];

  return (
    <div className="space-y-3">
      <WorkflowCategoryTabs
        tabs={jobTabs}
        value={selectedCase.id}
        onChange={setSelectedCaseId}
        showCount={false}
      />

      <PropertyMaintenanceJobPanel
        item={selectedCase.request}
        property={property}
        propertyId={propertyId}
      />
    </div>
  );
}
