'use client';

import { useState } from 'react';
import { FileText, Globe, MessageSquare, Send, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingViewerInvitePanel } from '@/components/leasing-workflow/leasing-viewer-invite-panel';
import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  LEASING_APPLY_PATH,
  LEASING_APPLY_PATH_LABEL,
  LEASING_UI,
  type LeasingApplyPath,
} from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn, formatDate } from '@/lib/utils';

const APPLY_PATH_ICON: Record<LeasingApplyPath, typeof Smartphone> = {
  [LEASING_APPLY_PATH.APP_DOWNLOAD]: Smartphone,
  [LEASING_APPLY_PATH.H5_WEB]: Globe,
};

export function LeasingStepOpenReport({ detail }: { detail: LeasingPropertyDetail }) {
  const { leasingCycles, apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const sendReportLocal = useLeasingWorkflowStore((s) => s.sendReportToAgent);

  const [sendingReport, setSendingReport] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);

  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = cycle?.id;
  const or = detail.openReport;

  const sendReport = async () => {
    setSendingReport(true);
    try {
      if (apiConnected && cycleId) {
        const view = await leasingOpsApi.sendReportToAgent(cycleId);
        applyCycleView(detail.propertyId, view);
      } else {
        sendReportLocal(detail.propertyId);
      }
      toast.success('Open report sent to agent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send report');
    } finally {
      setSendingReport(false);
    }
  };

  const sendInvites = async (recipients: Array<{ email?: string; phone?: string }>) => {
    if (!apiConnected || !cycleId) {
      toast.error('Leasing cycle not available — refresh and try again');
      throw new Error('No cycle');
    }
    const view = await leasingOpsApi.sendViewerInvites(cycleId, { recipients });
    applyCycleView(detail.propertyId, view);
  };

  return (
    <div className="space-y-3">
      <StepCard
        icon={FileText}
        title="Open report"
        description="Outcome of the open viewing — shared with the agent and viewable internally."
        status={or.status}
        footer={
          <>
            {!or.sentToAgent && (
              <Button
                size="sm"
                className={cn('gap-1.5', LEASING_UI.btnSecondary)}
                variant="ghost"
                disabled={sendingReport}
                onClick={() => void sendReport()}
              >
                <Send className="size-3.5" />
                {sendingReport ? 'Sending…' : 'Send report to agent'}
              </Button>
            )}
            <Button
              size="sm"
              className={cn('gap-1.5', LEASING_UI.btnSecondary)}
              variant="ghost"
              disabled={generatingReport || !cycleId}
              onClick={async () => {
                if (!cycleId) return;
                setGeneratingReport(true);
                try {
                  const view = await leasingOpsApi.generateOpenReport(cycleId);
                  applyCycleView(detail.propertyId, view);
                  toast.success('Open report generated — approved applicants in PDF');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not generate report');
                } finally {
                  setGeneratingReport(false);
                }
              }}
            >
              <FileText className="size-3.5" />
              {generatingReport ? 'Generating…' : 'Generate open report'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              disabled={!or.reportViewable && !cycleId}
              onClick={async () => {
                if (!cycleId) return;
                try {
                  const blob = await leasingOpsApi.downloadOpenReportPdf(cycleId);
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Could not open report');
                }
              }}
            >
              <FileText className="size-3.5" />
              View / download PDF
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <BoolStatus
            done={or.sentToAgent}
            doneLabel="Report sent to agent"
            pendingLabel="Not yet sent to agent"
          />
          {typeof or.attendeeCount === 'number' && (
            <StepFact label="Viewing attendees" value={or.attendeeCount} />
          )}
          {or.sentToAgentAt && <StepFact label="Sent" value={formatDate(or.sentToAgentAt)} />}
        </div>
      </StepCard>

      <StepCard
        icon={MessageSquare}
        title="Invite viewers to apply"
        description="SMS/email attendees inviting them to apply."
      >
        <LeasingViewerInvitePanel detail={detail} onSend={sendInvites} />
        <div>
          <p className="text-muted-foreground mb-1.5 text-[10px] tracking-wider uppercase">
            Ways to apply
          </p>
          <div className="flex flex-wrap gap-1.5">
            {or.applyPaths.map((path) => {
              const Icon = APPLY_PATH_ICON[path];
              return (
                <span
                  key={path}
                  className="bg-secondary/30 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
                >
                  <Icon className={cn('size-3', LEASING_UI.accentIcon)} />
                  {LEASING_APPLY_PATH_LABEL[path]}
                </span>
              );
            })}
          </div>
        </div>
      </StepCard>
    </div>
  );
}
