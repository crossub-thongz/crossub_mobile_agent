'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileText, ImagePlus, Loader2, Play, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  deleteMaintenanceAttachment,
  uploadMaintenanceAttachment,
} from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import { fileToBase64 } from '@/lib/file-upload';
import { cn } from '@/lib/utils';

export const MAINTENANCE_MAX_INITIAL_EVIDENCE_UPLOADS = 8;

function attachmentPreviewUrl(att: ApiMaintenanceAttachment): string {
  return att.previewUrl ?? `/api/maintenance/attachments/${att.id}/preview`;
}

function isReviewEvidenceAttachment(att: ApiMaintenanceAttachment): boolean {
  return att.kind === 'initial_evidence';
}

export function MaintenanceReviewEvidencePanel({
  requestId,
  title,
  description,
  attachments,
  canManage,
  apiConnected,
  onUpdated,
}: {
  requestId: string;
  title?: string | null;
  description: string;
  attachments: ApiMaintenanceAttachment[];
  canManage: boolean;
  apiConnected: boolean;
  onUpdated?: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const evidenceAttachments = useMemo(
    () => attachments.filter((a) => a.maintenanceRequestId === requestId && isReviewEvidenceAttachment(a)),
    [attachments, requestId],
  );

  useEffect(() => {
    if (!canManage && evidenceAttachments.length > 0) {
      setExpanded(true);
    }
  }, [canManage, evidenceAttachments.length, requestId]);

  const issueType =
    title?.trim() && title.trim() !== description.trim() ? title.trim() : null;
  const maxReached = evidenceAttachments.length >= MAINTENANCE_MAX_INITIAL_EVIDENCE_UPLOADS;

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length || !canManage || !apiConnected) return;

    const remaining = MAINTENANCE_MAX_INITIAL_EVIDENCE_UPLOADS - evidenceAttachments.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAINTENANCE_MAX_INITIAL_EVIDENCE_UPLOADS} photo/video uploads`);
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    if (files.length > selected.length) {
      toast.error(`Only ${MAINTENANCE_MAX_INITIAL_EVIDENCE_UPLOADS} total uploads are allowed`);
    }

    setUploading(true);
    try {
      for (const file of selected) {
        const mime = file.type || 'image/jpeg';
        if (!mime.startsWith('image/') && !mime.startsWith('video/') && mime !== 'application/pdf') {
          toast.error(`${file.name} must be a photo, video, or PDF`);
          continue;
        }
        const contentBase64 = await fileToBase64(file);
        await uploadMaintenanceAttachment({
          maintenanceRequestId: requestId,
          kind: 'initial_evidence',
          fileName: file.name,
          mimeType: mime,
          sizeBytes: file.size,
          contentBase64,
        });
      }
      toast.success('Attachment uploaded');
      await onUpdated?.();
    } catch {
      toast.error('Upload failed — try again');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!canManage || !apiConnected) return;
    setDeletingId(attachmentId);
    try {
      await deleteMaintenanceAttachment(attachmentId);
      toast.success('Attachment removed');
      await onUpdated?.();
    } catch {
      toast.error('Could not remove attachment');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <section className="rounded-xl border bg-card p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Problem description
        </p>
        {issueType ? <p className="mt-2 text-sm font-semibold">{issueType}</p> : null}
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed whitespace-pre-wrap">
          {description.trim() || 'No description provided.'}
        </p>
      </section>

      <section className="rounded-xl border bg-card p-4">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 text-left"
          onClick={() => setExpanded((open) => !open)}
        >
          <span className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Photo / video uploaded
            </p>
            <p className="text-muted-foreground mt-1 text-xs tabular-nums">
              {evidenceAttachments.length} item{evidenceAttachments.length === 1 ? '' : 's'}
            </p>
          </span>
          <ChevronDown
            className={cn(
              'text-muted-foreground size-4 shrink-0 transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {expanded ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Attachments
              </p>
              <span className="text-muted-foreground text-[10px] tabular-nums">
                {evidenceAttachments.length}/{MAINTENANCE_MAX_INITIAL_EVIDENCE_UPLOADS}
              </span>
            </div>

            {canManage ? (
              <label
                className={cn(
                  'inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold transition-colors',
                  uploading || maxReached
                    ? 'text-muted-foreground cursor-not-allowed opacity-60'
                    : 'text-muted-foreground hover:bg-secondary/40',
                )}
              >
                {uploading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="size-3.5" />
                )}
                {uploading ? 'Uploading…' : 'Add photo / video'}
                <input
                  type="file"
                  multiple
                  accept="application/pdf,image/*,video/*"
                  className="hidden"
                  disabled={uploading || maxReached || !apiConnected}
                  onChange={(e) => {
                    void handleUpload(e.target.files);
                    e.target.value = '';
                  }}
                />
              </label>
            ) : null}

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {evidenceAttachments.length === 0 ? (
                <p className="text-muted-foreground col-span-full text-xs">
                  {canManage
                    ? 'No photos or videos yet. Use Add photo / video above.'
                    : 'No photos or videos uploaded.'}
                </p>
              ) : (
                evidenceAttachments.map((att) => {
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
                          <img
                            src={preview}
                            alt={att.fileName}
                            className="size-full object-cover"
                          />
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
                      {canManage ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="absolute top-1 right-1 size-6 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                          disabled={deletingId === att.id || uploading}
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
                })
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
