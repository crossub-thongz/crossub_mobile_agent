'use client';

import type { ReactNode } from 'react';

import { CASE_ASSIGNED_TO_LABEL, resolveCaseAssignedToFromProperty } from '@/lib/case-assigned-to';
import { cn } from '@/lib/utils';

/** Property address with assigned account manager — standard case detail top row. */
export function CaseAddressAssignedBar({
  address,
  assignedToName,
  titleClassName,
  subtitle,
}: {
  address: string;
  assignedToName?: string | null;
  titleClassName?: string;
  subtitle?: ReactNode;
}) {
  const assignedTo = resolveCaseAssignedToFromProperty(assignedToName);

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'font-semibold tracking-tight text-foreground',
            titleClassName ?? 'text-base',
          )}
        >
          {address}
        </p>
        {subtitle ? <div className="mt-1">{subtitle}</div> : null}
      </div>
      <div className="shrink-0 sm:min-w-[120px] sm:text-right">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          {CASE_ASSIGNED_TO_LABEL}
        </p>
        <p
          className={cn(
            'mt-0.5 text-sm font-semibold text-foreground',
            assignedTo === '—' && 'font-normal text-muted-foreground',
          )}
        >
          {assignedTo}
        </p>
      </div>
    </div>
  );
}
