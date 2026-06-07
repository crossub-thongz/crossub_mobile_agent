import { cn } from '@/lib/utils';

export function FormStep({
  step,
  title,
  description,
  children,
  active,
}: {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <section
      className={cn(
        'rounded-2xl border bg-card transition-colors',
        active ? 'border-primary/40 shadow-sm shadow-primary/5' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3 border-b border-border/80 px-4 py-3">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
          )}
        >
          {step}
        </span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && (
            <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
          )}
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function SelectChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-secondary/40 text-muted-foreground hover:border-primary/30 hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
