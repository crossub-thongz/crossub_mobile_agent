'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';

export function KpiTile({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: string | number;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-lg border bg-card p-3 active:bg-secondary/50',
        highlight && 'border-primary/40 bg-primary/5',
      )}
    >
      <p className="text-muted-foreground text-[10px] leading-tight">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </Link>
  );
}

export function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
    </section>
  );
}
