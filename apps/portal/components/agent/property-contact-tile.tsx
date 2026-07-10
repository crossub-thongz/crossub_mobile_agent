'use client';

import { Plus } from 'lucide-react';

import type { PropertyContactBlock } from '@/lib/property-registry-api';

export function ContactTile({
  title,
  name,
  email,
  phone,
  meta,
  variant = 'filled',
  updatedHint,
  onEdit,
  onAdd,
}: {
  title: string;
  name?: string;
  email?: string;
  phone?: string;
  meta?: string;
  variant?: 'filled' | 'add';
  updatedHint?: string | null;
  onEdit?: () => void;
  onAdd?: () => void;
}) {
  if (variant === 'add' && onAdd) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex min-h-[4.25rem] flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border/80 bg-muted/5 px-2 py-2 text-center"
      >
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          {title}
        </p>
        <span className="text-primary inline-flex items-center gap-0.5 text-[11px] font-medium">
          <Plus className="size-3" />
          Add
        </span>
      </button>
    );
  }

  const detail = [phone, email].filter(Boolean).join(' · ');

  return (
    <div
      className="min-h-[4.25rem] rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2"
      title={updatedHint ?? undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          {title}
        </p>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-primary shrink-0 text-[10px] font-medium"
          >
            Edit
          </button>
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-xs font-medium">{name?.trim() || '—'}</p>
      {meta ? <p className="text-muted-foreground mt-0.5 truncate text-[10px]">{meta}</p> : null}
      <p className="text-muted-foreground mt-0.5 truncate text-[10px]">{detail || (meta ? '' : '—')}</p>
    </div>
  );
}

export function hasContact(block?: PropertyContactBlock | null): boolean {
  return Boolean(block?.name?.trim() || block?.email?.trim() || block?.mobile?.trim());
}

export function formatStrataMeta(
  buildingName?: string | null,
  strataPlanNumber?: string | null,
): string {
  const parts: string[] = [];
  if (buildingName?.trim()) parts.push(buildingName.trim());
  if (strataPlanNumber?.trim()) parts.push(`SP ${strataPlanNumber.trim()}`);
  return parts.join(' · ');
}
