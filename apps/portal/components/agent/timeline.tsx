import type { TimelineEntry } from '@/lib/types';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<TimelineEntry['actorRole'], string> = {
  agent: 'Agent',
  crossub: 'CROSSUB',
  tenant: 'Tenant',
  contractor: 'Contractor',
  system: 'System',
};

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <ol className="space-y-0">
      {entries.map((entry, i) => (
        <li key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
          {i < entries.length - 1 && (
            <span
              className="bg-border absolute top-3 left-[7px] h-[calc(100%-4px)] w-px"
              aria-hidden
            />
          )}
          <span
            className={cn(
              'relative z-10 mt-1.5 size-[15px] shrink-0 rounded-full border-2',
              entry.actorRole === 'agent'
                ? 'border-primary bg-primary/20'
                : 'border-muted-foreground/40 bg-card',
            )}
          />
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="text-sm font-medium">{entry.title}</p>
            {entry.detail && (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {entry.detail}
              </p>
            )}
            <p className="text-muted-foreground text-[11px]">
              {formatDateTime(entry.at)} · {ROLE_LABEL[entry.actorRole]} ·{' '}
              {entry.actor}
              {entry.source !== 'system' && ` · via ${entry.source}`}
              {entry.staffAssisted && (
                <span className="text-primary ml-1">· Staff assisted</span>
              )}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
