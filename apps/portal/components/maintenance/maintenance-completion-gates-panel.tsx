'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Download, FileText, ImagePlus, Loader2, Play, Upload, X } from 'lucide-react';
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
import {
  closeMaintenanceCase,
  markMaintenanceWorkComplete,
} from '@/lib/maintenance/maintenance-case-ops';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import { fileToBase64 } from '@/lib/file-upload';
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
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [pendingInvoiceFile, setPendingInvoiceFile] = useState<File | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<ApiMaintenanceAttachment | null>(
    null,
  );

  const requestId = ctx.item.id;
  const status = ctx.workspaceCase.status;
  const responsibility = ctx.workspaceCase.responsibility;
  const isClosed = status === 'closed';
  const isInProgress = status === 'in_progress';
  const isCompleted = status === 'completed';
  const canEdit = apiConnected && !isClosed && (isInProgress || isCompleted);

  const evidenceApproved = Boolean(ctx.workspaceCase.completionEvidenceUploaded);
  const tenantSignOff = Boolean(ctx.workspaceCase.tenantApprovalReceived);
  const invoiceUploaded = Boolean(ctx.workspaceCase.invoiceUploaded);

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

  const handleEvidenceUpload = async (files: FileList | null) => {
    if (!files?.length || !canEdit) return;
    const remaining = MAX_COMPLETION_EVIDENCE - evidenceAttachments.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_COMPLETION_EVIDENCE} completion uploads`);
      return;
    }

    setUploadingEvidence(true);
    try {
      for (const file of Array.from(files).slice(0, remaining)) {
        const mime = file.type || 'image/jpeg';
        const contentBase64 = await fileToBase64(file);
        await uploadMaintenanceAttachment({
          maintenanceRequestId: requestId,
          kind: 'evidence',
          fileName: file.name,
          mimeType: mime,
          sizeBytes: file.size,
          contentBase64,
        });
      }
      await setMaintenanceCompletionEvidence(requestId, true);
      toast.success('Completion evidence uploaded');
      await onUpdated?.();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingEvidence(false);
    }
  };

  const handleInvoiceUpload = async () => {
    if (!pendingInvoiceFile || !canEdit) return;
    setUploadingInvoice(true);
    try {
      const file = pendingInvoiceFile;
      const contentBase64 = await fileToBase64(file);
      await uploadMaintenanceAttachment({
        maintenanceRequestId: requestId,
        kind: 'invoice',
        fileName: file.name,
        mimeType: file.type || 'application/pdf',
        sizeBytes: file.size,
        contentBase64,
      });
      await setMaintenanceInvoiceUploaded(requestId, true);
      setPendingInvoiceFile(null);
      toast.success('Invoice uploaded');
      await onUpdated?.();
    } catch {
      toast.error('Invoice upload failed');
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleMarkWorkComplete = async () => {
    if (!evidenceApproved || !isInProgress) return;
    setBusy(true);
    try {
      await markMaintenanceWorkComplete(requestId);
      toast.success('Work marked complete');
      await onUpdated?.();
    } catch {
      toast.error('Could not mark work complete');
    } finally {
      setBusy(false);
    }
  };

  const handleDoneClosed = async () => {
    if (!isCompleted || isClosed) return;
    setBusy(true);
    try {
      await closeMaintenanceCase(requestId);
      toast.success('Job closed');
      await onUpdated?.();
    } catch {
      toast.error('Could not close job — ensure invoice and tenant sign-off are recorded');
    } finally {
      setBusy(false);
    }
  };

  const canMarkWorkComplete = isInProgress && evidenceApproved && canEdit;
  const closeBlockedReason =
    responsibility === 'tenant'
      ? null
      : !tenantSignOff
        ? 'Waiting for admin to record tenant sign-off'
        : !invoiceUploaded
          ? 'Upload the contractor invoice first'
          : null;
  const canDoneClosed =
    isCompleted && !isClosed && canEdit && (responsibility === 'tenant' || (!closeBlockedReason));

  return (
    <div className="space-y-4">
      {/* Completion Evidence Uploaded */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <SectionHeader title="Completion Evidence Uploaded" checked={evidenceApproved} />
        <p className="text-muted-foreground text-xs">
          Upload completion photos, then approve the evidence to unlock Mark work complete.
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

        {isInProgress && canEdit ? (
          <div className="flex items-center justify-between gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/40">
              {uploadingEvidence ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ImagePlus className="size-3.5" />
              )}
              Add photo / video
              <input
                type="file"
                multiple
                accept="application/pdf,image/*,video/*"
                className="hidden"
                disabled={uploadingEvidence || evidenceAttachments.length >= MAX_COMPLETION_EVIDENCE}
                onChange={(e) => {
                  void handleEvidenceUpload(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
            <span className="text-muted-foreground text-[10px] tabular-nums">
              {evidenceAttachments.length}/{MAX_COMPLETION_EVIDENCE}
            </span>
          </div>
        ) : null}

        <div className="rounded-lg border bg-background p-3">
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Uploaded evidence
          </p>
          <EvidenceGallery
            attachments={evidenceAttachments}
            canDelete={canEdit && !busy}
            onDelete={onUpdated}
          />
        </div>
      </section>

      {/* Tenant Sign-Off Received */}
      <section className="space-y-2 rounded-xl border bg-card p-4">
        <SectionHeader title="Tenant Sign-Off Received" checked={tenantSignOff} />
        <p className="text-muted-foreground text-xs">View only — admin records tenant sign-off.</p>
      </section>

      {/* Invoice Uploaded */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <SectionHeader title="Invoice Uploaded" checked={invoiceUploaded} />
        <p className="text-muted-foreground text-xs">
          Upload the contractor invoice. Tap a file to preview or download.
        </p>

        {canEdit ? (
          <>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                className="rounded"
                checked={invoiceUploaded}
                disabled={busy}
                onChange={(e) =>
                  void runGateUpdate(
                    () => setMaintenanceInvoiceUploaded(requestId, e.target.checked),
                    e.target.checked ? 'Invoice marked uploaded' : 'Invoice unchecked',
                  )
                }
              />
              <span className="text-muted-foreground">Mark invoice gate as uploaded</span>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/40">
                {uploadingInvoice ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Upload className="size-3.5" />
                )}
                Choose invoice
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  disabled={uploadingInvoice}
                  onChange={(e) => setPendingInvoiceFile(e.target.files?.[0] ?? null)}
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
                    {uploadingInvoice ? 'Uploading…' : 'Upload'}
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
          </>
        ) : null}

        {invoiceAttachments.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed bg-background px-3 py-4 text-center text-xs">
            No invoice attached yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {invoiceAttachments.map((att) => (
              <li key={att.id}>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(att)}
                  className="hover:bg-secondary/40 flex w-full items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors"
                >
                  <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md border">
                    <FileText className="text-muted-foreground size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{att.fileName}</span>
                    <span className="text-muted-foreground text-[11px]">Tap to preview</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Workflow actions */}
      {isInProgress && canEdit ? (
        <section className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <Button
            type="button"
            className="w-full"
            disabled={!canMarkWorkComplete || busy}
            onClick={() => void handleMarkWorkComplete()}
          >
            Mark work complete
          </Button>
          {!evidenceApproved ? (
            <p className="text-muted-foreground text-center text-xs">
              Approve completion evidence above to enable this action.
            </p>
          ) : null}
        </section>
      ) : null}

      {isCompleted && !isClosed && canEdit ? (
        <section className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <Button
            type="button"
            className="w-full"
            disabled={!canDoneClosed || busy}
            onClick={() => void handleDoneClosed()}
          >
            Done (Closed)
          </Button>
          {closeBlockedReason ? (
            <p className="text-muted-foreground text-center text-xs">{closeBlockedReason}</p>
          ) : null}
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
