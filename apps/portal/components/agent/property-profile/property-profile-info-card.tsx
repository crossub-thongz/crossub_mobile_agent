import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function PropertyProfileInfoCard({
  title,
  subtitle,
  icon: Icon,
  onEdit,
  children,
  footer,
  className,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  onEdit?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'property-profile-v2__card v2-dashboard__card flex min-h-0 flex-col overflow-hidden rounded-2xl border',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          <span className="bg-primary/10 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">{title}</h3>
            {subtitle ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-primary shrink-0 text-xs font-semibold"
          >
            Edit
          </button>
        ) : null}
      </header>
      <div className="flex-1 p-4">{children}</div>
      {footer ? <footer className="border-t px-4 py-3">{footer}</footer> : null}
    </section>
  );
}
