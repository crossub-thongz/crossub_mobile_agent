'use client';

import type { InheritedLeaseTerms } from '@/lib/types';
import { INHERITED_LEASE_TERM_FIELDS } from '@/lib/leasing-workflows/constants';

function formatValue(key: string, terms: InheritedLeaseTerms): string {
  const value = terms[key as keyof InheritedLeaseTerms];
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value == null || value === '') return '—';
  return String(value);
}

/** Terms inherited from the original lease — renewal must not re-enter manually (LEASE RENEWAL.pdf). */
export function InheritedLeaseTermsPanel({ terms }: { terms: InheritedLeaseTerms }) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <p className="text-sm font-semibold">Inherited lease terms</p>
      <p className="text-muted-foreground text-xs">
        Pulled from the original agreement. Only rent, dates, and term length change on renewal.
        Tenant App and crossub_web staff leasing use the same record.
      </p>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        {INHERITED_LEASE_TERM_FIELDS.map((field) => (
          <div key={field.key}>
            <dt className="text-muted-foreground">{field.label}</dt>
            <dd className="font-medium">{formatValue(field.key, terms)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
