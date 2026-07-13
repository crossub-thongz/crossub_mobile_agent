'use client';

import { useState } from 'react';
import { Check, Mail, MessageSquare, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { CaseNestedDialog } from '@/components/agent/case-nested-dialog';
import { StatusBadge } from '@/components/agent/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  LEASING_AGENT_DECISION,
  LEASING_AGENT_DECISION_LABEL,
} from '@/lib/leasing/constants';
import { openViewingsApi } from '@/lib/open-viewings-api';
import type { OpenInspectionSession, OpenInspectionVisitor } from '@/constants/open-inspection-ops';

function ApplicantRow({
  visitor,
  busy,
  readOnly,
  onApprove,
  onReject,
}: {
  visitor: OpenInspectionVisitor;
  busy: boolean;
  readOnly?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const app = visitor.application;
  const pending = app?.agentDecision === LEASING_AGENT_DECISION.PENDING;

  return (
    <li className="rounded-xl border bg-background px-3 py-2.5 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium">{visitor.name}</p>
        {app ? <StatusBadge label={LEASING_AGENT_DECISION_LABEL[app.agentDecision]} /> : null}
      </div>
      <div className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {visitor.email && (
          <span className="inline-flex items-center gap-1">
            <Mail className="size-3" />
            {visitor.email}
          </span>
        )}
        {visitor.phone && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3" />
            {visitor.phone}
          </span>
        )}
      </div>
      {app?.aiAdvice ? (
        <p className="border-primary/20 bg-primary/5 mt-2 flex items-start gap-1.5 rounded-lg border px-2 py-1.5 text-[11px]">
          <Sparkles className="text-primary mt-0.5 size-3 shrink-0" />
          <span>{app.aiAdvice}</span>
        </p>
      ) : null}
      {app?.feedback ? (
        <p className="text-muted-foreground mt-1.5 text-[11px]">
          <span className="font-medium">Feedback: </span>
          {app.feedback}
        </p>
      ) : null}
      {app?.rejectReason ? (
        <p className="mt-1.5 text-[11px] text-rose-600">Reason: {app.rejectReason}</p>
      ) : null}
      {app && pending && !readOnly ? (
        <div className="mt-2 flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 text-xs"
            disabled={busy}
            onClick={onApprove}
          >
            <Check className="size-3.5" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground h-7 gap-1 text-xs hover:text-rose-600"
            disabled={busy}
            onClick={onReject}
          >
            <X className="size-3.5" />
            Reject
          </Button>
        </div>
      ) : app?.candidateNotified ? (
        <p className="text-muted-foreground mt-1.5 text-[11px]">
          {app.agentDecision === LEASING_AGENT_DECISION.APPROVED
            ? 'Candidate notified'
            : 'Reject email sent'}
        </p>
      ) : null}
    </li>
  );
}

export function OpenInspectionApplicantPanel({
  session,
  onSessionChange,
  readOnly = false,
}: {
  session: OpenInspectionSession;
  onSessionChange: (session: OpenInspectionSession) => void;
  /** When true, applicants are view-only (approve/reject happens on the Results step). */
  readOnly?: boolean;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approveVisitor, setApproveVisitor] = useState<OpenInspectionVisitor | null>(null);
  const [rejectVisitor, setRejectVisitor] = useState<OpenInspectionVisitor | null>(null);
  const [feedback, setFeedback] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const applicants = session.visitors.filter((v) => v.application);

  const confirmApprove = async () => {
    if (!approveVisitor?.application) return;
    setBusyId(approveVisitor.id);
    try {
      const updated = await openViewingsApi.decide(approveVisitor.id, {
        decision: 'approved',
        feedback: feedback.trim() || undefined,
      });
      onSessionChange(updated);
      toast.success(`${approveVisitor.name} approved — candidate notified`);
      setApproveVisitor(null);
      setFeedback('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve applicant');
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    if (!rejectVisitor?.application) return;
    setBusyId(rejectVisitor.id);
    try {
      const updated = await openViewingsApi.decide(rejectVisitor.id, {
        decision: 'rejected',
        rejectReason: rejectReason.trim() || undefined,
      });
      onSessionChange(updated);
      toast(`Reject email sent to ${rejectVisitor.name}`);
      setRejectVisitor(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reject applicant');
    } finally {
      setBusyId(null);
    }
  };

  if (applicants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-4 py-6 text-center text-xs">
        <p className="font-medium">No applications yet</p>
        <p className="text-muted-foreground mt-1">
          Share the apply link so prospects can submit their rental application after the
          viewing.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {applicants.map((visitor) => (
          <ApplicantRow
            key={visitor.id}
            visitor={visitor}
            busy={busyId === visitor.id}
            readOnly={readOnly}
            onApprove={() => {
              setFeedback('');
              setApproveVisitor(visitor);
            }}
            onReject={() => {
              setRejectReason('');
              setRejectVisitor(visitor);
            }}
          />
        ))}
      </ul>

      <CaseNestedDialog
        open={!!approveVisitor}
        onClose={() => setApproveVisitor(null)}
        title="Approve applicant"
        description={
          <>
            {approveVisitor?.name} will be notified by email. Add an optional message for the
            candidate.
          </>
        }
      >
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Optional feedback for the approved applicant…"
          className="min-h-20 text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setApproveVisitor(null)}>
            Cancel
          </Button>
          <Button size="sm" disabled={!!busyId} onClick={() => void confirmApprove()}>
            Approve &amp; notify
          </Button>
        </div>
      </CaseNestedDialog>

      <CaseNestedDialog
        open={!!rejectVisitor}
        onClose={() => setRejectVisitor(null)}
        title="Reject applicant"
        description={
          <>
            {rejectVisitor?.name} will receive a decline email. You can include an optional
            reason.
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
          <Button variant="outline" size="sm" onClick={() => setRejectVisitor(null)}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!!busyId}
            onClick={() => void confirmReject()}
          >
            Send reject email
          </Button>
        </div>
      </CaseNestedDialog>
    </>
  );
}
