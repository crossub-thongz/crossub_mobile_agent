import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';

import type { NeedActionGroup } from '@/lib/types';

export function NeedActionAlertCard({ group }: { group: NeedActionGroup }) {
  return (
    <Link
      href={group.href}
      className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3.5 transition hover:border-destructive/60 active:scale-[0.99]"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
        <AlertTriangle className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-destructive">
          {group.label} ({group.count})
        </p>
      </div>
      <ChevronRight className="text-destructive size-4 shrink-0" />
    </Link>
  );
}
