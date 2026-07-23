'use client';

import { useState } from 'react';
import { Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { startAgentOpenInspectionNow } from '@/lib/crossub-api/agent-workflow-client';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { registerOpenInspectionFromCycle } from '@/lib/open-inspection-resolve';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { cn } from '@/lib/utils';

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

      const view = await leasingOpsApi.get(cycleId);
      applyCycleView(propertyId, view);

      await registerOpenInspectionFromCycle(
        {
          propertyId,
          cycleId,
          inspectionId:
            result.openInspectionId ?? view.openInspection.inspectionId ?? inspectionId,
          viewingSessionId: view.viewingSessionId,
        },
        registerInspection,
      );
      await refresh({ force: true });
      onStarted?.(
        result.openInspectionId ?? view.openInspection.inspectionId ?? inspectionId ?? undefined,
      );
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
