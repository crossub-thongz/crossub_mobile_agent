import { cn } from '@/lib/utils';

type Tone = 'default' | 'action' | 'urgent' | 'ok';

const TONE: Record<Tone, string> = {
  default: 'border-border bg-card',
  action: 'border-primary/40 bg-primary/10',
  urgent: 'border-destructive/40 bg-destructive/10',
  ok: 'border-primary/20 bg-primary/5',
};

const LABEL: Record<Tone, string> = {
  default: 'text-foreground',
  action: 'text-primary',
  urgent: 'text-destructive',
  ok: 'text-primary',
};

export function StatusBanner({
  status,
  subtitle,
  tone = 'default',
}: {
  status: string;
  subtitle?: string;
  tone?: Tone;
}) {
  return (
    <div className={cn('rounded-xl border px-4 py-3', TONE[tone])}>
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        Current status
      </p>
      <p className={cn('mt-0.5 text-lg font-semibold leading-tight', LABEL[tone])}>
        {status}
      </p>
      {subtitle && (
        <p className="text-muted-foreground mt-1 truncate text-xs">{subtitle}</p>
      )}
    </div>
  );
}
