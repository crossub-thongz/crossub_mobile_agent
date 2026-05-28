'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail } from '@/constants/routes';
import { cn } from '@/lib/utils';

export function PropertyChatFab({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const { messages, ensureMessageThread } = useAgentData();
  const thread = messages.find((m) => m.propertyId === propertyId);
  const unread = thread?.unread ?? 0;

  return (
    <button
      type="button"
      aria-label="Open property messages"
      onClick={() => {
        const threadId = ensureMessageThread(propertyId);
        router.push(messageDetail(threadId));
      }}
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
  );
}
