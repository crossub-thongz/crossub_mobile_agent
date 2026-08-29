'use client';

import Link from 'next/link';
import { Filter, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { propertyNew } from '@/constants/routes';

function scrollToPropertyFilters() {
  document.getElementById('property-list-v2-filters')?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  });
}

export function PropertiesPageHeaderActions({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Button
        variant="outline"
        className="rounded-xl transition-colors hover:bg-muted/60"
        type="button"
        onClick={scrollToPropertyFilters}
      >
        <Filter className="size-4" />
        Filters
      </Button>
      <Button className="rounded-xl transition-opacity hover:opacity-90" asChild>
        <Link href={propertyNew()}>
          <Plus className="size-4" />
          Add property
        </Link>
      </Button>
    </div>
  );
}
