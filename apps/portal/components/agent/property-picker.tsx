'use client';

import { useRouter } from 'next/navigation';
import { Building2, ChevronRight } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail } from '@/constants/routes';
import { cn } from '@/lib/utils';

export function PropertyPicker({
  onSelect,
  selectedId,
  className,
}: {
  onSelect?: (propertyId: string) => void;
  selectedId?: string;
  className?: string;
}) {
  const router = useRouter();
  const { properties, ensureMessageThread } = useAgentData();

  if (properties.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
        No properties in your portfolio yet.
      </p>
    );
  }

  const openProperty = (propertyId: string) => {
    if (onSelect) {
      onSelect(propertyId);
      return;
    }
    const threadId = ensureMessageThread(propertyId);
    router.push(messageDetail(threadId));
  };

  return (
    <div className={cn('space-y-2', className)}>
      {properties.map((property) => {
        const selected = selectedId === property.id;
        return (
          <button
            key={property.id}
            type="button"
            className="block w-full text-left"
            onClick={() => openProperty(property.id)}
          >
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl border bg-card p-3 active:bg-secondary/50',
                selected && 'border-primary ring-1 ring-primary/30',
              )}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <Building2 className="text-muted-foreground size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{property.address}</p>
                <p className="text-muted-foreground truncate text-xs">{property.suburb}</p>
                {property.tenantName.toLowerCase() !== 'vacant' ? (
                  <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                    {property.tenantName}
                  </p>
                ) : null}
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
