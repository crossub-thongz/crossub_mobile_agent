'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileText, Loader2, Play, Upload, X } from 'lucide-react';
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
  setMaintenanceCompletionEvidence,
  setMaintenanceInvoiceUploaded,
  uploadMaintenanceAttachment,
} from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import { resolveMaintenanceResponsibility } from '@/lib/maintenance/infer-responsibility';
import { fileToBase64 } from '@/lib/file-upload';
import {
  isAllowedMaintenanceInvoiceMime,
  MAX_MAINTENANCE_ATTACHMENT_BYTES,
  MAX_MAINTENANCE_ATTACHMENT_LABEL,
} from '@/lib/maintenance/maintenance-attachment-limits';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
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
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [invoiceUploadPhase, setInvoiceUploadPhase] = useState<'idle' | 'reading' | 'uploading'>('idle');
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

  const evidenceApproved = Boolean(ctx.workspaceCase.completionEvidenceUploaded);
  const tenantSignOff = Boolean(ctx.workspaceCase.tenantApprovalReceived);

  const evidenceAttachments = useMemo(
    () =>
      attachments.filter(
        (a) => a.maintenanceRequestId === requestId && a.kind === 'evidence',
      ),
    [attachments, requestId],
  );
  const invoiceAttachments = useMemo(
    () =>
      attachments.filter(
        (a) => a.maintenanceRequestId === requestId && a.kind === 'invoice',
      ),
    [attachments, requestId],
  );
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

    const file = pendingInvoiceFile;
    if (file.size > MAX_MAINTENANCE_ATTACHMENT_BYTES) {
      toast.error(`File exceeds the ${MAX_MAINTENANCE_ATTACHMENT_LABEL} limit`);
      setPendingInvoiceFile(null);
      return;
    }
    const mime = file.type || 'application/pdf';
    if (!isAllowedMaintenanceInvoiceMime(mime)) {
      toast.error('Unsupported invoice file type. Use PDF or image (PNG, JPEG, WebP, HEIC).');
      setPendingInvoiceFile(null);
      return;
    }

    setUploadingInvoice(true);
    setInvoiceUploadPhase('reading');
    try {
      const contentBase64 = await fileToBase64(file);
      setInvoiceUploadPhase('uploading');
      await uploadMaintenanceAttachment({
        maintenanceRequestId: requestId,
        kind: 'invoice',
        fileName: file.name,
        mimeType: mime,
        sizeBytes: file.size,
        contentBase64,
      });
      await setMaintenanceInvoiceUploaded(requestId, true);
      setPendingInvoiceFile(null);
      toast.success('Invoice uploaded — task marked checked');
      await onUpdated?.();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Invoice upload failed'));
    } finally {
      setUploadingInvoice(false);
      setInvoiceUploadPhase('idle');
    }
  };

  const allGatesCleared =
    evidenceApproved && tenantSignOff && invoiceUploaded && responsibility !== 'tenant';

  return (
    <div className="space-y-4">
      {/* Completion Evidence Uploaded — agents view + approve only (contractor/admin upload). */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <SectionHeader title="Completion Evidence Uploaded" checked={evidenceApproved} />
        <p className="text-muted-foreground text-xs">
          View completion photos uploaded by the contractor, then approve when ready.
        </p>

        {canEdit ? (
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="rounded"
              checked={evidenceApproved}
              disabled={busy}
              onChange={(e) =>
                void runGateUpdate(
                  () => setMaintenanceCompletionEvidence(requestId, e.target.checked),
                  e.target.checked
                    ? 'Completion evidence approved'
                    : 'Completion evidence approval cleared',
                )
              }
            />
            <span className="font-medium">Approve completion evidence</span>
          </label>
        ) : null}

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

      {/* Invoice Uploaded — uploading the file marks this gate automatically. */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <SectionHeader title="Invoice Uploaded" checked={invoiceUploaded} />
        <p className="text-muted-foreground text-xs">
          Upload the contractor invoice (PDF or image, up to {MAX_MAINTENANCE_ATTACHMENT_LABEL}). The
          task is marked checked when the upload succeeds. Tap a file to preview or download.
        </p>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/40">
              <Upload className="size-3.5" />
              Choose invoice
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                disabled={uploadingInvoice}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  e.target.value = '';
                  if (!file) return;
                  if (file.size > MAX_MAINTENANCE_ATTACHMENT_BYTES) {
                    toast.error(`File exceeds the ${MAX_MAINTENANCE_ATTACHMENT_LABEL} limit`);
                    return;
                  }
                  const mime = file.type || 'application/pdf';
                  if (!isAllowedMaintenanceInvoiceMime(mime)) {
                    toast.error(
                      'Unsupported invoice file type. Use PDF or image (PNG, JPEG, WebP, HEIC).',
                    );
                    return;
                  }
                  setPendingInvoiceFile(file);
                }}
              />
            </label>
            {pendingInvoiceFile ? (
              <>
                <span className="text-muted-foreground max-w-[140px] truncate text-xs">
                  {pendingInvoiceFile.name}
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={uploadingInvoice}
                  onClick={() => void handleInvoiceUpload()}
                >
                  {uploadingInvoice ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      {invoiceUploadPhase === 'reading' ? 'Reading file…' : 'Uploading…'}
                    </>
                  ) : (
                    'Upload'
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPendingInvoiceFile(null)}
                >
                  Remove
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {invoiceAttachments.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed bg-background px-3 py-4 text-center text-xs">
            No invoice attached yet.
          </p>
        ) : (
          <div className="rounded-lg border bg-background p-3">
            <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
              Uploaded invoice
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
        <section className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-muted-foreground text-center text-xs">
            {allGatesCleared
              ? 'All gates cleared — the case closes automatically.'
              : 'Mark all completion gates — the case closes automatically once they are checked.'}
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
