'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { messageDetail, needActionsForProperty, propertyDetail } from '@/constants/routes';

const actionButtonClass =
  'rounded-xl border v2-frosted-surface px-3 py-2 text-sm font-semibold';
const moreButtonClass = 'text-muted-foreground v2-frosted-surface rounded-xl border p-2';
const itemClass =
  'hover:bg-muted/60 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors';

export function TaskPageActions({
  propertyId,
  reference,
}: {
  propertyId?: string | null;
  reference?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { ensureMessageThread } = useAgentData();
  const hasProperty = Boolean(propertyId);

  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="flex items-center gap-2">
        <PopoverTrigger asChild>
          <button type="button" className={actionButtonClass}>
            Actions
          </button>
        </PopoverTrigger>
        <button
          type="button"
          className={moreButtonClass}
          aria-label="More options"
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
      <PopoverContent align="end" className="w-52 p-1">
        {hasProperty ? (
          <>
            <Link href={propertyDetail(propertyId!)} className={itemClass} onClick={close}>
              View property
            </Link>
            <Link href={needActionsForProperty(propertyId!)} className={itemClass} onClick={close}>
              View all tasks
            </Link>
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                const threadId = ensureMessageThread(propertyId!);
                close();
                router.push(messageDetail(threadId));
              }}
            >
              Message owner & tenant
            </button>
          </>
        ) : null}
        {reference ? (
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              void navigator.clipboard.writeText(reference);
              toast.success('Reference copied');
              close();
            }}
          >
            Copy reference
          </button>
        ) : null}
        {!hasProperty && !reference ? (
          <p className="text-muted-foreground px-3 py-2 text-sm">No actions available</p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
