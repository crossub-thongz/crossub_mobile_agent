'use client';

import { useMemo, useState } from 'react';
import { Building2, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { Property } from '@/lib/types';

export function RentReconciliationPropertyPickerDialog({
  open,
  onOpenChange,
  properties,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  onSelect: (propertyId: string) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (property) =>
        property.address.toLowerCase().includes(q) ||
        property.suburb.toLowerCase().includes(q) ||
        property.tenantName?.toLowerCase().includes(q) ||
        property.homeOwnerName?.toLowerCase().includes(q),
    );
  }, [properties, query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) setQuery('');
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create rent reconciliation</DialogTitle>
          <DialogDescription>
            Choose the property you are recording rent received for.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search address or tenant…"
            className="pl-9"
          />
        </div>

        <ul className="max-h-[min(50vh,360px)] space-y-2 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <li className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-sm">
              No matching properties.
            </li>
          ) : (
            filtered.map((property) => (
              <li key={property.id}>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full justify-start gap-3 px-3 py-3 text-left"
                  onClick={() => {
                    onSelect(property.id);
                    onOpenChange(false);
                    setQuery('');
                  }}
                >
                  <Building2 className="text-primary mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{property.address}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {[property.suburb, property.tenantName].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Button>
              </li>
            ))
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
