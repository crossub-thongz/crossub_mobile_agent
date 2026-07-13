'use client';

import { useState } from 'react';
import { Check, Users, X } from 'lucide-react';
import { toast } from 'sonner';

import { CaseNestedDialog } from '@/components/agent/case-nested-dialog';
import { EmptyState } from '@/components/agent/empty-state';
import { StatusBadge } from '@/components/agent/status-badge';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  LEASING_AGENT_DECISION,
  LEASING_AGENT_DECISION_LABEL,
} from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingApplicationDetail, LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn, formatDateTime } from '@/lib/utils';

function ApplicantResultsRow({
  app,
  cycleId,
  propertyId,
  apiConnected,
  onCaseClosed,
}: {
  app: LeasingApplicationDetail;
  cycleId?: string;
  propertyId: string;
  apiConnected: boolean;
  onCaseClosed?: () => void;
}) {
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);

  const pending = app.agentDecision === LEASING_AGENT_DECISION.PENDING;
  const sentAt = app.feedbackSentAt;
  const alreadySent = Boolean(sentAt);

  const sendDecision = async (decision: 'approved' | 'rejected') => {
    if (!apiConnected || !cycleId || alreadySent) return;
    setBusy(true);
    try {
      const view = await leasingOpsApi.sendApplicantResultsDecision(cycleId, app.id, {
        decision,
        feedback: decision === 'approved' ? feedback.trim() || undefined : undefined,
        rejectReason: decision === 'rejected' ? rejectReason.trim() || undefined : undefined,
      });
      applyCycleView(propertyId, view);
      if (!view.isActive) {
        onCaseClosed?.();
        toast.success('All applicant results sent — new leasing case closed');
      } else {
        toast.success(
          decision === 'approved'
            ? `${app.applicant} approved — candidate notified`
            : `Reject email sent to ${app.applicant}`,
        );
      }
      setApproveOpen(false);
      setRejectOpen(false);
      setFeedback('');
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send results');
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr className="align-top transition-colors hover:bg-muted/20">
      <td className="px-3 py-3 tabular-nums whitespace-nowrap">
        {formatDateTime(app.submittedAt)}
      </td>
      <td className="px-3 py-3 font-medium">{app.applicant}</td>
      <td className="px-3 py-3">{app.phone?.trim() || '—'}</td>
      <td className="px-3 py-3">{app.email?.trim() || '—'}</td>
      <td className="px-3 py-3">
        <StatusBadge label={LEASING_AGENT_DECISION_LABEL[app.agentDecision]} />
      </td>
      <td className="min-w-[220px] px-3 py-3">
        {pending && !alreadySent ? (
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={!apiConnected || busy}
              onClick={() => {
                setFeedback('');
                setApproveOpen(true);
              }}
            >
              <Check className="size-3.5" />
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-7 gap-1 text-xs hover:text-rose-600"
              disabled={!apiConnected || busy}
              onClick={() => {
                setRejectReason('');
                setRejectOpen(true);
              }}
            >
              <X className="size-3.5" />
              Reject
            </Button>
          </div>
        ) : alreadySent ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] text-emerald-700',
              'dark:text-emerald-400',
            )}
          >
            <Check className="size-3" />
            {app.agentDecision === LEASING_AGENT_DECISION.APPROVED
              ? 'Approved — candidate notified'
              : 'Reject email sent'}
            {sentAt ? ` · ${formatDateTime(sentAt)}` : ''}
          </span>
        ) : (
          <span className="text-muted-foreground text-[11px]">Decision recorded</span>
        )}
        {!app.email?.trim() && pending && !alreadySent ? (
          <p className="text-muted-foreground mt-1 text-[11px]">
            No email on file — decision will be logged but not emailed.
          </p>
        ) : null}
      </td>

      <CaseNestedDialog
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve applicant"
        description={
          <>
            {app.applicant} will be notified by email. Add an optional message for the candidate.
          </>
        }
      >
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional message for the approved applicant…"
          className="min-h-20 text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setApproveOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy} onClick={() => void sendDecision('approved')}>
            Approve &amp; notify
          </Button>
        </div>
      </CaseNestedDialog>

      <CaseNestedDialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject applicant"
        description={
          <>
            {app.applicant} will receive a decline email. You can include an optional reason.
          </>
        }
      >
        <Input
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Optional reason (included in email)"
          className="text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setRejectOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => void sendDecision('rejected')}
          >
            Send reject email
          </Button>
        </div>
      </CaseNestedDialog>
    </tr>
  );
}

export function LeasingStepResults({
  detail,
  onCaseClosed,
}: {
  detail: LeasingPropertyDetail;
  onCaseClosed?: () => void;
}) {
  const { leasingCycles, apiConnected } = useAgentData();
  const cycle = leasingCycles.find((c) => c.propertyId === detail.propertyId);
  const cycleId = cycle?.id;

  const applicants = [...detail.applicationsDetail].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-card px-4 py-3">
        <p className="text-sm font-semibold">
          {applicants.length} applicant{applicants.length === 1 ? '' : 's'} applied
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          Approve or reject each applicant and notify them by email. Approved applicants will
          receive tenant portal login credentials from CROSSUB staff.
        </p>
        {detail.cycleActive === false ? (
          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            This new leasing case is closed — all applicant results were sent.
          </p>
        ) : null}
      </div>

      {applicants.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No applicants yet"
          description="Results will appear here once viewers apply after the open inspection report is available."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-3 font-semibold">Applied</th>
                  <th className="px-3 py-3 font-semibold">Applicant</th>
                  <th className="px-3 py-3 font-semibold">Phone</th>
                  <th className="px-3 py-3 font-semibold">Email</th>
                  <th className="px-3 py-3 font-semibold">Decision</th>
                  <th className="min-w-[220px] px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {applicants.map((app) => (
                  <ApplicantResultsRow
                    key={app.id}
                    app={app}
                    cycleId={cycleId}
                    propertyId={detail.propertyId}
                    apiConnected={apiConnected}
                    onCaseClosed={onCaseClosed}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
