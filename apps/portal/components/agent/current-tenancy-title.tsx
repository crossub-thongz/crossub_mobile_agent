'use client';

import { HoverInfoList } from '@/components/agent/hover-info-list';
import type { OtherTenancyReference } from '@/lib/tenancy-references';

export function CurrentTenancyTitle({
  vacant,
  primaryRef,
  others,
}: {
  vacant: boolean;
  primaryRef: string;
  others: OtherTenancyReference[];
}) {
  if (vacant) return <>Current Tenancy</>;

  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="min-w-0">Current Tenancy ({primaryRef})</span>
      <HoverInfoList
        ariaLabel="Other tenancy IDs"
        heading="Other tenancies"
        items={others.map((item) => ({ title: item.label, detail: item.name }))}
      />
    </span>
  );
}
