'use client';

import { useEffect, useMemo, useState } from 'react';

import { Timeline } from '@/components/agent/timeline';
import { WorkflowCategoryTabs } from '@/components/agent/workflow-category-tabs';
import { Button } from '@/components/ui/button';
import { CaseAddressAssignedBar } from '@/components/agent/case-address-assigned-bar';
import {
  INSPECTION_CATEGORY_LABEL,
  INSPECTION_WORKFLOW_CATEGORIES,
  type PropertyInspectionWorkflowCase,
  type PropertyInspectionWorkflowCategory,
} from '@/lib/property-inspection-workflow-cases';
import { formatScheduledAt } from '@/lib/utils';

function InspectionCaseDetail({
  item,
  onViewDetails,
}: {
  item: PropertyInspectionWorkflowCase;
  onViewDetails: (id: string) => void;
}) {
  const inspection = item.inspection;

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="space-y-1">
        <p className="text-primary text-[10px] font-semibold uppercase tracking-wide">
          {INSPECTION_CATEGORY_LABEL[item.category]}
        </p>
        <p className="text-sm font-semibold">
          {formatScheduledAt(inspection.scheduledAt)}
        </p>
        <p className="text-primary text-xs font-medium">{item.status}</p>
        <p className="text-muted-foreground text-xs capitalize">
          Report: {inspection.reportStatus}
        </p>
      </div>

      {inspection.timeline.length > 0 ? (
        <div className="border-t pt-3">
          <Timeline entries={inspection.timeline.slice(0, 3)} />
        </div>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onViewDetails(inspection.id)}
      >
        View details
      </Button>
    </div>
  );
}

export function PropertyInspectionWorkflowShell({
  cases,
  onViewDetails,
  emptyTitle = 'No inspections',
  emptyDescription = 'When an inspection is scheduled, it will appear here.',
}: {
  cases: PropertyInspectionWorkflowCase[];
  onViewDetails: (inspectionId: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const casesByCategory = useMemo(() => {
    const grouped: Record<PropertyInspectionWorkflowCategory, PropertyInspectionWorkflowCase[]> = {
      open: [],
      ingoing: [],
      outgoing: [],
      routine: [],
    };
    for (const item of cases) {
      grouped[item.category].push(item);
    }
    return grouped;
  }, [cases]);

  const categoryTabs = useMemo(
    () =>
      INSPECTION_WORKFLOW_CATEGORIES.map((category) => ({
        id: category,
        label: INSPECTION_CATEGORY_LABEL[category],
        count: casesByCategory[category].length,
      })),
    [casesByCategory],
  );

  const availableCategories = useMemo(
    () => INSPECTION_WORKFLOW_CATEGORIES.filter((category) => casesByCategory[category].length > 0),
    [casesByCategory],
  );

  const [selectedCategory, setSelectedCategory] = useState<PropertyInspectionWorkflowCategory | null>(
    null,
  );

  useEffect(() => {
    if (availableCategories.length === 0) {
      setSelectedCategory(null);
      return;
    }
    setSelectedCategory((current) =>
      current && availableCategories.includes(current) ? current : availableCategories[0],
    );
  }, [availableCategories]);

  if (cases.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center">
        <p className="text-sm font-medium">{emptyTitle}</p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs">{emptyDescription}</p>
      </div>
    );
  }

  const activeCategory = selectedCategory ?? availableCategories[0];
  const categoryCases = activeCategory ? casesByCategory[activeCategory] : [];

  return (
    <div className="space-y-3">
      <WorkflowCategoryTabs
        tabs={categoryTabs}
        value={activeCategory}
        onChange={(id) => setSelectedCategory(id as PropertyInspectionWorkflowCategory)}
      />

      {categoryCases.length > 0 ? (
        <div className="space-y-3">
          {categoryCases.map((item) => (
            <InspectionCaseDetail
              key={item.id}
              item={item}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
