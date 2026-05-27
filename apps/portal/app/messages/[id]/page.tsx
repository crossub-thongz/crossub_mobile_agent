'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { Mail, MessageSquare, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { ContactDetails } from '@/components/agent/contact-details';
import { MessageBody } from '@/components/agent/message-body';
import { MessageCompose } from '@/components/agent/message-compose';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { buildAiDraftReply } from '@/lib/message-ai-draft';
import {
  buildThreadMentionCandidates,
  extractMentions,
} from '@/lib/message-mentions';
import { cn, formatDateTime } from '@/lib/utils';

export default function MessageDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const threadId = params.id as string;
  const partyParam = searchParams.get('party');
  const highlightParty =
    partyParam === 'tenant' || partyParam === 'owner' ? partyParam : undefined;
  const { messages, sendMessage } = useAgentData();
  const thread = messages.find((m) => m.id === threadId);
  const [reply, setReply] = useState('');
  const [drafting, setDrafting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCount = thread?.messages.length ?? 0;

  const mentionCandidates = useMemo(
    () =>
      thread
        ? buildThreadMentionCandidates({
            homeOwnerName: thread.homeOwnerName,
            tenantName: thread.tenantName,
          })
        : [],
    [thread],
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageCount]);

  useEffect(() => {
    const current = messages.find((m) => m.id === threadId);
    if (!current || !highlightParty) return;
    const draft = buildAiDraftReply(current, highlightParty);
    setReply(draft);
  }, [messages, threadId, highlightParty]);

  if (!thread) notFound();

  const partyLabel =
    highlightParty === 'tenant'
      ? thread.tenantName.replace(/\s*\([^)]*\)\s*$/, '').trim()
      : highlightParty === 'owner'
        ? thread.homeOwnerName
        : null;

  const applyAiDraft = () => {
    setDrafting(true);
    const draft = buildAiDraftReply(thread, highlightParty);
    setReply(draft);
    setDrafting(false);
    toast.success(
      highlightParty
        ? `Draft for ${partyLabel} inserted — edit before sending`
        : 'AI draft inserted — edit before sending',
    );
  };

  const handleSend = () => {
    const text = reply.trim();
    if (!text) return;
    const mentions = extractMentions(text, mentionCandidates);
    sendMessage(thread.id, text, mentions);
    setReply('');
    const tagged = mentions.map((m) => `@${m.name}`).join(', ');
    toast.success(
      mentions.length > 0
        ? `Sent · tagged ${tagged}`
        : highlightParty
          ? `Message sent to ${partyLabel}`
          : 'Message sent',
    );
  };

  return (
    <AgentShell title={thread.subject} backHref={ROUTES.MESSAGES}>
      <div className="flex min-h-0 flex-col gap-4 pb-4">
        {highlightParty && partyLabel && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            Messaging <span className="font-semibold">{partyLabel}</span>
            {highlightParty === 'tenant' ? ' (tenant)' : ' (landlord)'}
          </div>
        )}

        <div className="rounded-xl border bg-card p-3 text-xs">
          <p className="mb-2 font-medium">{thread.propertyAddress}</p>
          <ContactDetails
            homeOwnerName={thread.homeOwnerName}
            homeOwnerContact={thread.homeOwnerContact}
            tenantName={thread.tenantName}
            tenantContact={thread.tenantContact}
            highlightParty={highlightParty}
          />
        </div>

        <div className="min-h-[200px] flex-1 space-y-3">
          {thread.messages.map((msg) => {
            const isAgent = msg.sentByAgent || !msg.from.includes('CROSSUB');
            return (
              <div
                key={msg.id}
                className={cn(
                  'max-w-[90%] rounded-xl px-3 py-2 text-sm',
                  isAgent ? 'bg-primary/15 ml-auto' : 'bg-secondary mr-auto',
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
                <MessageBody body={msg.body} />
                {msg.mentions && msg.mentions.length > 0 && (
                  <p className="text-muted-foreground mt-1.5 text-[10px]">
                    Tagged: {msg.mentions.map((m) => `@${m.name}`).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="sticky bottom-20 z-30 space-y-2 rounded-xl border border-border bg-background p-3 shadow-lg">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={drafting}
            onClick={applyAiDraft}
          >
            <Sparkles className="size-3.5" />
            {drafting
              ? 'Drafting…'
              : highlightParty
                ? `AI draft for ${partyLabel}`
                : 'AI draft reply'}
          </Button>
          <MessageCompose
            value={reply}
            onChange={setReply}
            onSubmit={handleSend}
            placeholder={
              highlightParty ? `Message ${partyLabel}…` : 'Reply via app…'
            }
            homeOwnerName={thread.homeOwnerName}
            tenantName={thread.tenantName}
          />
          <Button
            type="button"
            className="w-full"
            disabled={!reply.trim()}
            onClick={handleSend}
          >
            <Send className="size-4" />
            Send
          </Button>
          <p className="text-muted-foreground text-center text-[10px]">
            Messages are saved in this thread on this device until connected to
            crossub_web.
          </p>
        </div>
      </div>
    </AgentShell>
  );
}
