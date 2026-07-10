'use client';

import { useEffect, useState } from 'react';
import { Check, Send, Users } from 'lucide-react';
import { toast } from 'sonner';

import { EmptyState } from '@/components/agent/empty-state';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingApplicationDetail, LeasingPropertyDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn, formatDateTime } from '@/lib/utils';

function ApplicantFeedbackCell({
  app,
  cycleId,
  propertyId,
  apiConnected,
}: {
  app: LeasingApplicationDetail;
  cycleId?: string;
  propertyId: string;
  apiConnected: boolean;
}) {
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const [draft, setDraft] = useState(app.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setDraft(app.feedback ?? '');
  }, [app.feedback, app.id]);

  const trimmed = draft.trim();
  const canSend = apiConnected && !!cycleId && trimmed.length > 0;
  const sentAt = app.feedbackSentAt;

  const saveDraft = async () => {
    if (!apiConnected || !cycleId) {
      toast.error('Connect to the API to save feedback');
      return;
    }
    if (!trimmed) {
      toast.error('Write feedback before saving');
      return;
    }
    setSaving(true);
    try {
      const view = await leasingOpsApi.setApplicantFeedback(cycleId, app.id, {
        feedback: trimmed,
      });
      applyCycleView(propertyId, view);
      toast.success('Feedback draft saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save feedback');
    } finally {
      setSaving(false);
    }
  };

  const sendFeedback = async () => {
    if (!canSend || !cycleId) return;
    setSending(true);
    try {
      const view = await leasingOpsApi.sendApplicantFeedback(cycleId, app.id, {
        feedback: trimmed,
      });
      applyCycleView(propertyId, view);
      toast.success(`Feedback sent to ${app.applicant}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send feedback');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Write feedback for this applicant…"
        rows={3}
        maxLength={2000}
        disabled={!apiConnected || saving || sending}
        className="min-h-[72px] resize-y text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={saveDraft}
          disabled={!apiConnected || !trimmed || saving || sending}
        >
          Save draft
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={sendFeedback}
          disabled={!canSend || saving || sending}
        >
          <Send className="size-3.5" />
          Send to applicant
        </Button>
        {sentAt ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[11px] text-emerald-700',
              'dark:text-emerald-400',
            )}
          >
            <Check className="size-3" />
            Sent {formatDateTime(sentAt)}
          </span>
        ) : null}
      </div>
      {!app.email?.trim() ? (
        <p className="text-muted-foreground text-[11px]">
          No email on file — feedback will be logged but not emailed.
        </p>
      ) : null}
    </div>
  );
}

export function LeasingStepResults({ detail }: { detail: LeasingPropertyDetail }) {
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
          Write feedback for each applicant, then send it back to them by email.
        </p>
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
                  <th className="min-w-[280px] px-3 py-3 font-semibold">Feedback</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {applicants.map((app) => (
                  <tr key={app.id} className="align-top transition-colors hover:bg-muted/20">
                    <td className="px-3 py-3 tabular-nums whitespace-nowrap">
                      {formatDateTime(app.submittedAt)}
                    </td>
                    <td className="px-3 py-3 font-medium">{app.applicant}</td>
                    <td className="px-3 py-3">{app.phone?.trim() || '—'}</td>
                    <td className="px-3 py-3">{app.email?.trim() || '—'}</td>
                    <td className="px-3 py-3">
                      <ApplicantFeedbackCell
                        app={app}
                        cycleId={cycleId}
                        propertyId={detail.propertyId}
                        apiConnected={apiConnected}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
