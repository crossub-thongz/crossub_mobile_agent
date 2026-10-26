'use client';

import { ChevronRight } from 'lucide-react';

import { GII_RECORD_LINK_ICON, GII_RECORD_LINK_LABEL } from '@/constants/gii-record-links';
import type { GiiJobCaseLink } from '@/lib/crossub-api/gii-client';
import { cn } from '@/lib/utils';

/**
 * Open buttons under a CROS reply for every record the tools returned on that turn: jobs,
 * reviews, inspections, leasing, End Leasing and arrears open the case dialog; conversations,
 * notifications and properties open their own screen. The caller decides where each goes.
 */
export function GiiJobCaseButtons({
  cases,
  onOpen,
}: {
  cases: GiiJobCaseLink[];
  onOpen: (link: GiiJobCaseLink) => void | Promise<void>;
}) {
  if (cases.length === 0) return null;

  return (
    <div className="mr-auto flex w-[92%] flex-col gap-1.5">
      {cases.map((link) => {
        const Icon = GII_RECORD_LINK_ICON[link.kind];
        return (
          <button
            key={`${link.kind}:${link.id}`}
            type="button"
            onClick={() => void onOpen(link)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left transition',
              'hover:bg-muted/40',
            )}
          >
            <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-muted-foreground block text-[11px] font-semibold uppercase tracking-wide">
                {GII_RECORD_LINK_LABEL[link.kind]}
              </span>
              <span className="block truncate text-xs font-medium">{link.label}</span>
            </span>
            <span className="text-primary flex shrink-0 items-center gap-0.5 text-[12px] font-semibold">
              Open
              <ChevronRight className="size-3.5" />
            </span>
          </button>
        );
      })}
    </div>
  );
}
