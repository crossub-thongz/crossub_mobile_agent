'use client';

import Link from 'next/link';

import { jobCaseFocusHref, type JobCaseFocusCharge } from '@/lib/billing/job-case-focus';
import { cn } from '@/lib/utils';

export function JobCaseReferenceLink({
  charge,
  className,
  prefix = 'Job case ',
  onNavigate,
}: {
  charge: JobCaseFocusCharge;
  className?: string;
  prefix?: string;
  onNavigate?: () => void;
}) {
  const name = charge.jobCaseName?.trim();
  if (!name) return null;

  const href = jobCaseFocusHref(charge);
  const label = `${prefix}${name}`;

  if (!href) {
    return <span className={cn('font-medium tabular-nums', className)}>{label}</span>;
  }

  return (
    <Link
      href={href}
      className={cn(
        'text-primary font-medium tabular-nums hover:underline',
        className,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onNavigate?.();
      }}
    >
      {label}
    </Link>
  );
}
