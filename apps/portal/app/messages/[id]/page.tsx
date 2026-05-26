'use client';

import { useState } from 'react';
import { notFound, useParams } from 'next/navigation';
import { Mail, MessageSquare, Sparkles } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants/routes';
import { cn, formatDateTime } from '@/lib/utils';

export default function MessageDetailPage() {
  const params = useParams();
  const { messages } = useAgentData();
  const thread = messages.find((m) => m.id === params.id);
  const [reply, setReply] = useState('');

  if (!thread) notFound();

  const applyAiDraft = () => {
    setReply(
      `Thanks for the update. I've reviewed the quote and will respond shortly via the app.`,
    );
  };

  return (
    <AgentShell title={thread.subject} backHref={ROUTES.MESSAGES}>
      <div className="flex h-[calc(100dvh-8rem)] flex-col">
        <p className="text-muted-foreground mb-4 text-xs">{thread.propertyAddress}</p>
        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {thread.messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'max-w-[90%] rounded-xl px-3 py-2 text-sm',
                msg.from.includes('CROSSUB')
                  ? 'bg-secondary mr-auto'
                  : 'bg-primary/15 ml-auto',
              )}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                {msg.channel === 'email' ? (
                  <Mail className="size-3" />
                ) : (
                  <MessageSquare className="size-3" />
                )}
                {msg.from} · {formatDateTime(msg.at)}
              </div>
              {msg.body}
            </div>
          ))}
        </div>
        <div className="border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={applyAiDraft}
          >
            <Sparkles className="size-3.5" />
            AI draft reply
          </Button>
          <div className="flex gap-2">
            <Input
              placeholder="Reply via app…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <Button disabled={!reply.trim()}>Send</Button>
          </div>
          <p className="text-muted-foreground mt-2 text-[10px]">
            Email and app messages are kept in one thread for audit.
          </p>
        </div>
      </div>
    </AgentShell>
  );
}
