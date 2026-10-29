'use client';

import Link from 'next/link';

import { Label } from '@/components/ui/label';
import { ROUTES } from '@/constants/routes';
import {
  SELF_MANAGED_CONDUCTOR,
  SELF_MANAGED_CONDUCTOR_COPY as COPY,
  type SelfManagedConductor,
} from '@/constants/self-managed-inspections';
import { cn } from '@/lib/utils';

const CONDUCTORS: readonly SelfManagedConductor[] = [
  SELF_MANAGED_CONDUCTOR.AGENCY,
  SELF_MANAGED_CONDUCTOR.CROSSUB,
];

/**
 * Self-Manage: the agent picks who conducts this one job. Their own inspector is free; a CROSSUB
 * inspector turns the form into a CROSSUB order, paid by card before the job starts.
 */
export function SelfManagedConductorChoice({
  value,
  onChange,
  disabled = false,
}: {
  value: SelfManagedConductor;
  onChange: (value: SelfManagedConductor) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{COPY.heading}</Label>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={COPY.heading}>
        {CONDUCTORS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value === id}
            disabled={disabled}
            onClick={() => onChange(id)}
            className={cn(
              'rounded-xl border p-3 text-left text-xs',
              value === id ? 'border-primary bg-primary/5' : 'hover:bg-secondary/40',
            )}
          >
            <p className="text-sm font-semibold">{COPY.options[id].label}</p>
            <p className="text-muted-foreground mt-0.5">{COPY.options[id].hint}</p>
          </button>
        ))}
      </div>
      {value === SELF_MANAGED_CONDUCTOR.CROSSUB ? (
        <p className="text-muted-foreground text-[12px]">
          {COPY.crossubPayment}{' '}
          <Link href={ROUTES.PRICING} className="text-primary font-medium underline-offset-2 hover:underline">
            {COPY.pricingLink}
          </Link>
        </p>
      ) : null}
    </div>
  );
}
