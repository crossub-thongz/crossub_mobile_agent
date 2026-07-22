'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Headphones, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail, messagesForProperty } from '@/constants/routes';
import type { StaffCaseContext } from '@/lib/staff-support-thread';
import { cn } from '@/lib/utils';

export function TalkToStaffSupportButton({
  propertyId,
  caseContext,
  variant = 'card',
  className,
  onOpened,
}: {
  propertyId: string;
  caseContext?: StaffCaseContext;
  variant?: 'card' | 'button' | 'compact';
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
      toast.error(err instanceof Error ? err.message : 'Could not open support thread');
    } finally {
      setLoading(false);
    }
  };

  if (variant === 'button') {
    return (
      <Button
        type="button"
        className={cn('rounded-xl', className)}
        disabled={loading}
        onClick={() => void handleOpen()}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <Headphones className="size-4" />}
        Talk to CROSSUB team
      </Button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleOpen()}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-3 text-left text-sm transition hover:bg-primary/10',
          className,
        )}
      >
        {loading ? (
          <Loader2 className="text-primary size-4 shrink-0 animate-spin" />
        ) : (
          <Headphones className="text-primary size-4 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">Talk to CROSSUB team</p>
          <p className="text-muted-foreground text-xs">
            Sends this property{caseContext ? ' and case' : ''} to the admin portal
          </p>
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-4',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="bg-primary/15 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Headphones className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Talk to CROSSUB team</p>
          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            Message operations with this property profile attached so staff can open it in the
            admin portal.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-lg"
              disabled={loading}
              onClick={() => void handleOpen()}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Start support chat
            </Button>
            <Button size="sm" variant="outline" className="rounded-lg" asChild>
              <Link href={messagesForProperty(propertyId)}>
                <MessageSquare className="size-3.5" />
                All property messages
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
