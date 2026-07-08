import { Check, type LucideIcon } from 'lucide-react';

import { LEASING_PILL_TEXT, LEASING_UI, type LeasingItemStatus } from '@/lib/leasing/constants';
import { cn } from '@/lib/utils';

import { LeasingStatusBadge } from './leasing-status-badge';

export function StepCard({
  icon: Icon,
  title,
  description,
  status,
  children,
  footer,
  accent = LEASING_UI.stepAccent,
  id,
  highlighted = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  status?: LeasingItemStatus;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  accent?: string;
  id?: string;
  highlighted?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-xl border bg-card transition-shadow',
        highlighted && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', accent)}>
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-semibold">{title}</h3>
            {description ? (
              <p className="text-muted-foreground mt-0.5 text-[11.5px]">{description}</p>
            ) : null}
          </div>
        </div>
        {status ? <LeasingStatusBadge status={status} size="xs" /> : null}
      </div>
      {children ? <div className="space-y-3 px-4 py-3.5">{children}</div> : null}
      {footer ? (
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">{footer}</div>
      ) : null}
    </section>
  );
}

export function StepFact({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-muted-foreground text-[10px] uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 truncate text-[12.5px] font-medium tabular-nums">{value}</p>
    </div>
  );
}

export function BoolStatus({
  done,
  doneLabel,
  pendingLabel,
}: {
  done: boolean;
  doneLabel: string;
  pendingLabel: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[12px] font-medium',
        done ? LEASING_PILL_TEXT.emerald : 'text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'flex size-4 items-center justify-center rounded-full border',
          done
            ? `border-emerald-400/60 bg-emerald-500/20 ${LEASING_PILL_TEXT.emerald}`
            : 'border-border bg-secondary',
        )}
      >
        {done ? (
          <Check className="size-2.5" />
        ) : (
          <span className="bg-muted-foreground/60 size-1 rounded-full" />
        )}
      </span>
      {done ? doneLabel : pendingLabel}
    </span>
  );
}
