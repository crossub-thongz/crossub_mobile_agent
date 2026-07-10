'use client';

import { useEffect, useMemo, useState } from 'react';

import { PropertyLeasingCaseWorkflowContent } from '@/components/agent/property-leasing-case-workflow-dialog';
import { WorkflowCategoryTabs } from '@/components/agent/workflow-category-tabs';
import {
  LEASING_CATEGORY_LABEL,
  LEASING_WORKFLOW_CATEGORIES,
  type PropertyLeasingWorkflowCase,
  type PropertyLeasingWorkflowCategory,
} from '@/lib/property-leasing-workflow-cases';
import type { RentReviewDecision } from '@/lib/rent-review';
import type { Property, RentReviewCase, VacatingCase } from '@/lib/types';

function CasePicker({
  cases,
  selectedId,
  onSelect,
}: {
  cases: PropertyLeasingWorkflowCase[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  if (cases.length <= 1) return null;

  return (
    <div className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1">
      {cases.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={
            selectedId === item.id
              ? 'shrink-0 rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary'
              : 'text-muted-foreground shrink-0 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium'
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function PropertyLeasingWorkflowShell({
  cases,
  property,
  propertyId,
  rentReviews,
  rentReviewDecisions,
  vacatingCases,
  rentWeekly,
  onViewRentReview,
  initialCategory,
  focusBond = false,
  onFocusBondHandled,
  emptyTitle = 'No leasing activity yet',
  emptyDescription = 'Start a new leasing cycle, rent review, or end leasing case for this property.',
}: {
  cases: PropertyLeasingWorkflowCase[];
  property: Property;
  propertyId: string;
  rentReviews: RentReviewCase[];
  rentReviewDecisions: Record<string, RentReviewDecision | null | undefined>;
  vacatingCases: VacatingCase[];
  rentWeekly?: number;
  onViewRentReview?: (reviewId: string) => void;
  initialCategory?: PropertyLeasingWorkflowCategory;
  focusBond?: boolean;
  onFocusBondHandled?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const casesByCategory = useMemo(() => {
    const grouped: Record<PropertyLeasingWorkflowCategory, PropertyLeasingWorkflowCase[]> = {
      leasing: [],
      rent_review: [],
      end_leasing: [],
    };
    for (const item of cases) {
      grouped[item.category].push(item);
    }
    return grouped;
  }, [cases]);

  const categoryTabs = useMemo(
    () =>
      LEASING_WORKFLOW_CATEGORIES.map((category) => ({
        id: category,
        label: LEASING_CATEGORY_LABEL[category],
        count: casesByCategory[category].length,
      })),
    [casesByCategory],
  );

  const availableCategories = useMemo(
    () => LEASING_WORKFLOW_CATEGORIES.filter((category) => casesByCategory[category].length > 0),
    [casesByCategory],
  );

  const [selectedCategory, setSelectedCategory] = useState<PropertyLeasingWorkflowCategory | null>(
    null,
  );
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    if (availableCategories.length === 0) {
      setSelectedCategory(null);
      setSelectedCaseId(null);
      return;
    }
    const preferredCategory =
      initialCategory && availableCategories.includes(initialCategory)
        ? initialCategory
        : selectedCategory && availableCategories.includes(selectedCategory)
          ? selectedCategory
          : availableCategories[0];
    setSelectedCategory(preferredCategory);
    const categoryCases = casesByCategory[preferredCategory];
    if (!selectedCaseId || !categoryCases.some((item) => item.id === selectedCaseId)) {
      setSelectedCaseId(categoryCases[0]?.id ?? null);
    }
  }, [
    availableCategories,
    casesByCategory,
    initialCategory,
    selectedCategory,
    selectedCaseId,
  ]);

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
  const selectedCase =
    categoryCases.find((item) => item.id === selectedCaseId) ?? categoryCases[0] ?? null;

  return (
    <div className="space-y-3">
      <WorkflowCategoryTabs
        tabs={categoryTabs}
        value={activeCategory}
        onChange={(id) => {
          const category = id as PropertyLeasingWorkflowCategory;
          setSelectedCategory(category);
          setSelectedCaseId(casesByCategory[category][0]?.id ?? null);
        }}
      />

      {selectedCase ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              {LEASING_CATEGORY_LABEL[selectedCase.category]} · {selectedCase.label}
            </p>
            <p className="text-sm font-medium">{selectedCase.currentStep}</p>
            {selectedCase.detail ? (
              <p className="text-muted-foreground text-xs">{selectedCase.detail}</p>
            ) : null}
          </div>

          <CasePicker
            cases={categoryCases}
            selectedId={selectedCase.id}
            onSelect={setSelectedCaseId}
          />

          <PropertyLeasingCaseWorkflowContent
            item={selectedCase}
            property={property}
            propertyId={propertyId}
            rentReviews={rentReviews}
            rentReviewDecisions={rentReviewDecisions}
            vacatingCases={vacatingCases}
            rentWeekly={rentWeekly}
            onViewRentReview={onViewRentReview}
            focusBond={focusBond && selectedCase.category === 'leasing'}
            onFocusBondHandled={onFocusBondHandled}
          />
        </div>
      ) : null}
    </div>
  );
}
