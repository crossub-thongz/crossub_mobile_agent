'use client';

import { useMemo } from 'react';

import type { Agency, Property } from '@/lib/types';

import { PropertyListCard } from '@/components/agent/property-list-card';
import { PropertyListTable } from '@/components/agent/property-list-table';

export function PropertyListView({
  properties,
  agencies,
  variant,
  messageUnreadFor,
  needActionCountFor,
  rowHref,
  onDelete,
  canManage,
}: {
  properties: Property[];
  agencies: Agency[];
  variant: 'active' | 'archived';
  messageUnreadFor?: (property: Property) => number;
  needActionCountFor?: (property: Property) => number;
  rowHref: (property: Property) => string;
  onDelete: (property: Property) => void;
  canManage: boolean;
}) {
  const mobileSorted = useMemo(() => {
    const rows = [...properties];
    rows.sort((a, b) => {
      const needA = needActionCountFor?.(a) ?? 0;
      const needB = needActionCountFor?.(b) ?? 0;
      if (needB !== needA) return needB - needA;
      const unreadA = messageUnreadFor?.(a) ?? 0;
      const unreadB = messageUnreadFor?.(b) ?? 0;
      if (unreadB !== unreadA) return unreadB - unreadA;
      return a.address.localeCompare(b.address, undefined, { sensitivity: 'base' });
    });
    return rows;
  }, [messageUnreadFor, needActionCountFor, properties]);

  const desktopSorted = useMemo(
    () =>
      [...properties].sort((a, b) =>
        a.address.localeCompare(b.address, undefined, { sensitivity: 'base' }),
      ),
    [properties],
  );

  return (
    <>
      <div className="space-y-2 md:hidden">
        {mobileSorted.map((property) => (
          <PropertyListCard
            key={property.id}
            property={property}
            messageUnread={messageUnreadFor?.(property) ?? 0}
            needActionCount={needActionCountFor?.(property) ?? 0}
            href={rowHref(property)}
          />
        ))}
      </div>

      <div className="hidden md:block">
        <PropertyListTable
          properties={desktopSorted}
          agencies={agencies}
          variant={variant}
          messageUnreadFor={
            messageUnreadFor
              ? (propertyId) => {
                  const property = properties.find((item) => item.id === propertyId);
                  return property ? messageUnreadFor(property) : 0;
                }
              : undefined
          }
          needActionCountFor={
            needActionCountFor
              ? (propertyId) => {
                  const property = properties.find((item) => item.id === propertyId);
                  return property ? needActionCountFor(property) : 0;
                }
              : undefined
          }
          rowHref={rowHref}
          onDelete={onDelete}
          canManage={canManage}
        />
      </div>
    </>
  );
}
