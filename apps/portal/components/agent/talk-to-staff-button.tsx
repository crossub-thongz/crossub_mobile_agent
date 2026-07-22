'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail } from '@/constants/routes';
import type { StaffCaseContext } from '@/lib/staff-support-thread';
import { cn } from '@/lib/utils';

/** Opens the property-scoped account manager thread (admin Communication Hub). */
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
  const { openStaffSupportThread } = useAgentData();
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
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
      Communicate with Account Manager
    </button>
  );
}
