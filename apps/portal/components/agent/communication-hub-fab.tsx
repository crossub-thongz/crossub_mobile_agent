'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, MessageSquare, X } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail, messagesNew, ROUTES } from '@/constants/routes';
import { cn } from '@/lib/utils';

export function CommunicationHubFab({ propertyId }: { propertyId?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { messages, ensureMessageThread } = useAgentData();
  const thread = propertyId ? messages.find((m) => m.propertyId === propertyId) : null;
  const unread = thread?.unread ?? 0;

  const openPropertyChat = () => {
    if (!propertyId) return;
    const threadId = ensureMessageThread(propertyId);
    router.push(messageDetail(threadId));
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        aria-label="Communication hub"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed right-4 z-40 flex size-14 items-center justify-center rounded-full',
          'bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95',
          'bottom-[calc(5rem+env(safe-area-inset-bottom))]',
        )}
      >
        <MessageSquare className="size-6" />
        {unread > 0 && (
          <span className="bg-destructive absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Communication hub</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                <X className="text-muted-foreground size-5" />
              </button>
            </div>
            <p className="text-muted-foreground mb-3 text-xs">
              Email, app messages, and internal notes — single source of truth.
            </p>
            <div className="space-y-2">
              {propertyId && (
                <button
                  type="button"
                  onClick={openPropertyChat}
                  className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm hover:bg-secondary"
                >
                  <Building2 className="text-primary size-4" />
                  Property related
                </button>
              )}
              <Link
                href={messagesNew()}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm hover:bg-secondary"
              >
                <MessageSquare className="text-primary size-4" />
                New message (any property)
              </Link>
              <Link
                href={ROUTES.MESSAGES}
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-sm hover:bg-secondary"
              >
                <MessageSquare className="text-primary size-4" />
                All conversations
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
