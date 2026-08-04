'use client';

import { CASE_ASSIGNED_TO_LABEL, resolveCaseAssignedToFromProperty } from '@/lib/case-assigned-to';
import { cn } from '@/lib/utils';

export function CaseAssignedToField({
  assignedToName,
  className,
  valueClassName,
}: {
  assignedToName?: string | null;
  className?: string;
  valueClassName?: string;
}) {
  const label = resolveCaseAssignedToFromProperty(assignedToName);

  return (
    <div className={cn('space-y-0.5', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {CASE_ASSIGNED_TO_LABEL}
      </p>
      <p
        className={cn(
          'text-sm break-words font-semibold text-foreground',
          label === '—' && 'font-normal text-muted-foreground',
          valueClassName,
        )}
      >
        {label}
      </p>
    </div>
  );
}

/** Compact row for case header cards. */
export function CaseAssignedToRow({
  assignedToName,
}: {
  assignedToName?: string | null;
}) {
  const label = resolveCaseAssignedToFromProperty(assignedToName);
  if (label === '—') return null;

  return (
    <div>
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
        {CASE_ASSIGNED_TO_LABEL}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-foreground">{label}</p>
    </div>
  );
}
