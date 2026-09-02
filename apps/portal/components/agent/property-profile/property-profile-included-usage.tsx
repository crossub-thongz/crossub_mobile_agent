import { includedAllowanceRemainingLabel } from '@/lib/crossub-api/agent-billing-client';
import type { AgentBillingIncludedUsageRow } from '@/lib/crossub-api/agent-billing-client';
import { cn } from '@/lib/utils';

const SLOTS = [
  { key: 'routine', label: 'Routine' },
  { key: 'ingoing', label: 'Ingoing' },
  { key: 'outgoing', label: 'Outgoing' },
] as const;

export function PropertyProfileIncludedUsage({
  usage,
  className,
}: {
  usage: AgentBillingIncludedUsageRow;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'property-profile-v2__metric rounded-xl border bg-background/40 px-3 py-2.5',
        className,
      )}
    >
      <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        Included usage
        <span className="font-normal"> · {usage.calendarYear}</span>
      </p>
      <ul className="mt-1 space-y-0.5">
        {SLOTS.map((slot) => {
          const slotUsage = usage[slot.key];
          const remaining = slotUsage.remaining;
          return (
            <li
              key={slot.key}
              className="flex items-baseline justify-between gap-2 text-sm leading-snug"
              title={includedAllowanceRemainingLabel(slotUsage)}
            >
              <span className="text-muted-foreground text-xs font-medium">{slot.label}</span>
              <span
                className={cn(
                  'tabular-nums font-semibold',
                  remaining <= 0 && 'text-amber-700 dark:text-amber-300',
                )}
              >
                {remaining}/{slotUsage.included}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
