'use client';

import { PropertyListPreviewPanel } from '@/components/agent/properties/property-list-preview-panel';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useShellAsideStore } from '@/lib/shell-aside-store';

export function PropertyListShellPreview({ propertyId }: { propertyId: string }) {
  const { properties, archivedProperties } = useAgentData();
  const setPropertyPreviewId = useShellAsideStore((s) => s.setPropertyPreviewId);
  const property =
    properties.find((row) => row.id === propertyId) ??
    archivedProperties.find((row) => row.id === propertyId);

  if (!property) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
        Property not found.
      </div>
    );
  }

  return (
    <PropertyListPreviewPanel
      property={property}
      variant="shell"
      onClose={() => setPropertyPreviewId(null)}
    />
  );
}
