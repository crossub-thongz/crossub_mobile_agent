'use client';

import { toast } from 'sonner';

import { WEB_PUSH_COPY, WEB_PUSH_STATUS } from '@/constants/web-push';
import { useWebPush } from '@/hooks/use-web-push';
import { cn } from '@/lib/utils';

/** Settings row: push alerts on this phone (Jarvis 2.2), with why they cannot be turned on when so. */
export function PushAlertsSetting() {
  const { status, busy, turnOn, turnOff } = useWebPush();
  const on = status === WEB_PUSH_STATUS.ON;
  const canToggle = on || status === WEB_PUSH_STATUS.OFF;
  const note = WEB_PUSH_COPY.STATUS[status];

  const toggle = () => {
    const change = on ? turnOff() : turnOn();
    change
      .then((done) => {
        if (done === false) return;
        toast.success(on ? WEB_PUSH_COPY.TURNED_OFF : WEB_PUSH_COPY.TURNED_ON);
      })
      .catch((err: unknown) => toast.error(err instanceof Error ? err.message : String(err)));
  };

  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{WEB_PUSH_COPY.LABEL}</p>
          <p className="text-muted-foreground text-xs">{WEB_PUSH_COPY.DESCRIPTION}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={WEB_PUSH_COPY.LABEL}
          disabled={!canToggle || busy}
          onClick={toggle}
          className={cn(
            'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
            on ? 'bg-primary' : 'bg-secondary',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform',
              on ? 'left-[22px]' : 'left-0.5',
            )}
          />
        </button>
      </div>
      {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
    </div>
  );
}
