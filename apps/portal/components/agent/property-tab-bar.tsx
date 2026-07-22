'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Building2,
  ClipboardList,
  FileText,
  Gavel,
  KeyRound,
  Percent,
  RefreshCw,
  Sparkles,
  Wallet,
  Wrench,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const TAB_ICONS: Record<string, LucideIcon> = {
  Gii: Sparkles,
  Documents: FileText,
  Fees: Percent,
  'Rent Review': RefreshCw,
  Leasing: KeyRound,
  Maintenance: Wrench,
  Inspection: ClipboardList,
  Accounting: Wallet,
  Tribunal: Gavel,
  Archive: Archive,
  Overview: Building2,
};

/** User-facing labels (internal tab ids stay stable for routing). */
const TAB_DISPLAY_LABELS: Record<string, string> = {
  Gii: 'Gii',
  Documents: 'Documents',
  Fees: 'Fees',
  'Rent Review': 'Rent Review',
  Leasing: 'Leasing',
  Maintenance: 'Repair',
  Inspection: 'Inspection',
  Accounting: 'Accounting',
  Tribunal: 'Tribunal',
  Archive: 'Archive',
};

/** Compact labels for narrow mobile columns. */
const TAB_SHORT_LABELS: Record<string, string> = {
  Gii: 'Gii',
  Documents: 'Docs',
  Fees: 'Fees',
  'Rent Review': 'Rent Review',
  Leasing: 'Leasing',
  Maintenance: 'Repair',
  Inspection: 'Inspect',
  Accounting: 'Accounting',
  Tribunal: 'Tribunal',
  Archive: 'Archive',
};

const TAB_GROUP_ORDER = [
  ['Gii'],
  ['Documents', 'Fees'],
  ['Rent Review', 'Leasing', 'Maintenance', 'Inspection'],
  ['Accounting', 'Tribunal', 'Archive'],
] as const;

function groupedTabs<T extends string>(tabs: readonly T[]): T[][] {
  const tabSet = new Set(tabs);
  const groups = TAB_GROUP_ORDER.map((group) =>
    group.filter((tab): tab is T => tabSet.has(tab as T)),
  ).filter((group) => group.length > 0);

  const grouped = new Set(groups.flat());
  const remainder = tabs.filter((tab) => !grouped.has(tab));
  if (remainder.length > 0) groups.push([...remainder]);
  return groups;
}

function PropertyTabButton<T extends string>({
  tab,
  active,
  onChange,
  variant,
  buttonRef,
}: {
  tab: T;
  active: T;
  onChange: (tab: T) => void;
  variant: 'mobile' | 'desktop';
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  const Icon = TAB_ICONS[tab] ?? Building2;
  const isActive = active === tab;
  const label =
    variant === 'mobile'
      ? (TAB_SHORT_LABELS[tab] ?? TAB_DISPLAY_LABELS[tab] ?? tab)
      : (TAB_DISPLAY_LABELS[tab] ?? tab);

  if (variant === 'mobile') {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onChange(tab)}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex min-w-[4.75rem] shrink-0 snap-center flex-col items-center gap-1 px-2 py-2.5 transition-colors',
          isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground',
        )}
      >
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-xl transition-colors',
            isActive ? 'bg-primary/12 text-primary' : 'bg-muted/40',
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span
          className={cn(
            'max-w-[4.75rem] truncate text-[10px] leading-tight font-medium',
            isActive && 'font-semibold',
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'h-0.5 w-5 rounded-full transition-all',
            isActive ? 'bg-primary scale-100 opacity-100' : 'scale-75 opacity-0',
          )}
          aria-hidden
        />
      </button>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onChange(tab)}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
        isActive
          ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

export function PropertyTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const groups = useMemo(() => groupedTabs(tabs), [tabs]);

  useEffect(() => {
    const el = tabRefs.current.get(active);
    if (!el || !scrollRef.current) return;
    el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [active]);

  return (
    <div
      className={cn(
        'z-30 -mx-4 lg:mx-0',
        'sticky top-[var(--shell-header-height,3.5rem)] lg:static',
        'border-border/60 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/85',
        'border-b lg:border-0 lg:bg-transparent lg:backdrop-blur-none',
      )}
    >
      <div className="relative lg:hidden">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent"
          aria-hidden
        />

        <div
          ref={scrollRef}
          className="scrollbar-none flex snap-x snap-mandatory items-center gap-0 overflow-x-auto px-4 py-1"
        >
          {groups.map((group, groupIndex) => (
            <div key={group.join('-')} className="flex shrink-0 items-center">
              {groupIndex > 0 ? (
                <div className="bg-border/70 mx-1 h-8 w-px shrink-0" aria-hidden />
              ) : null}
              {group.map((tab) => (
                <PropertyTabButton
                  key={tab}
                  tab={tab}
                  active={active}
                  onChange={onChange}
                  variant="mobile"
                  buttonRef={(el) => {
                    if (el) tabRefs.current.set(tab, el);
                    else tabRefs.current.delete(tab);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="scrollbar-none hidden flex-wrap gap-2 lg:flex">
        {tabs
          .filter((tab) => tab !== 'Gii')
          .map((tab) => (
          <PropertyTabButton
            key={tab}
            tab={tab}
            active={active}
            onChange={onChange}
            variant="desktop"
          />
        ))}
      </div>
    </div>
  );
}
