'use client';

import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { startAgentOpenInspectionNow } from '@/lib/crossub-api/agent-workflow-client';
import { finalizeAgentOpenInspectionSchedule } from '@/lib/open-inspection/finalize-agent-open-schedule';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { cn } from '@/lib/utils';

/**
 * Begin a CROSSUB open inspection immediately.
 *
 * **Not rendered for agents (CRS-0068).** Starting an open "now" is choosing its time by
 * the most direct route there is, and the server treats it that way: `startNow` skips the
 * weekly batch and the Saturday validation entirely. Leaving it on an agent screen would
 * have left the one door open that every other part of this change closes — and it is the
 * worst of them, because it produces a live viewing window with no inspector assigned.
 *
 * The component stays because the endpoint stays: it is the testing and genuine-urgency
 * path, and a CROSSUB officer sitting with an agent on the phone is the right caller. The
 * mount points are gated on {@link canStartOpenInspectionNow} rather than deleted, so
 * re-enabling it for staff is a prop and not a rebuild.
 */
export function StartCrossubOpenNowButton({
  propertyId,
  cycleId,
  inspectionId,
  className,
  size = 'sm',
  onStarted,
}: {
  propertyId: string;
  cycleId: string;
  inspectionId?: string | null;
  className?: string;
  size?: 'sm' | 'default';
  onStarted?: (inspectionId?: string) => void;
}) {
  const { apiConnected, refresh, registerInspection } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const [submitting, setSubmitting] = useState(false);

  const handleStart = async () => {
    if (!apiConnected) {
      toast.error('Connect to the API to start the open inspection');
      return;
    }

    setSubmitting(true);
    try {
      const result = await startAgentOpenInspectionNow(propertyId, cycleId);
      toast.success('Open inspection started — viewing window is live now');

      const resolvedId = await finalizeAgentOpenInspectionSchedule({
        propertyId,
        cycleId,
        result,
        registerInspection,
        applyCycleView,
        refresh,
      });
      onStarted?.(resolvedId ?? inspectionId ?? undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start open inspection now');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      className={cn('h-8 gap-1.5 text-xs', className)}
      disabled={submitting}
      onClick={() => void handleStart()}
    >
      {submitting ? (
        <>
          <Loader2 className="size-3.5 animate-spin" />
          Starting…
        </>
      ) : (
        <>
          <Play className="size-3.5" />
          Start open inspection now
        </>
      )}
    </Button>
  );
}
