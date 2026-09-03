'use client';

import { Plus } from 'lucide-react';

import type { PropertyContactBlock } from '@/lib/property-registry-api';

export function ContactTile({
  title,
  name,
  email,
  phone,
  meta,
  metaOnClick,
  variant = 'filled',
  layout = 'stack',
  updatedHint,
  onEdit,
  onAdd,
}: {
  title: string;
  name?: string;
  email?: string;
  phone?: string;
  meta?: string;
  metaOnClick?: () => void;
  variant?: 'filled' | 'add';
  /** `row` shows name, email, and phone on one line with larger type. */
  layout?: 'stack' | 'row';
  updatedHint?: string | null;
  onEdit?: () => void;
  onAdd?: () => void;
}) {
  if (variant === 'add' && onAdd) {
    return (
      <button
        type="button"
        onClick={onAdd}
        className="flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-border/80 bg-muted/5 px-3 py-2.5 text-center"
      >
        <p className="text-muted-foreground text-xs font-semibold">
          {title}
        </p>
        <span className="text-primary inline-flex items-center gap-0.5 text-sm font-medium">
          <Plus className="size-3.5" />
          Add
        </span>
      </button>
    );
  }

  if (layout === 'row') {
    return (
      <div
        className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5"
        title={updatedHint ?? undefined}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs font-semibold">
            {title}
          </p>
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="text-primary shrink-0 text-xs font-medium"
            >
              Edit
            </button>
          ) : null}
        </div>
        {meta ? (
          metaOnClick ? (
            <button
              type="button"
              onClick={metaOnClick}
              className="text-primary mb-1.5 truncate text-left text-xs font-medium hover:underline"
            >
              {meta}
            </button>
          ) : (
            <p className="text-muted-foreground mb-1.5 truncate text-xs">{meta}</p>
          )
        ) : null}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px] font-medium">
              Name
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold">{name?.trim() || '—'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px] font-medium">
              Email
            </p>
            <p className="mt-0.5 truncate text-sm">{email?.trim() || '—'}</p>
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px] font-medium">
              Number
            </p>
            <p className="mt-0.5 truncate text-sm tabular-nums">{phone?.trim() || '—'}</p>
          </div>
        </div>
      </div>
    );
  }

  const detail = [phone, email].filter(Boolean).join(' · ');

  return (
    <div
      className="min-h-[4.25rem] rounded-lg border border-border/60 bg-muted/10 px-2.5 py-2"
      title={updatedHint ?? undefined}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-muted-foreground text-[10px] font-semibold">
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
      {meta ? (
        metaOnClick ? (
          <button
            type="button"
            onClick={metaOnClick}
            className="text-primary mt-0.5 truncate text-left text-[10px] font-medium hover:underline"
          >
            {meta}
          </button>
        ) : (
          <p className="text-muted-foreground mt-0.5 truncate text-[10px]">{meta}</p>
        )
      ) : null}
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
