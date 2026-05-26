import Link from 'next/link';
import {
  ClipboardCheck,
  DollarSign,
  DoorOpen,
  MessageSquare,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { SectionStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  maintenance: Wrench,
  inspections: ClipboardCheck,
  rent_review: DollarSign,
  vacating: DoorOpen,
  messages: MessageSquare,
};

const TONE_DOT: Record<SectionStatus['tone'], string> = {
  ok: 'bg-primary',
  neutral: 'bg-muted-foreground',
  warning: 'bg-amber-400',
  urgent: 'bg-destructive',
};

export function SectionStatusGrid({ sections }: { sections: SectionStatus[] }) {
  return (
    <div className="space-y-2">
      {sections.map((s) => {
        const Icon = ICONS[s.id] ?? Wrench;
        return (
          <Link
            key={s.id}
            href={s.href}
            className="flex items-center gap-3 rounded-xl border bg-card p-4 active:bg-secondary/50"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <Icon className="text-muted-foreground size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{s.label}</p>
              <p className="text-muted-foreground text-xs">{s.statusLabel}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {s.count != null && s.count > 0 && (
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[11px] font-bold text-white',
                    TONE_DOT[s.tone],
                  )}
                >
                  {s.count}
                </span>
              )}
              <span
                className={cn('size-2 rounded-full', TONE_DOT[s.tone])}
                aria-hidden
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
