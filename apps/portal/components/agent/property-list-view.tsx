'use client';

import type { Agency, Property } from '@/lib/types';

import { PropertyListCard } from '@/components/agent/property-list-card';
import { PropertyListTable } from '@/components/agent/property-list-table';

export function PropertyListView({
  properties,
  agencies,
  variant,
  actionCountFor,
  rowHref,
  onDelete,
  canManage,
}: {
  properties: Property[];
  agencies: Agency[];
  variant: 'active' | 'archived';
  actionCountFor: (id: string) => number;
  rowHref: (property: Property) => string;
  onDelete: (property: Property) => void;
  canManage: boolean;
}) {
  const sorted = [...properties].sort((a, b) =>
    a.address.localeCompare(b.address, undefined, { sensitivity: 'base' }),
  );

  return (
    <>
      <div className="space-y-2 md:hidden">
        {sorted.map((property) => (
          <PropertyListCard
            key={property.id}
            property={property}
            actionCount={actionCountFor(property.id)}
            href={rowHref(property)}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <PropertyListTable
          properties={properties}
          agencies={agencies}
          variant={variant}
          actionCountFor={actionCountFor}
          rowHref={rowHref}
          onDelete={onDelete}
          canManage={canManage}
        />
      </div>
    </>
  );
}
