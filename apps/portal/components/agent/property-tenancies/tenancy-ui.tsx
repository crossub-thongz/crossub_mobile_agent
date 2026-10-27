'use client';

import { useState, type ReactNode } from 'react';
import { ChevronRight, MoreHorizontal, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  OVERVIEW_DUE_DATE_TONE,
  TENANCY_ATTENTION_TEXT_TONE,
  TENANCY_ROW_STATUS_TONE,
  TENANCY_SECTION_COPY,
  type TenancyRowStatus,
} from '@/constants/property-tenancies';
import { cn } from '@/lib/utils';
import { personInitials } from '@/utils/portal-party';

/** Building blocks shared by the Self-Manage Overview cards and the Tenancies section. */

export function TenancyStatusBadge({
  status,
  label,
  onClick,
}: {
  status: TenancyRowStatus;
  label: string;
  onClick?: () => void;
}) {
  const className = cn(
    'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
    TENANCY_ROW_STATUS_TONE[status],
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(className, 'hover:opacity-80')}>
        {label}
      </button>
    );
  }
  return <span className={className}>{label}</span>;
}

export function PersonAvatar({
  name,
  tone,
  small,
}: {
  name: string;
  tone: string;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        small ? 'size-7' : 'size-9',
        tone,
      )}
    >
      {personInitials(name)}
    </span>
  );
}

export function PrimaryTag({ label }: { label: string }) {
  return (
    <span className="border-border bg-muted text-muted-foreground ml-1.5 rounded border px-1.5 py-0.5 text-[10px] font-medium">
      {label}
    </span>
  );
}

export function CardLink({
  label,
  onClick,
  disabled,
  className,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn('text-primary shrink-0 text-xs font-semibold hover:underline disabled:opacity-60', className)}
    >
      {label}
    </button>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-xs">{children}</p>;
}

export function MicroHeading({ children }: { children: ReactNode }) {
  return (
    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">{children}</p>
  );
}

/** A folded block, closed by default (`<details>`). */
export function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-border border-t pt-3">
      <summary className="text-muted-foreground flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
        {title}
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

export function DateFact({
  label,
  value,
  hint,
  flag,
  quiet,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  flag?: string;
  quiet?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <p
        className={cn(
          'mt-1 text-sm',
          quiet ? 'text-muted-foreground font-normal' : 'text-foreground font-semibold',
          emphasis && OVERVIEW_DUE_DATE_TONE,
        )}
      >
        {value}
        {hint ? <span className="text-muted-foreground font-normal"> · {hint}</span> : null}
        {flag ? (
          <span className="ml-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
            {flag}
          </span>
        ) : null}
      </p>
    </div>
  );
}

/** One figure in a financial summary grid; clickable when it leads somewhere. */
export function Metric({
  label,
  value,
  suffix,
  hint,
  muted,
  attention,
  onClick,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
  muted?: boolean;
  attention?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <span className="text-muted-foreground block truncate text-[10px] font-medium uppercase tracking-wider">
        {label}
      </span>
      <span
        className={cn(
          'mt-1 block text-lg font-semibold tabular-nums tracking-tight',
          muted && 'text-muted-foreground',
          attention && TENANCY_ATTENTION_TEXT_TONE,
        )}
      >
        {value}
        {suffix ? <span className="text-muted-foreground ml-1 text-xs font-normal">{suffix}</span> : null}
      </span>
      {hint ? <span className="text-muted-foreground mt-0.5 block text-[10px] leading-snug">{hint}</span> : null}
    </>
  );
  const className = 'border-border/60 px-3 py-2.5 text-left [&:nth-child(odd)]:border-r';
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button type="button" onClick={onClick} className={cn(className, 'hover:bg-background/70')}>
      {body}
    </button>
  );
}

export type TenancyMenuItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
};

/** The ⋯ menu on a household card: the rare tenancy actions. */
export function TenancyActionsMenu({ items }: { items: TenancyMenuItem[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          aria-label={TENANCY_SECTION_COPY.MORE}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 p-1">
        <ul>
          {items.map(({ key, label, icon: Icon, onSelect, disabled }) => (
            <li key={key}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  onSelect();
                }}
                className="hover:bg-muted flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm disabled:opacity-50"
              >
                <Icon className="size-3.5 shrink-0" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
