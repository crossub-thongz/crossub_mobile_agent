'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileText, ImagePlus, Loader2, Play, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  deleteMaintenanceAttachment,
  setMaintenanceAgentApproval,
  uploadMaintenanceAttachment,
} from '@/lib/crossub-api/maintenance-client';
import { fileToBase64 } from '@/lib/file-upload';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import { completionReviewAttachments } from '@/lib/maintenance/merge-intake-photo-attachments';
import { resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';
import { cn } from '@/lib/utils';

const MAX_COMPLETION_EVIDENCE = 8;

function attachmentPreviewUrl(att: ApiMaintenanceAttachment): string {
  return att.previewUrl ?? `/api/maintenance/attachments/${att.id}/preview`;
}

function GateStatusBadge({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        checked
          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {checked ? 'Checked' : 'Not checked'}
    </span>
  );
}

function SectionHeader({
  title,
  checked,
}: {
  title: string;
  checked: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-semibold">{title}</p>
      <span className="flex shrink-0 items-center gap-2">
        <GateStatusBadge checked={checked} />
        {checked ? <CheckCircle2 className="size-4 text-green-500" /> : null}
      </span>
    </div>
  );
}

export function MaintenanceCompletionGatesPanel({
  ctx,
  attachments,
  apiConnected,
  onUpdated,
}: {
  ctx: MaintenanceWorkflowContext;
  attachments: ApiMaintenanceAttachment[];
  apiConnected: boolean;
  onUpdated?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [pendingInvoiceFile, setPendingInvoiceFile] = useState<File | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<ApiMaintenanceAttachment | null>(
    null,
  );

  const requestId = ctx.item.id;
  const status = ctx.workspaceCase.status;
  const responsibility = resolveMaintenanceResponsibility(ctx);
  const isClosed = status === 'closed';
  const isInProgress = status === 'in_progress';
  const isCompleted = status === 'completed';
  const canEdit = apiConnected && !isClosed && (isInProgress || isCompleted);

  const evidenceAttachments = useMemo(
    () => completionReviewAttachments(requestId, attachments, responsibility),
    [attachments, requestId, responsibility],
  );
  const invoiceAttachments = useMemo(
    () =>
      attachments.filter(
        (a) => a.maintenanceRequestId === requestId && a.kind === 'invoice',
      ),
    [attachments, requestId],
  );

  const hasCompletionEvidence =
    evidenceAttachments.length > 0 || Boolean(ctx.workspaceCase.completionEvidenceUploaded);
  const agentApproved = Boolean(ctx.workspaceCase.agentApprovalReceived);
  const tenantSignOff = Boolean(ctx.workspaceCase.tenantApprovalReceived);
  // Gate is checked by upload itself — no manual checkbox for agents.
  const invoiceUploaded =
    Boolean(ctx.workspaceCase.invoiceUploaded) || invoiceAttachments.length > 0;

  const runGateUpdate = async (action: () => Promise<unknown>, success: string) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      await action();
      toast.success(success);
      await onUpdated?.();
    } catch {
      toast.error('Could not update — try again');
    } finally {
      setBusy(false);
    }
  };

  const handleInvoiceUpload = async () => {
    if (!pendingInvoiceFile || !canEdit) return;

    const mime = pendingInvoiceFile.type || 'application/pdf';
    if (!mime.startsWith('image/') && mime !== 'application/pdf') {
      toast.error('Invoice must be a PDF or image');
      return;
    }

    setInvoiceUploading(true);
    try {
      const contentBase64 = await fileToBase64(pendingInvoiceFile);
      await uploadMaintenanceAttachment({
        maintenanceRequestId: requestId,
        kind: 'invoice',
        fileName: pendingInvoiceFile.name,
        mimeType: mime,
        sizeBytes: pendingInvoiceFile.size,
        contentBase64,
      });
      toast.success('Invoice uploaded');
      setPendingInvoiceFile(null);
      await onUpdated?.();
    } catch {
      toast.error('Invoice upload failed — try again');
    } finally {
      setInvoiceUploading(false);
    }
  };

  // Mirrors the API rule (`setAgentApprovalReceived` rejects approval with no evidence),
  // so the gate must read as blocked rather than as an unticked action.
  const canApprove = canEdit && hasCompletionEvidence;
  const approvalBlocked = canEdit && !hasCompletionEvidence;

  const allGatesCleared =
    hasCompletionEvidence &&
    agentApproved &&
    tenantSignOff &&
    invoiceUploaded &&
    responsibility !== 'tenant';

  return (
    <div className="space-y-4">
      {/* Completion evidence — view contractor uploads only. */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <SectionHeader title="Completion evidence" checked={hasCompletionEvidence} />
        <p className="text-muted-foreground text-xs">
          {responsibility === 'strata'
            ? 'View completion evidence and intake photos uploaded for this strata job.'
            : 'View completion photos uploaded by the contractor.'}
        </p>

        <div className="rounded-lg border bg-background p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
              Uploaded evidence
            </p>
            <span className="text-muted-foreground text-[10px] tabular-nums">
              {evidenceAttachments.length}/{MAX_COMPLETION_EVIDENCE}
            </span>
          </div>
          <EvidenceGallery
            attachments={evidenceAttachments}
            canDelete={false}
            onDelete={onUpdated}
          />
        </div>
      </section>

      {/* Tenant Sign-Off Received */}
      <section className="space-y-2 rounded-xl border bg-card p-4">
        <SectionHeader title="Tenant Sign-Off Received" checked={tenantSignOff} />
        <p className="text-muted-foreground text-xs">View only — admin records tenant sign-off.</p>
      </section>

      {/* Agent approval — highlighted action for the managing agent. */}
      <section
        className={cn(
          'space-y-3 rounded-xl border-2 p-4 shadow-sm',
          agentApproved
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : approvalBlocked
              ? 'border-border bg-muted/30'
              : 'border-primary/50 bg-primary/10',
        )}
      >
        <SectionHeader title="Agent approval received" checked={agentApproved} />
        <p className="text-xs">
          {agentApproved
            ? 'You have approved the completion evidence for this job.'
            : approvalBlocked
              ? 'The contractor has not uploaded completion evidence yet. You can approve once it arrives.'
              : 'Review the completion evidence above, then confirm your approval to clear this gate.'}
        </p>

        {canEdit ? (
          <label
            aria-disabled={!canApprove}
            className={cn(
              'flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors',
              canApprove
                ? 'cursor-pointer border-primary/30 hover:bg-primary/5'
                : 'cursor-not-allowed border-border bg-muted/40 opacity-60',
              agentApproved && 'border-emerald-500/30',
            )}
          >
            <input
              type="checkbox"
              className={cn(
                'size-4 rounded border-primary accent-primary',
                canApprove ? 'cursor-pointer' : 'cursor-not-allowed',
              )}
              checked={agentApproved}
              disabled={busy || !hasCompletionEvidence}
              onChange={(e) =>
                void runGateUpdate(
                  () => setMaintenanceAgentApproval(requestId, e.target.checked),
                  e.target.checked ? 'Agent approval recorded' : 'Agent approval cleared',
                )
              }
            />
            <span className="text-sm font-semibold">
              I have reviewed and approve the completion evidence
            </span>
            {busy ? (
              <Loader2 className="text-muted-foreground ml-auto size-4 shrink-0 animate-spin" />
            ) : null}
          </label>
        ) : null}

        {approvalBlocked ? (
          <p className="text-muted-foreground text-xs">
            Waiting for contractor completion evidence before you can approve.
          </p>
        ) : canApprove && !agentApproved ? (
          <p className="text-muted-foreground text-xs">
            Ticking this saves straight away — there is no separate save step.
          </p>
        ) : null}
      </section>

      {/* Invoice uploaded — agent uploads the contractor invoice. */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <SectionHeader title="Invoice Uploaded" checked={invoiceUploaded} />
        <p className="text-muted-foreground text-xs">
          Upload the contractor invoice (PDF or image). The gate clears automatically once a file
          is attached.
        </p>

        {ctx.workspaceCase.contractorInvoiceNumber ||
        ctx.workspaceCase.contractorInvoiceAmount != null ? (
          <dl className="bg-background space-y-1 rounded-lg border p-3 text-xs">
            {ctx.workspaceCase.contractorInvoiceNumber ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Invoice #</dt>
                <dd className="font-medium">{ctx.workspaceCase.contractorInvoiceNumber}</dd>
              </div>
            ) : null}
            {ctx.workspaceCase.contractorInvoiceAmount != null ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium tabular-nums">
                  ${ctx.workspaceCase.contractorInvoiceAmount.toFixed(2)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {invoiceAttachments.length === 0 ? (
          canEdit ? (
            <div className="space-y-3 rounded-lg border border-dashed bg-background px-3 py-4">
              <p className="text-muted-foreground text-center text-xs">
                No invoice file attached yet.
              </p>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/40">
                  {invoiceUploading ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="size-3.5" />
                  )}
                  Choose file
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    disabled={invoiceUploading || busy}
                    onChange={(e) => setPendingInvoiceFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {pendingInvoiceFile ? (
                  <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                    {pendingInvoiceFile.name}
                  </span>
                ) : null}
              </div>
              {pendingInvoiceFile ? (
                <Button
                  type="button"
                  className="w-full"
                  size="sm"
                  disabled={invoiceUploading || busy}
                  onClick={() => void handleInvoiceUpload()}
                >
                  {invoiceUploading ? 'Uploading…' : 'Confirm upload'}
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground rounded-lg border border-dashed bg-background px-3 py-4 text-center text-xs">
              No invoice file attached yet.
            </p>
          )
        ) : (
          <div className="rounded-lg border bg-background p-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Invoice file
            </p>
            <InvoiceAttachmentGallery
              attachments={invoiceAttachments}
              onPreview={setPreviewAttachment}
            />
          </div>
        )}
      </section>

      {/* Auto-close when all gates are checked */}
      {!isClosed && canEdit && responsibility !== 'tenant' ? (
        <section
          className={cn(
            'rounded-xl border p-4',
            allGatesCleared
              ? 'border-primary/30 bg-primary/5'
              : 'border-dashed border-border bg-muted/30',
          )}
        >
          <p className="text-muted-foreground text-xs leading-relaxed">
            {allGatesCleared
              ? 'All gates cleared — the case closes automatically.'
              : 'Each gate saves the moment you complete it — there is nothing to submit here. The case closes automatically once all of them are checked.'}
          </p>
        </section>
      ) : null}

      {isClosed ? (
        <div className="flex items-center justify-center gap-2 py-2 text-center text-sm text-green-600">
          <CheckCircle2 className="size-5" />
          <span className="font-medium">Done — job closed</span>
        </div>
      ) : null}

      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}

function InvoiceAttachmentGallery({
  attachments,
  onPreview,
}: {
  attachments: ApiMaintenanceAttachment[];
  onPreview: (att: ApiMaintenanceAttachment) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {attachments.map((att) => {
        const preview = attachmentPreviewUrl(att);
        const isImage = att.mimeType.startsWith('image/');
        const isPdf = att.mimeType === 'application/pdf';

        return (
          <button
            key={att.id}
            type="button"
            onClick={() => onPreview(att)}
            className="hover:bg-secondary/20 overflow-hidden rounded-lg border bg-muted/30 text-left transition-colors"
          >
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt={att.fileName}
                  className="size-full object-cover object-top"
                />
              ) : isPdf ? (
                <iframe
                  src={preview}
                  title={att.fileName}
                  className="pointer-events-none size-full border-0 bg-white"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 px-2">
                  <FileText className="text-muted-foreground/50 size-8" />
                  <span className="text-muted-foreground text-center text-[10px]">Tap to preview</span>
                </div>
              )}
            </div>
            <div className="border-t bg-background px-2.5 py-2">
              <p className="truncate text-xs font-medium">{att.fileName}</p>
              <p className="text-muted-foreground text-[10px]">Tap to open full preview</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function EvidenceGallery({
  attachments,
  canDelete,
  onDelete,
}: {
  attachments: ApiMaintenanceAttachment[];
  canDelete: boolean;
  onDelete?: () => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (attachments.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">No completion evidence uploaded yet.</p>
    );
  }

  const handleDelete = async (attachmentId: string) => {
    setDeletingId(attachmentId);
    try {
      await deleteMaintenanceAttachment(attachmentId);
      toast.success('Attachment removed');
      await onDelete?.();
    } catch {
      toast.error('Could not remove attachment');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {attachments.map((att) => {
        const preview = attachmentPreviewUrl(att);
        const isImage = att.mimeType.startsWith('image/');
        const isVideo = att.mimeType.startsWith('video/');

        return (
          <div key={att.id} className="group relative">
            <a
              href={preview}
              target="_blank"
              rel="noopener noreferrer"
              title={att.fileName}
              className="relative flex aspect-square w-full overflow-hidden rounded-md border bg-muted hover:bg-secondary/20"
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={att.fileName} className="size-full object-cover" />
              ) : isVideo ? (
                <div className="flex size-full flex-col items-center justify-center gap-1 px-1">
                  <Play className="text-muted-foreground size-5" />
                  <span className="text-muted-foreground max-w-full truncate text-[9px]">
                    {att.fileName}
                  </span>
                </div>
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-1 px-1">
                  <FileText className="text-muted-foreground/50 size-5" />
                  <span className="text-muted-foreground max-w-full truncate text-[9px]">
                    {att.fileName}
                  </span>
                </div>
              )}
            </a>
            {canDelete ? (
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-1 right-1 size-6 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                disabled={deletingId === att.id}
                onClick={() => void handleDelete(att.id)}
                aria-label={`Delete ${att.fileName}`}
              >
                {deletingId === att.id ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <X className="size-3" />
                )}
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function AttachmentPreviewDialog({
  attachment,
  onClose,
}: {
  attachment: ApiMaintenanceAttachment | null;
  onClose: () => void;
}) {
  if (!attachment) return null;

  const preview = attachmentPreviewUrl(attachment);
  const isImage = attachment.mimeType.startsWith('image/');
  const isVideo = attachment.mimeType.startsWith('video/');
  const isPdf = attachment.mimeType === 'application/pdf';

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" elevated>
        <DialogHeader>
          <DialogTitle className="truncate pr-6 text-base">{attachment.fileName}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-hidden rounded-lg border bg-muted">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt={attachment.fileName}
              className="max-h-[60vh] w-full object-contain"
            />
          ) : isVideo ? (
            <video src={preview} controls className="max-h-[60vh] w-full bg-black" />
          ) : isPdf ? (
            <iframe
              src={preview}
              title={attachment.fileName}
              className="h-[min(60vh,480px)] w-full bg-background"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
              <FileText className="text-muted-foreground size-10" />
              <p className="text-muted-foreground text-sm">Preview not available for this file type.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" asChild>
            <a href={preview} download={attachment.fileName}>
              <Download className="mr-2 size-4" />
              Download
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
