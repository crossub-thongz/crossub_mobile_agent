'use client';

import { useMemo } from 'react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentStore } from '@/lib/store';
import {
  buildPortfolioTaskList,
  filterTaskListV2RowsForAgencies,
  type TaskListV2Row,
} from '@/lib/task-list-v2';

/**
 * Every task row across the agent's portfolio, as the Tasks page lists them. Cros's briefing reads
 * the same rows, so "needs my action" means the same thing in both places.
 */
export function usePortfolioTaskRows(propertyFilter?: string | null): TaskListV2Row[] {
  const {
    properties,
    agencies,
    leasingRecords,
    maintenanceAll,
    inspections,
    rentReviews,
    leasingCycles,
    tenantSelections,
    vacating,
    tribunalCases,
    accounting,
    getPropertyActions,
  } = useAgentData();
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);

  return useMemo(
    () =>
      filterTaskListV2RowsForAgencies(
        buildPortfolioTaskList({
          properties: propertyFilter
            ? properties.filter((property) => property.id === propertyFilter)
            : properties,
          leasingRecords,
          maintenanceAll,
          inspections,
          rentReviews,
          rentReviewDecisions,
          leasingCycles,
          tenantSelections,
          vacating,
          tribunalCases,
          accounting,
          getPropertyActions,
          agencies,
        }),
        agencies,
      ),
    [
      accounting,
      agencies,
      getPropertyActions,
      inspections,
      leasingCycles,
      leasingRecords,
      maintenanceAll,
      properties,
      propertyFilter,
      rentReviewDecisions,
      rentReviews,
      tenantSelections,
      tribunalCases,
      vacating,
    ],
  );
}
