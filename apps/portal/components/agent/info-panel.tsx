import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function InfoPanel({
  title,
  icon: Icon,
  children,
  className,
  tone = 'default',
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'warning' | 'success';
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border bg-card',
        tone === 'warning' && 'border-amber-500/25',
        tone === 'success' && 'border-primary/25',
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/80 px-4 py-3">
        {Icon && (
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" />
          </div>
        )}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
      <dt className="text-muted-foreground text-[11px] font-medium uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm">{children ?? value ?? '—'}</dd>
    </div>
  );
}
