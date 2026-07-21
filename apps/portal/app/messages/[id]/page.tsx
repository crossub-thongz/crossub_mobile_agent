'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { ChevronDown, Mail, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';

import { ContactDetails } from '@/components/agent/contact-details';
import { MessageBody } from '@/components/agent/message-body';
import { MessageCompose } from '@/components/agent/message-compose';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
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
  const { messages, sendMessage, markThreadRead } = useAgentData();
  const thread = messages.find((m) => m.id === threadId);
  const [reply, setReply] = useState('');
  const [contactsOpen, setContactsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCount = thread?.messages.length ?? 0;
  const markedReadRef = useRef<string | null>(null);

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
    if (!thread || markedReadRef.current === thread.id) return;
    if (thread.unread > 0) {
      markedReadRef.current = thread.id;
      markThreadRead(thread.id);
    }
  }, [thread, markThreadRead]);

  if (!thread) notFound();

  const partyLabel =
    highlightParty === 'tenant'
      ? thread.tenantName.replace(/\s*\([^)]*\)\s*$/, '').trim()
      : highlightParty === 'owner'
        ? thread.homeOwnerName
        : null;

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
    <AgentShell title={thread.subject} backHref={ROUTES.MESSAGES} hideGlobalFabs>
      <div className="flex min-h-[calc(100dvh-var(--shell-header-offset)-4rem-env(safe-area-inset-bottom))] flex-col lg:min-h-0">
        {highlightParty && partyLabel && (
          <div className="mb-4 shrink-0 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
            Messaging <span className="font-semibold">{partyLabel}</span>
            {highlightParty === 'tenant' ? ' (tenant)' : ' (landlord)'}
          </div>
        )}

        <div className="mb-4 shrink-0 overflow-hidden rounded-xl border bg-card">
          <button
            type="button"
            onClick={() => setContactsOpen((value) => !value)}
            aria-expanded={contactsOpen}
            className="hover:bg-secondary/30 flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-xs transition md:pointer-events-none md:cursor-default md:hover:bg-transparent"
          >
            <div className="min-w-0">
              <p className="font-medium">{thread.propertyAddress}</p>
              <p className="text-muted-foreground mt-0.5 line-clamp-1 md:hidden">
                {contactsOpen
                  ? 'Landlord & tenant contacts'
                  : `${thread.homeOwnerName} · ${thread.tenantName}`}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'text-muted-foreground size-4 shrink-0 transition-transform md:hidden',
                contactsOpen && 'rotate-180',
              )}
              aria-hidden
            />
          </button>
          <div className={cn('border-t px-3 pt-3 pb-3', !contactsOpen && 'hidden md:block')}>
            <ContactDetails
              homeOwnerName={thread.homeOwnerName}
              homeOwnerContact={thread.homeOwnerContact}
              tenantName={thread.tenantName}
              tenantContact={thread.tenantContact}
              highlightParty={highlightParty}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pb-4">
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

        <div className="border-border bg-background shrink-0 space-y-2 border-t pt-3">
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
