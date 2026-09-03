'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { useAgentData } from '@/components/providers/agent-data-provider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { messageDetail, propertyDetail, ROUTES } from '@/constants/routes';
import { usePortalBackNavigation } from '@/hooks/use-portal-back-navigation';

const backButtonClass =
  'inline-flex items-center gap-1 rounded-xl border v2-frosted-surface px-3 py-2 text-sm font-semibold';
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
  const { ensureMessageThread, properties } = useAgentData();
  const back = usePortalBackNavigation(ROUTES.TASKS, 'Tasks');
  const backHref = back?.href ?? ROUTES.TASKS;
  const hasProperty = Boolean(propertyId);
  const property = propertyId ? properties.find((row) => row.id === propertyId) : undefined;
  const tenantName = property?.tenantName.replace(/\s*\([^)]*\)\s*$/, '').trim() ?? '';
  const canMessageTenant = Boolean(property) && tenantName.toLowerCase() !== 'vacant';

  const close = () => setOpen(false);

  return (
    <div className="flex items-center gap-2">
      <Link href={backHref} className={backButtonClass}>
        <ChevronLeft className="size-4" />
        Back
      </Link>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className={moreButtonClass} aria-label="More options">
            <MoreHorizontal className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-1">
          {hasProperty ? (
            <>
              <Link href={propertyDetail(propertyId!)} className={itemClass} onClick={close}>
                View property
              </Link>
              {canMessageTenant ? (
                <button
                  type="button"
                  className={itemClass}
                  onClick={() => {
                    const threadId = ensureMessageThread(propertyId!);
                    close();
                    router.push(messageDetail(threadId));
                  }}
                >
                  Message tenant
                </button>
              ) : null}
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
    </div>
  );
}
