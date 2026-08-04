'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronRight, Mail, MessageSquare, Plus } from 'lucide-react';

import { NeedActionTaskCard } from '@/components/agent/need-action-task-card';
import { PortfolioCaseDialogHost } from '@/components/agent/portfolio-case-dialog-host';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { messageDetail, messagesNew } from '@/constants/routes';
import { usePortfolioCaseDialog } from '@/hooks/use-portfolio-case-dialog';
import { unreadMessagesForProperty } from '@/lib/communications-log';
import { needActionToJobRow } from '@/lib/portfolio-case-dialog';
import type { PropertyNeedAction } from '@/lib/types';
import { cn, formatRelative } from '@/lib/utils';

export function PropertyMessageTab({
  propertyId,
  propertyAddress,
  needActions,
}: {
  propertyId: string;
  propertyAddress: string;
  needActions: PropertyNeedAction[];
}) {
  const router = useRouter();
  const { messages } = useAgentData();
  const { selectedJob, openJob, closeJob, portfolioData } = usePortfolioCaseDialog();

  const propertyThreads = messages
    .filter((thread) => {
      if (thread.propertyId === propertyId) return true;
      const normalized = propertyAddress.trim().toLowerCase();
      return (
        !thread.propertyId &&
        normalized.length > 0 &&
        thread.propertyAddress.trim().toLowerCase() === normalized
      );
    })
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  const unreadTotal = unreadMessagesForProperty(propertyId, messages, propertyAddress);

  const openNeedAction = (item: PropertyNeedAction) => {
    const job = needActionToJobRow(item, portfolioData);
    if (job) {
      openJob(job);
      return;
    }
    router.push(item.href);
  };

  return (
    <div className="space-y-5 lg:hidden">
      {needActions.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-destructive size-4 shrink-0" aria-hidden />
            <h2 className="text-sm font-semibold">
              Need action ({needActions.length})
            </h2>
          </div>
          <div className="space-y-2">
            {needActions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openNeedAction(item)}
                className="block w-full text-left"
              >
                <NeedActionTaskCard item={item} hidePropertyAddress />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-primary size-4 shrink-0" aria-hidden />
            <h2 className="text-sm font-semibold">
              Messages
              {unreadTotal > 0 ? (
                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                  ({unreadTotal} unread)
                </span>
              ) : null}
            </h2>
          </div>
          <Button size="sm" variant="outline" className="h-8 rounded-lg" asChild>
            <Link href={messagesNew({ property: propertyId })}>
              <Plus className="size-3.5" />
              New
            </Link>
          </Button>
        </div>

        {propertyThreads.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
            No message threads for this property yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            {propertyThreads.map((thread) => (
              <Link
                key={thread.id}
                href={messageDetail(thread.id)}
                className={cn(
                  'hover:bg-secondary/40 flex items-center gap-3 border-b px-3 py-3 transition last:border-0',
                  thread.unread > 0 && 'bg-primary/[0.03]',
                )}
              >
                <div className="text-muted-foreground shrink-0">
                  {thread.channel === 'email' ? (
                    <Mail className="size-4" />
                  ) : (
                    <MessageSquare className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm',
                      thread.unread > 0 ? 'font-semibold' : 'font-medium',
                    )}
                  >
                    {thread.subject}
                  </p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {thread.lastMessage || 'Open thread'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="text-muted-foreground text-[11px] tabular-nums">
                    {formatRelative(thread.lastAt)}
                  </span>
                  {thread.unread > 0 ? (
                    <span className="bg-primary flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground">
                      {thread.unread > 99 ? '99+' : thread.unread}
                    </span>
                  ) : null}
                  <ChevronRight className="text-muted-foreground size-4" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <PortfolioCaseDialogHost job={selectedJob} onClose={closeJob} onOpenJob={openJob} />
    </div>
  );
}
