'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, FileText, ImagePlus, Loader2, Play, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  deleteMaintenanceAttachment,
  setMaintenanceCompletionEvidence,
  setMaintenanceInvoiceUploaded,
  setMaintenanceTenantApproval,
  uploadMaintenanceAttachment,
} from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import {
  closeMaintenanceCase,
  confirmMaintenanceGatesComplete,
} from '@/lib/maintenance/maintenance-case-ops';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import { fileToBase64 } from '@/lib/file-upload';
import { cn } from '@/lib/utils';

const MAX_COMPLETION_EVIDENCE = 8;

function attachmentPreviewUrl(att: ApiMaintenanceAttachment): string {
  return att.previewUrl ?? `/api/maintenance/attachments/${att.id}/preview`;
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

  const requestId = ctx.item.id;
  const status = ctx.workspaceCase.status;
  const responsibility = ctx.workspaceCase.responsibility;
  const isStrata = responsibility === 'strata';
  const isClosed = status === 'closed';
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';
  const canEdit = apiConnected && !isClosed && (isInProgress || isCompleted);

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

  const gatesComplete =
    Boolean(ctx.workspaceCase.completionEvidenceUploaded) &&
    Boolean(ctx.workspaceCase.tenantApprovalReceived) &&
    Boolean(ctx.workspaceCase.invoiceUploaded);

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

  const handleConfirmCompletion = async () => {
    if (!gatesComplete || !isInProgress) return;
    setBusy(true);
    try {
      await confirmMaintenanceGatesComplete(requestId);
      toast.success('Completion confirmed');
      await onUpdated?.();
    } catch {
      toast.error('Could not confirm completion');
    } finally {
      setBusy(false);
    }
  };

  const handleCloseJob = async () => {
    if (!gatesComplete || !isCompleted) return;
    setBusy(true);
    try {
      await closeMaintenanceCase(requestId);
      toast.success('Job closed');
      await onUpdated?.();
    } catch {
      toast.error('Could not close job');
    } finally {
      setBusy(false);
    }
  };

  const gateTitle =
    isStrata && isCompleted
      ? 'Completed'
      : isStrata
        ? 'Strata responsibility gates'
        : isCompleted
          ? 'Completed'
          : 'Completion gates';

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {gateTitle}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {isStrata
            ? 'Upload evidence requested from strata, then confirm each gate to advance.'
            : 'Upload required evidence, check all gates, then confirm to advance.'}
        </p>
      </div>

      <div className="space-y-3">
        {/* Gate 1 — completion evidence */}
        <div className="rounded-lg border bg-background p-3">
          <label
            className={cn(
              'flex items-start justify-between gap-3',
              !canEdit && 'cursor-default',
            )}
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                className="mt-0.5 rounded"
                checked={Boolean(ctx.workspaceCase.completionEvidenceUploaded)}
                disabled={!canEdit || busy}
                onChange={(e) =>
                  void runGateUpdate(
                    () => setMaintenanceCompletionEvidence(requestId, e.target.checked),
                    e.target.checked
                      ? 'Completion evidence marked uploaded'
                      : 'Completion evidence unchecked',
                  )
                }
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  ctx.workspaceCase.completionEvidenceUploaded && 'line-through opacity-60',
                )}
              >
                Completion evidence uploaded
              </span>
            </span>
            {ctx.workspaceCase.completionEvidenceUploaded ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            ) : null}
          </label>

          {isInProgress && canEdit ? (
            <div className="mt-3 space-y-2">
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
            </div>
          ) : null}

          <AttachmentGrid attachments={evidenceAttachments} canDelete={canEdit && !busy} onDelete={onUpdated} />
        </div>

        {/* Gate 2 — tenant sign-off */}
        <div className="rounded-lg border bg-background p-3">
          <label
            className={cn(
              'flex items-start justify-between gap-3',
              !canEdit && 'cursor-default',
            )}
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                className="mt-0.5 rounded"
                checked={Boolean(ctx.workspaceCase.tenantApprovalReceived)}
                disabled={!canEdit || busy}
                onChange={(e) =>
                  void runGateUpdate(
                    () => setMaintenanceTenantApproval(requestId, e.target.checked),
                    e.target.checked
                      ? 'Tenant sign-off recorded'
                      : 'Tenant sign-off cleared',
                  )
                }
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  ctx.workspaceCase.tenantApprovalReceived && 'line-through opacity-60',
                )}
              >
                Tenant sign-off received
              </span>
            </span>
            {ctx.workspaceCase.tenantApprovalReceived ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            ) : null}
          </label>
        </div>

        {/* Gate 3 — invoice */}
        <div className="rounded-lg border bg-background p-3">
          <label
            className={cn(
              'flex items-start justify-between gap-3',
              !canEdit && 'cursor-default',
            )}
          >
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                className="mt-0.5 rounded"
                checked={Boolean(ctx.workspaceCase.invoiceUploaded)}
                disabled={!canEdit || busy}
                onChange={(e) =>
                  void runGateUpdate(
                    () => setMaintenanceInvoiceUploaded(requestId, e.target.checked),
                    e.target.checked ? 'Invoice marked uploaded' : 'Invoice unchecked',
                  )
                }
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  ctx.workspaceCase.invoiceUploaded && 'line-through opacity-60',
                )}
              >
                Invoice uploaded
              </span>
            </span>
            {ctx.workspaceCase.invoiceUploaded ? (
              <CheckCircle2 className="size-4 shrink-0 text-green-500" />
            ) : null}
          </label>

          {(isInProgress || isCompleted) && canEdit ? (
            <div className="mt-3 space-y-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary/40">
                Choose file
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => setPendingInvoiceFile(e.target.files?.[0] ?? null)}
                />
              </label>
              {pendingInvoiceFile ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground max-w-[160px] truncate text-xs">
                    {pendingInvoiceFile.name}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={uploadingInvoice}
                    onClick={() => void handleInvoiceUpload()}
                  >
                    {uploadingInvoice ? 'Uploading…' : 'Confirm upload'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPendingInvoiceFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          <AttachmentGrid attachments={invoiceAttachments} canDelete={canEdit && !busy} onDelete={onUpdated} />
        </div>
      </div>

      {isInProgress ? (
        <Button
          type="button"
          className="w-full"
          disabled={!gatesComplete || busy}
          onClick={() => void handleConfirmCompletion()}
        >
          Confirm completion
        </Button>
      ) : null}

      {isCompleted ? (
        <Button
          type="button"
          className="w-full"
          disabled={!gatesComplete || busy}
          onClick={() => void handleCloseJob()}
        >
          Mark as closed
        </Button>
      ) : null}

      {isClosed ? (
        <div className="flex items-center justify-center gap-2 py-2 text-center text-sm text-green-600">
          <CheckCircle2 className="size-5" />
          <span className="font-medium">Job closed — all gates passed</span>
        </div>
      ) : null}
    </section>
  );
}

function AttachmentGrid({
  attachments,
  canDelete,
  onDelete,
}: {
  attachments: ApiMaintenanceAttachment[];
  canDelete: boolean;
  onDelete?: () => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (attachments.length === 0) return null;

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
    <div className="mt-3 grid grid-cols-4 gap-1.5">
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
              className="relative flex aspect-square w-full overflow-hidden rounded-md border bg-muted hover:bg-secondary/20"
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={att.fileName} className="size-full object-cover" />
              ) : isVideo ? (
                <div className="flex size-full items-center justify-center">
                  <Play className="text-muted-foreground size-4" />
                </div>
              ) : (
                <div className="flex size-full items-center justify-center">
                  <FileText className="text-muted-foreground/50 size-4" />
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
