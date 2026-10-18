'use client';

import { FastForward } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  SELF_MANAGED_LEASING_COPY as LETTING_COPY,
  SELF_MANAGED_SCREENING_COPY as COPY,
} from '@/constants/self-managed-leasing';
import { useSelfManagedLettingAction } from '@/hooks/use-self-managed-letting';
import { skipSelfManagedApplicationScreening } from '@/lib/crossub-api/agent-workflow-client';
import { LEASING_UI } from '@/lib/leasing/constants';
import { cn } from '@/lib/utils';

const SKIP_ACTION = 'skip-screening';

/**
 * Self-Manage: the agent already has a tenant, so skip applicant screening and move the letting
 * to onboarding. The server refuses once an applicant has been approved.
 */
export function LeasingSelfManagedSkipScreening({
  propertyId,
  cycleId,
}: {
  propertyId: string;
  cycleId?: string;
}) {
  const { pending, run } = useSelfManagedLettingAction(propertyId, cycleId);

  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium">{COPY.skipTitle}</p>
        <p className="text-muted-foreground text-[12px]">{COPY.skipHint}</p>
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn('gap-1.5', LEASING_UI.btnSecondary)}
        disabled={pending !== null}
        onClick={() =>
          void run(
            SKIP_ACTION,
            (id) => skipSelfManagedApplicationScreening(propertyId, id),
            COPY.skipped,
          )
        }
      >
        <FastForward className="size-3.5" />
        {pending === SKIP_ACTION ? LETTING_COPY.saving : COPY.skip}
      </Button>
    </div>
  );
}
