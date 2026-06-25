'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

import type { NeedActionGroup } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ExpandableNeedActionCard({
  group,
  items,
}: {
  group: NeedActionGroup;
  items: { id: string; label: string; href: string; propertyAddress: string }[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-destructive/40 bg-destructive/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-destructive/15"
        aria-expanded={open}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
          <AlertTriangle className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-destructive">
            {group.label} ({group.count})
          </p>
        </div>
        <ChevronDown
          className={cn(
            'text-destructive size-4 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <ul className="border-t border-destructive/20 bg-card/50">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-center gap-2 border-b border-border/50 px-4 py-3 text-sm last:border-b-0 hover:bg-secondary/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.label}</p>
                  <p className="text-muted-foreground truncate text-xs">{item.propertyAddress}</p>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </Link>
            </li>
          ))}
          <li>
            <Link
              href={group.href}
              className="text-primary block px-4 py-2.5 text-center text-xs font-medium hover:bg-secondary/50"
            >
              View all in {group.category} →
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
