'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import type { PropertyDetailTab } from '@/lib/portal-service-level';
import { needActionsForTab } from '@/lib/need-action-tabs';
import { needActionToJobRow } from '@/lib/portfolio-case-dialog';
import type { PropertyNeedAction } from '@/lib/types';
import { cn } from '@/lib/utils';

export function PropertyTabNeedActionsBanner({
  tab,
  needActions,
  className,
}: {
  tab: PropertyDetailTab;
  needActions: PropertyNeedAction[];
  className?: string;
}) {
  const router = useRouter();
  const { selectedJob, openJob, closeJob, portfolioData } = usePortfolioCaseDialog();
  const items = needActionsForTab(needActions, tab);

  const openAction = (item: PropertyNeedAction) => {
    const job = needActionToJobRow(item, portfolioData);
    if (job) {
      openJob(job);
      return;
    }
    router.push(item.href);
  };

  if (items.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          'rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-3 text-sm',
          className,
        )}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle className="text-destructive mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">
              {items.length} need action{items.length === 1 ? '' : 's'} on this tab
            </p>
            <ul className="mt-2 space-y-1.5">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openAction(item)}
                    className="text-destructive hover:text-destructive/80 text-left text-xs font-medium underline underline-offset-2"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <PortfolioCaseDialogHost job={selectedJob} onClose={closeJob} onOpenJob={openJob} />
    </>
  );
}
