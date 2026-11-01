'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { useAgentInbox } from '@/components/providers/agent-inbox-provider';
import { GII_HANDOFF_COPY } from '@/constants/gii-handoff';
import { messageDetail } from '@/constants/routes';
import type { StaffCaseContext } from '@/lib/staff-support-thread';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

/**
 * Opens the property-scoped account manager thread (admin Communication Hub). An agent whose one
 * inbox is Conversations has no Account Manager thread: the CROSSUB team is reached in Cros, so
 * the button asks Cros to hand the chat to them.
 */
export function TalkToStaffSupportButton({
  propertyId,
  caseContext,
  className,
  onOpened,
}: {
  propertyId: string;
  caseContext?: StaffCaseContext;
  className?: string;
  onOpened?: () => void;
}) {
  const router = useRouter();
  const { openStaffSupportThread, properties } = useAgentData();
  const inbox = useAgentInbox();
  const openGii = useShellDockStore((s) => s.openGii);
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (inbox.conversationsOnly) {
      const property = properties.find((p) => p.id === propertyId);
      openGii({
        propertyId,
        propertyAddress: property ? formatPropertyFullAddress(property) : undefined,
        initialPrompt: GII_HANDOFF_COPY.ASK_FOR_TEAM,
      });
      onOpened?.();
      return;
    }
    setLoading(true);
    try {
      const threadId = await openStaffSupportThread(propertyId, caseContext);
      router.push(messageDetail(threadId));
      onOpened?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open message thread');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void handleOpen()}
      className={cn(
        'flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-70',
        className,
      )}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      ) : (
        <Headphones className="size-4 shrink-0" />
      )}
      {inbox.conversationsOnly ? GII_HANDOFF_COPY.TALK_TO_TEAM : 'Communicate with Account Manager'}
    </button>
  );
}
