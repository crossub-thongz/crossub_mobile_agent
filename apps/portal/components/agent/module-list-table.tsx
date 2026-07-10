'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function ModuleListTable({
  minWidth = 720,
  children,
}: {
  minWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-sm"
          style={{ minWidth }}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function ModuleTableHead({ columns }: { columns: string[] }) {
  return (
    <thead>
      <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
        {columns.map((col) => (
          <th
            key={col}
            className={cn(
              'px-3 py-3 font-semibold',
              col === '' && 'w-10 text-right',
            )}
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function ModuleTableLinkCell({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn('px-3 py-3', className)}>
      <Link href={href} className="font-medium leading-snug text-foreground hover:text-primary">
        {children}
      </Link>
    </td>
  );
}

export function ModuleTableChevronCell({ href }: { href: string }) {
  return (
    <td className="px-3 py-3 text-right">
      <Link href={href} className="text-muted-foreground inline-flex hover:text-primary">
        <ChevronRight className="size-4" />
      </Link>
    </td>
  );
}
