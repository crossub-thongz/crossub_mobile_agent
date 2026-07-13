'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { OpenInspectionSession } from '@/constants/open-inspection-ops';
import { LEASING_UI } from '@/lib/leasing/constants';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { openViewingsApi } from '@/lib/open-viewings-api';
import { cn } from '@/lib/utils';

export function OpenLeasingGenerateReportButton({
  cycleId,
  sessionId,
  reportReady = false,
  onCycleView,
  onSessionUpdated,
  disabled,
  className,
}: {
  cycleId?: string;
  sessionId?: string;
  reportReady?: boolean;
  onCycleView?: (view: Awaited<ReturnType<typeof leasingOpsApi.get>>) => void;
  onSessionUpdated?: (session: OpenInspectionSession) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [generating, setGenerating] = useState(false);

  if (reportReady) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      if (cycleId) {
        const view = await leasingOpsApi.generateOpenReport(cycleId);
        onCycleView?.(view);
      } else if (sessionId) {
        const session = await openViewingsApi.generateReport(sessionId);
        onSessionUpdated?.(session);
      } else {
        throw new Error('Open inspection session not linked yet');
      }
      toast.success('Open report generated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate open report');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className={cn('rounded-xl border bg-card p-4', className)}>
      <p className="text-sm font-semibold">Open report</p>
      <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
        Generates automatically when the viewing window ends. You can also generate it now once
        the viewing has started.
      </p>
      <Button
        size="sm"
        className={cn('mt-3 gap-1.5', LEASING_UI.btnSecondary)}
        variant="outline"
        disabled={disabled || generating || (!cycleId && !sessionId)}
        onClick={() => void handleGenerate()}
      >
        <FileText className="size-3.5" />
        {generating ? 'Generating…' : 'Generate open report'}
      </Button>
    </div>
  );
}
