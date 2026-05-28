import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed px-4 py-8 text-center">
      {Icon && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-secondary">
          <Icon className="text-muted-foreground size-5" />
        </div>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
