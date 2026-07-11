'use client';

import type { OpenInspectionRental } from '@/constants/open-inspection-ops';
import { formatLettingRent } from '@/lib/leasing/open-inspection-display';
import { formatDate } from '@/lib/utils';

export function OpenInspectionRentalFacts({
  rental,
  title = 'Rental details',
}: {
  rental?: OpenInspectionRental | null;
  title?: string;
}) {
  if (!rental) return null;

  const facts = [
    { label: 'Rent', value: formatLettingRent(rental.rentPerWeek) },
    {
      label: 'Available from',
      value: rental.availableFrom ? formatDate(rental.availableFrom) : '—',
    },
    { label: 'Lease term', value: rental.leaseTerm?.trim() || '—' },
  ];

  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="bg-secondary/30 rounded-xl px-3 py-2.5">
            <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
              {fact.label}
            </p>
            <p className="mt-1 text-xs font-semibold leading-snug">{fact.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
