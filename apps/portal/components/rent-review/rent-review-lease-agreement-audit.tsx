import type { LeaseAgreementStep } from '@/lib/rent-review/tenant-decision-display';
import { formatDateTime } from '@/lib/utils';

export function RentReviewLeaseAgreementAudit({
  steps,
  title = 'Lease agreement audit',
}: {
  steps: LeaseAgreementStep[];
  title?: string;
}) {
  if (steps.length === 0) return null;

  const doneCount = steps.filter((step) => step.done).length;

  return (
    <section className="rounded-xl border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide">{title}</p>
        <p className="text-muted-foreground text-[10px] tabular-nums">
          {doneCount}/{steps.length}
        </p>
      </div>
      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-xs">
            <span
              className={
                step.done
                  ? 'bg-primary/15 text-primary mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold'
                  : 'bg-muted text-muted-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px]'
              }
            >
              {step.done ? '✓' : '·'}
            </span>
            <div>
              <p className={step.done ? 'font-medium' : 'text-muted-foreground'}>{step.label}</p>
              {step.at ? (
                <p className="text-muted-foreground text-[10px]">{formatDateTime(step.at)}</p>
              ) : (
                <p className="text-muted-foreground text-[10px]">Pending</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
