'use client';

import { MessageThreadWorkspace } from '@/components/agent/message-thread-workspace';
import { AgentShell } from '@/components/layout/agent-shell';
import { ContactDetails } from '@/components/agent/contact-details';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { ROUTES } from '@/constants/routes';
import {
  buildThreadMentionCandidates,
  extractMentions,
} from '@/lib/message-mentions';
import { useEffect, useMemo, useRef, useState } from 'react';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

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
      <MessageThreadWorkspace
        thread={thread}
        reply={reply}
        onReplyChange={setReply}
        onReplySend={handleSend}
        replyPlaceholder={
          highlightParty ? `Message ${partyLabel}…` : 'Reply via app…'
        }
      />
    </AgentShell>
  );
}
