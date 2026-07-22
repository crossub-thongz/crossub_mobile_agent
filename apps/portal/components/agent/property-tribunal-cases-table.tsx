'use client';

import { TribunalListTable } from '@/components/agent/portfolio-module-tables';
import type { TribunalCase } from '@/lib/types';

export function PropertyTribunalCasesTable({
  items,
  onItemClick,
  selectedId,
}: {
  items: TribunalCase[];
  onItemClick?: (item: TribunalCase) => void;
  selectedId?: string | null;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-6 py-10 text-center">
        <p className="text-sm font-medium">No tribunal cases</p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-xs">
          NCAT / tribunal matters for this property will appear here.
        </p>
      </div>
    );
  }

  return (
    <TribunalListTable
      items={items}
      selectedId={selectedId}
      onItemClick={onItemClick}
      scope="property"
    />
  );
}
