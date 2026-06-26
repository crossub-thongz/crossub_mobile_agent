'use client';

import { FileText, Globe, MessageSquare, Send, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import { BoolStatus, StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import {
  LEASING_APPLY_PATH,
  LEASING_APPLY_PATH_LABEL,
  LEASING_UI,
  type LeasingApplyPath,
} from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { cn, formatDate } from '@/lib/utils';

const APPLY_PATH_ICON: Record<LeasingApplyPath, typeof Smartphone> = {
  [LEASING_APPLY_PATH.APP_DOWNLOAD]: Smartphone,
  [LEASING_APPLY_PATH.H5_WEB]: Globe,
};

export function LeasingStepOpenReport({ detail }: { detail: LeasingPropertyDetail }) {
  const sendReport = useLeasingWorkflowStore((s) => s.sendReportToAgent);
  const sendInvites = useLeasingWorkflowStore((s) => s.sendViewerInvites);
  const or = detail.openReport;

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
                onClick={() => {
                  sendReport(detail.propertyId);
                  toast.success('Open report sent to agent');
                }}
              >
                <Send className="size-3.5" />
                Send report to agent
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              disabled={!or.reportViewable}
              onClick={() => toast('Opening report preview…')}
            >
              <FileText className="size-3.5" />
              View open report
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
        footer={
          !or.viewerInvitesSent ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs"
              onClick={() => {
                sendInvites(detail.propertyId);
                toast.success('Invites sent to viewers');
              }}
            >
              <Send className="size-3.5" />
              Send SMS / email invites
            </Button>
          ) : undefined
        }
      >
        <BoolStatus
          done={or.viewerInvitesSent}
          doneLabel={`Invites sent${or.invitedCount ? ` to ${or.invitedCount}` : ''}`}
          pendingLabel="Invites not yet sent"
        />
        <div>
          <p className="text-muted-foreground mb-1.5 text-[10px] uppercase tracking-wider">
            Ways to apply
          </p>
          <div className="flex flex-wrap gap-1.5">
            {or.applyPaths.map((path) => {
              const Icon = APPLY_PATH_ICON[path];
              return (
                <span
                  key={path}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-secondary/30 px-2.5 py-1 text-[11px]"
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
