'use client';

import Link from 'next/link';
import { ChevronRight, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export function TaskBreadcrumb({
  href,
  label,
  segments,
}: {
  href: string;
  label: string;
  segments: string[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
      <Link href={href} className="hover:text-foreground transition-colors">
        {label}
      </Link>
      {segments.map((segment) => (
        <span key={segment} className="contents">
          <ChevronRight className="size-3.5" />
          <span className="text-foreground font-medium">{segment}</span>
        </span>
      ))}
    </nav>
  );
}

export function TaskMetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="bg-secondary text-foreground rounded px-1.5 py-0.5 text-[13px] font-medium tabular-nums">
      {children}
    </span>
  );
}

const STATUS_TONE = {
  active: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
  attention: 'bg-amber-500/15 text-amber-900 dark:text-amber-100',
  done: 'bg-muted text-muted-foreground',
  danger: 'bg-rose-500/15 text-rose-800 dark:text-rose-200',
} as const;

const STATUS_DOT = {
  active: 'bg-emerald-600',
  attention: 'bg-amber-500',
  done: 'bg-muted-foreground',
  danger: 'bg-rose-600',
} as const;

export function TaskStatusPill({
  label,
  tone,
}: {
  label: string;
  tone: keyof typeof STATUS_TONE;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium', STATUS_TONE[tone])}>
      <span className={cn('size-2 rounded-full', STATUS_DOT[tone])} />
      {label}
    </span>
  );
}

export function TaskLocality({ locality }: { locality: string }) {
  if (!locality) return null;
  return (
    <div className="text-muted-foreground mt-1.5 flex min-w-0 items-center gap-1.5 text-sm">
      <MapPin className="size-4 shrink-0" />
      <span className="truncate">{locality}</span>
    </div>
  );
}

export function AdminTabStrip<Tab extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: Tab; label: string }[];
  active: Tab;
  onChange: (tab: Tab) => void;
}) {
  return (
    <div className="bg-background/95 sticky top-0 z-10 mt-4 border-b px-6 backdrop-blur lg:px-8">
      <div role="tablist" className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => onChange(tab.id)}
              className={cn(
                '-mb-px shrink-0 border-b-2 px-0.5 py-3 text-[15px] font-medium transition-colors',
                selected
                  ? 'border-emerald-600 text-foreground dark:border-emerald-400'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AdminSideCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-card rounded-xl border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function localityLine(parts: Array<string | null | undefined>): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(', ');
}
