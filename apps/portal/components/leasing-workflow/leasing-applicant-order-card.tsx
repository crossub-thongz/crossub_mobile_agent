'use client';

import { useState } from 'react';
import { Check, ExternalLink, FileText, Send, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingApplicantDocumentDropzone } from '@/components/leasing-workflow/leasing-applicant-document-dropzone';
import { LeasingToneBadge } from '@/components/leasing-workflow/leasing-status-badge';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { readFileUploadPayload } from '@/lib/leasing-applicant-upload.util';
import { applicantOrderTitle } from '@/lib/leasing/applicant-order';
import {
  LEASING_AGENT_DECISION,
  LEASING_AGENT_DECISION_LABEL,
  LEASING_AGENT_DECISION_TONE,
  LEASING_TONE,
  LEASING_UI,
} from '@/lib/leasing/constants';
import { canSelectApplicantForApproval } from '@/lib/leasing/lifecycle';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import type { LeasingApplicationDetail } from '@/lib/leasing/types';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

const AI_TONE = {
  strong: LEASING_TONE.SUCCESS,
  medium: LEASING_TONE.WARNING,
  risk: LEASING_TONE.DESTRUCTIVE,
} as const;

export function LeasingApplicantOrderCard({
  app,
  propertyId,
  cycleId,
  readOnly = false,
  busy = false,
  onToggle,
  onApprove,
  onReject,
}: {
  app: LeasingApplicationDetail;
  propertyId: string;
  cycleId?: string;
  readOnly?: boolean;
  busy?: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const [supplementaryFiles, setSupplementaryFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showSupplementary, setShowSupplementary] = useState(false);

  const decisionPending = app.agentDecision === LEASING_AGENT_DECISION.PENDING;
  const canSelect = canSelectApplicantForApproval(app);
  const documents = app.documents ?? [];

  const uploadSupplementary = async () => {
    if (supplementaryFiles.length === 0) return;
    if (!apiConnected || !cycleId) {
      toast.error('Leasing cycle not available — refresh and try again');
      return;
    }

    setUploading(true);
    try {
      let view = null;
      for (const file of supplementaryFiles) {
        const payload = await readFileUploadPayload(file);
        view = await leasingOpsApi.uploadApplicantDocument(cycleId, app.id, payload);
      }
      if (view) applyCycleView(propertyId, view);
      setSupplementaryFiles([]);
      setShowSupplementary(false);
      toast.success(
        `Added ${supplementaryFiles.length} supplementary document${supplementaryFiles.length === 1 ? '' : 's'} to ${app.applicant}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not upload documents');
    } finally {
      setUploading(false);
    }
  };

  return (
    <li className="bg-card rounded-xl border p-3.5">
      <div className="flex items-start gap-3">
        {!readOnly && canSelect ? (
          <input
            type="checkbox"
            checked={app.selectedForAgent}
            onChange={onToggle}
            disabled={busy}
            className="mt-1"
            aria-label={`Select ${app.applicant}`}
          />
        ) : (
          <span className="mt-1 inline-flex size-4 shrink-0" aria-hidden />
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-[13px] font-semibold">{applicantOrderTitle(app.applicant)}</p>
              {app.aiScoreLevel ? (
                <LeasingToneBadge
                  tone={AI_TONE[app.aiScoreLevel]}
                  label={`AI ${app.aiScoreLevel}${app.aiScore ? ` · ${app.aiScore}` : ''}`}
                  size="xs"
                />
              ) : null}
              {(readOnly || !decisionPending) && (
                <LeasingToneBadge
                  tone={LEASING_AGENT_DECISION_TONE[app.agentDecision]}
                  label={LEASING_AGENT_DECISION_LABEL[app.agentDecision]}
                  size="xs"
                />
              )}
              {!readOnly && app.sentToAgent && decisionPending ? (
                <LeasingToneBadge tone={LEASING_TONE.INFO} label="Sent for approval" size="xs" />
              ) : null}
            </div>
            <p className="text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px]">
              {typeof app.annualIncome === 'number' ? (
                <span className="tabular-nums">{formatCurrency(app.annualIncome)}/yr</span>
              ) : null}
              {app.employmentStatus ? (
                <span className="capitalize">{app.employmentStatus.replace('_', ' ')}</span>
              ) : null}
              <span>Applied {formatDateTime(app.submittedAt)}</span>
            </p>
            {app.aiAdvice ? (
              <p
                className={cn(
                  'mt-1.5 flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px]',
                  LEASING_UI.callout,
                )}
              >
                <Sparkles className={cn('mt-0.5 size-3 shrink-0', LEASING_UI.accentIcon)} />
                <span className="min-w-0">{app.aiAdvice}</span>
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border bg-muted/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Documents ({documents.length})
              </p>
              {!readOnly ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[10px]"
                  onClick={() => setShowSupplementary((value) => !value)}
                >
                  {showSupplementary ? 'Cancel' : 'Add supplementary'}
                </Button>
              ) : null}
            </div>

            {documents.length === 0 ? (
              <p className="text-muted-foreground mt-2 text-[11px]">No documents on this order yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {documents.map((doc) => (
                  <li key={doc.url}>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:bg-muted/40 flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-[11px]"
                    >
                      <FileText className="text-muted-foreground size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate">{doc.fileName}</span>
                      <ExternalLink className="text-muted-foreground size-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {!readOnly && showSupplementary ? (
              <div className="mt-3 space-y-2 border-t pt-3">
                <LeasingApplicantDocumentDropzone
                  files={supplementaryFiles}
                  onFilesChange={setSupplementaryFiles}
                  disabled={uploading}
                  compact
                  label="Drop supplementary files"
                  description="Adds to this applicant order"
                />
                {supplementaryFiles.length > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    className={cn('gap-1.5', LEASING_UI.btnSecondary)}
                    disabled={uploading}
                    onClick={() => void uploadSupplementary()}
                  >
                    <Send className="size-3.5" />
                    {uploading ? 'Uploading…' : `Upload to ${app.applicant}`}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {!readOnly && app.agentDecision === LEASING_AGENT_DECISION.PENDING ? (
          <div className="flex shrink-0 gap-1">
            <Button
              size="sm"
              variant="ghost"
              className={cn('h-7 gap-1 px-2 text-xs', LEASING_UI.btnSuccess)}
              disabled={busy}
              onClick={onApprove}
            >
              <Check className="size-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground size-7 p-0 hover:bg-rose-500/10 hover:text-rose-800"
              disabled={busy}
              onClick={onReject}
              aria-label="Reject"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
