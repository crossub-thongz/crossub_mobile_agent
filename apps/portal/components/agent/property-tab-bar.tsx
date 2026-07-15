'use client';

import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  Building2,
  ClipboardList,
  FileText,
  Gavel,
  RefreshCw,
  Wallet,
  Wrench,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const TAB_ICONS: Record<string, LucideIcon> = {
  Overview: Building2,
  Documents: FileText,
  'Rent Review': RefreshCw,
  Leasing: FileText,
  Maintenance: Wrench,
  Inspection: ClipboardList,
  Accounting: Wallet,
  Tribunal: Gavel,
  Archive: Archive,
};

export function PropertyTabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly T[];
  active: T;
  onChange: (tab: T) => void;
}) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map((t) => {
        const Icon = TAB_ICONS[t] ?? Building2;
        const isActive = active === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition-colors',
              isActive
                ? 'border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
            )}
          >
            <Icon className="size-3.5" />
            {t}
          </button>
        );
      })}
    </div>
  );
}
