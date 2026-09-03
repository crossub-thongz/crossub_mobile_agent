'use client';

import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { InspectionsListTable } from '@/components/agent/portfolio-module-tables';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import {
  PROPERTY_HISTORY_SCOPE_FILTERS,
  type PropertyHistoryScope,
} from '@/lib/property-history-scope';
import {
  isDeletedInspection,
  isHistoryInspection,
} from '@/lib/property-inspection-history';
import { inspectionToJobRow } from '@/lib/portfolio-case-dialog';
import type { Inspection } from '@/lib/types';

export function archivedInspectionCount(inspections: Inspection[]): number {
  return inspections.filter((row) => isHistoryInspection(row) || isDeletedInspection(row)).length;
}

export function ArchivedInspectionsSection({ inspections }: { inspections: Inspection[] }) {
  const [scope, setScope] = useState<PropertyHistoryScope>('completed');
  const { selectedJob, selectedId, openJob, closeJob } = usePortfolioCaseDialog();

  const completed = useMemo(
    () => inspections.filter(isHistoryInspection),
    [inspections],
  );
  const deleted = useMemo(() => inspections.filter(isDeletedInspection), [inspections]);
  const rows = scope === 'deleted' ? deleted : completed;

  return (
    <div className="space-y-3">
      <FilterChips
        options={[...PROPERTY_HISTORY_SCOPE_FILTERS]}
        value={scope}
        onChange={(id) => setScope(id as PropertyHistoryScope)}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={scope === 'deleted' ? 'No cancelled inspections' : 'No completed inspections'}
          description={
            scope === 'deleted'
              ? 'Cancelled inspections will appear here.'
              : 'Completed inspections will appear here once jobs are closed.'
          }
        />
      ) : (
        <InspectionsListTable
          items={rows}
          selectedId={selectedId}
          onItemClick={(item) => openJob(inspectionToJobRow(item))}
        />
      )}

      <PortfolioCaseDialogHost job={selectedJob} onClose={closeJob} onOpenJob={openJob} />
    </div>
  );
}
