'use client';

import { DashboardPropertiesMap } from '@/components/agent/dashboard-properties-map';
import type { Property } from '@/lib/types';
import { cn } from '@/lib/utils';

export function PropertyListV2Map({
  properties,
  selectedId,
  onSelect,
}: {
  properties: Property[];
  selectedId: string | null;
  onSelect: (propertyId: string) => void;
}) {
  return (
    <div className="w-full shrink-0 lg:max-w-5xl lg:w-[76%]">
      <DashboardPropertiesMap
        properties={properties}
        embedded
        showStats
        selectedPropertyId={selectedId}
        onPropertySelect={onSelect}
        gestureHandling="greedy"
        frameClassName={cn(
          'w-full shrink-0',
          'h-[min(calc(100dvh-21rem),52vh)] min-h-[220px]',
          'lg:h-[min(calc(100dvh-20rem),580px)]',
        )}
      />
    </div>
  );
}
