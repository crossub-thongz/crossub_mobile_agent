'use client';

import { useMemo } from 'react';

import { GiiAssistant } from '@/components/agent/gii-assistant';
import { MessageThreadBubble } from '@/components/agent/message-thread-bubble';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { buildGiiMessageContext } from '@/lib/gii-message-context';
import type { MessageThread } from '@/lib/types';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

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
  const isV2 = useIsAgentUiV2();
  const { properties, archivedProperties } = useAgentData();

  const resolvedDockLayout =
    dockLayout ?? (isV2 ? 'panel' : dockFixed ? 'viewport' : 'panel');
  const usePanelDock = resolvedDockLayout === 'panel';

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
    <div
      className={cn(
        usePanelDock && 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        isV2 && usePanelDock && '-mx-4 max-lg:-mt-4 lg:mx-0',
      )}
    >
      <GiiAssistant
        open
        variant="message-dock"
        scope={scope}
        dockLayout={resolvedDockLayout}
        replyEnabled={replyEnabled}
        messageReply={{
          value: reply,
          onChange: onReplyChange,
          onSend: onReplySend,
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
    </div>
  );
}
