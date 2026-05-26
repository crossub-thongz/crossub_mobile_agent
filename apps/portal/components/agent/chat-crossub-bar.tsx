import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

import { messageDetail, ROUTES } from '@/constants/routes';

export function ChatCrossubBar({
  taskLabel,
  threadId,
}: {
  taskLabel?: string;
  threadId?: string;
}) {
  const href = threadId ? messageDetail(threadId) : ROUTES.MESSAGES;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 active:bg-primary/10"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
        <MessageSquare className="text-primary size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Chat with CROSSUB</p>
        <p className="text-muted-foreground text-xs">
          {taskLabel ? `${taskLabel} · ` : ''}Reply online — no email needed
        </p>
      </div>
      <span className="text-primary text-xs font-medium">Open</span>
    </Link>
  );
}
