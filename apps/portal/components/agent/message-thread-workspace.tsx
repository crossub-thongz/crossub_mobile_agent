'use client';

import { useMemo } from 'react';

import { GiiAssistant } from '@/components/agent/gii-assistant';
import { MessageThreadBubble } from '@/components/agent/message-thread-bubble';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { buildGiiMessageContext } from '@/lib/gii-message-context';
import type { MessageThread } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

/** Message thread page — scrollable history with a sticky Gii + reply dock. */
export function MessageThreadWorkspace({
  thread,
  reply,
  onReplyChange,
  onReplySend,
  replyPlaceholder,
  dockFixed = true,
  dockLayout,
  replyEnabled = true,
  children,
}: {
  thread: MessageThread;
  reply: string;
  onReplyChange: (value: string) => void;
  onReplySend: () => void;
  replyPlaceholder?: string;
  /** @deprecated Prefer `dockLayout`. */
  dockFixed?: boolean;
  dockLayout?: 'viewport' | 'panel';
  replyEnabled?: boolean;
  children?: React.ReactNode;
}) {
  const { properties, archivedProperties } = useAgentData();

  const property = useMemo(() => {
    if (!thread.propertyId) return null;
    return (
      properties.find((p) => p.id === thread.propertyId) ??
      archivedProperties.find((p) => p.id === thread.propertyId) ??
      null
    );
  }, [archivedProperties, properties, thread.propertyId]);

  const scope = useMemo(() => {
    const messageContext = buildGiiMessageContext({ thread, property });
    return {
      propertyId: thread.propertyId,
      propertyAddress: property
        ? formatPropertyFullAddress(property)
        : thread.propertyAddress,
      messageContext,
    };
  }, [property, thread]);

  return (
    <GiiAssistant
      open
      variant="message-dock"
      scope={scope}
      dockLayout={dockLayout ?? (dockFixed ? 'viewport' : 'panel')}
      replyEnabled={replyEnabled}
      messageReply={{
        value: reply,
        onChange: onReplyChange,
        onSend: onReplySend,
        homeOwnerName: thread.homeOwnerName,
        tenantName: thread.tenantName,
        placeholder: replyPlaceholder,
      }}
    >
      {children ?? (
        <div className="space-y-3">
          {thread.messages.map((msg) => (
            <MessageThreadBubble key={msg.id} msg={msg} maxWidth="max-w-[90%]" />
          ))}
        </div>
      )}
    </GiiAssistant>
  );
}
