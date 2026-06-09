'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  Gavel,
  Wallet,
  Wrench,
} from 'lucide-react';

import { MaintenanceInlineActions } from '@/components/agent/maintenance-inline-actions';
import { useAgentData } from '@/components/providers/agent-data-provider';
import type { PropertyNeedAction } from '@/lib/types';
import { cn } from '@/lib/utils';

const CATEGORY_ICON: Record<PropertyNeedAction['category'], LucideIcon> = {
  Leasing: FileText,
  Maintenance: Wrench,
  Inspection: ClipboardList,
  Accounting: Wallet,
  Tribunal: Gavel,
  Others: Building2,
};

export function NeedActionTaskCard({ item }: { item: PropertyNeedAction }) {
  const { maintenanceAll } = useAgentData();
  const maintenanceId = item.id.startsWith('mnt-') ? item.id.slice(4) : null;
  const maintenance = maintenanceId
    ? maintenanceAll.find((m) => m.id === maintenanceId)
    : undefined;
  const showInline = maintenance?.requiresApproval === true;

  const Icon = CATEGORY_ICON[item.category];
  const urgent = item.priority === 'urgent' || item.priority === 'high';

  const cardClass = cn(
    'rounded-2xl border p-4 transition-all',
    urgent
      ? 'border-destructive/30 bg-destructive/5'
      : 'border-border bg-card',
  );

  const inner = (
    <>
      <div
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          urgent ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary',
        )}
      >
        {urgent ? <AlertTriangle className="size-4" /> : <Icon className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            urgent ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary',
          )}
        >
          {item.category}
        </span>
        <p className="mt-1.5 truncate text-sm font-semibold">{item.propertyAddress}</p>
        <p className="text-muted-foreground mt-0.5 text-sm leading-snug">{item.label}</p>
      </div>
      {!showInline && (
        <ChevronRight className="text-muted-foreground mt-2 size-4 shrink-0" />
      )}
    </>
  );

  if (showInline && maintenance) {
    return (
      <div className={cardClass}>
        <Link href={item.href} className="group flex items-start gap-3 active:scale-[0.99]">
          {inner}
        </Link>
        <MaintenanceInlineActions item={maintenance} />
      </div>
    );
  }

  return (
    <Link href={item.href} className={cn('group flex items-start gap-3 active:scale-[0.99]', cardClass)}>
      {inner}
    </Link>
  );
}
