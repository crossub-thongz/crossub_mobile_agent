'use client';

import { useState } from 'react';

import { PropertyTribunalCasesTable } from '@/components/agent/property-tribunal-cases-table';
import { TribunalCaseDetailDialog } from '@/components/agent/tribunal-case-detail-dialog';
import type { TribunalCase } from '@/lib/types';

export function PropertyTribunalTab({
  tribunalCases,
  onRefresh,
}: {
  tribunalCases: TribunalCase[];
  onRefresh?: () => void;
}) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const selectedCase =
    tribunalCases.find((row) => row.id === selectedCaseId) ?? null;

  return (
    <div className="space-y-4">
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
