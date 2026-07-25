'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { Send } from 'lucide-react';
import { toast } from 'sonner';

import { ContactDetails } from '@/components/agent/contact-details';
import { MessageCompose } from '@/components/agent/message-compose';
import { MessageThreadBubble } from '@/components/agent/message-thread-bubble';
import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import {
  buildThreadMentionCandidates,
  extractMentions,
} from '@/lib/message-mentions';

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
    if (messageCount === 0) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    <AgentShell
      title={thread.subject}
      backHref={ROUTES.MESSAGES}
      hideGlobalFabs
      headerMeta={{
        label: thread.propertyAddress,
        open: contactsOpen,
        onToggle: () => setContactsOpen((value) => !value),
        panel: (
          <ContactDetails
            homeOwnerName={thread.homeOwnerName}
            homeOwnerContact={thread.homeOwnerContact}
            tenantName={thread.tenantName}
            tenantContact={thread.tenantContact}
            highlightParty={highlightParty}
          />
        ),
      }}
    >
      <div className="flex flex-col">
        <div className="space-y-3">
          {thread.messages.map((msg) => (
            <MessageThreadBubble key={msg.id} msg={msg} maxWidth="max-w-[90%]" />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-border mt-4 space-y-2 border-t pt-3">
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
