'use client';

import { useMemo, useState } from 'react';
import { FileText, Play } from 'lucide-react';

import { maintenanceSourceLabel } from '@/lib/maintenance/maintenance-source-labels';
import type { MaintenanceWorkflowContext } from '@/lib/maintenance/agent-workflow-model';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';
import { formatDateTime } from '@/lib/utils';

function attachmentPreviewUrl(att: ApiMaintenanceAttachment): string {
  return att.previewUrl ?? `/api/maintenance/attachments/${att.id}/preview`;
}

function IntakeEvidenceGrid({
  attachments,
}: {
  attachments: ApiMaintenanceAttachment[];
}) {
  const [previewAttachment, setPreviewAttachment] = useState<ApiMaintenanceAttachment | null>(null);

  if (attachments.length === 0) {
    return <p className="text-muted-foreground text-xs">No intake photos or videos uploaded.</p>;
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
        {attachments.map((att) => {
          const previewUrl = attachmentPreviewUrl(att);
          const isImage = att.mimeType.startsWith('image/');
          const isVideo = att.mimeType.startsWith('video/');

          return (
            <button
              key={att.id}
              type="button"
              onClick={() => setPreviewAttachment(att)}
              className="relative h-14 overflow-hidden rounded-md border bg-muted text-left hover:bg-secondary/20"
              title={att.fileName}
            >
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={att.fileName} className="h-full w-full object-cover" />
              ) : isVideo ? (
                <div className="flex h-full flex-col items-center justify-center gap-0.5 bg-black/80">
                  <Play className="size-4 text-white" />
                  <span className="text-muted-foreground line-clamp-1 px-1 text-[9px] text-white/80">
                    {att.fileName}
                  </span>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-0.5 px-1">
                  <FileText className="text-muted-foreground/60 size-4" />
                  <span className="text-muted-foreground line-clamp-2 text-[9px]">{att.fileName}</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {previewAttachment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setPreviewAttachment(null)}
          role="presentation"
        >
          <div
            className="max-h-[90vh] max-w-3xl overflow-auto rounded-lg bg-background p-2"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            {previewAttachment.mimeType.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={attachmentPreviewUrl(previewAttachment)}
                alt={previewAttachment.fileName}
                className="max-h-[80vh] w-full object-contain"
              />
            ) : previewAttachment.mimeType.startsWith('video/') ? (
              <video
                src={attachmentPreviewUrl(previewAttachment)}
                controls
                className="max-h-[80vh] w-full"
              />
            ) : (
              <iframe
                src={attachmentPreviewUrl(previewAttachment)}
                title={previewAttachment.fileName}
                className="h-[80vh] w-full min-w-[min(90vw,640px)]"
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

export function MaintenanceJobIntakeSummary({
  ctx,
  attachments = [],
}: {
  ctx: MaintenanceWorkflowContext;
  attachments?: ApiMaintenanceAttachment[];
}) {
  const tenant = ctx.workspaceCase.tenant;
  const description = ctx.workspaceCase.description.trim();

  const intakeAttachments = useMemo(
    () =>
      attachments.filter(
        (att) => att.maintenanceRequestId === ctx.item.id && att.kind === 'initial_evidence',
      ),
    [attachments, ctx.item.id],
  );

  return (
    <section className="rounded-xl border bg-card p-4">
      <p className="mb-2 text-sm font-semibold">Job intake</p>
      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Created by</dt>
          <dd className="font-medium">{maintenanceSourceLabel(ctx.workspaceCase.source)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Date &amp; time created</dt>
          <dd className="font-medium">{formatDateTime(ctx.workspaceCase.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Tenant contact</dt>
          <dd className="font-medium">{tenant?.name?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Phone</dt>
          <dd className="font-medium">{tenant?.phone?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-medium break-words">{tenant?.email?.trim() || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Issue type</dt>
          <dd className="font-medium">{ctx.workspaceCase.issueType}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Order number</dt>
          <dd className="text-primary font-medium tabular-nums">{ctx.workspaceCase.caseRef}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Description</dt>
          <dd className="mt-1 font-medium whitespace-pre-wrap">
            {description || 'No description provided.'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t pt-4">
        <p className="text-muted-foreground mb-2 text-[10px] font-semibold uppercase tracking-wide">
          Intake photos &amp; videos
          {intakeAttachments.length > 0 ? ` (${intakeAttachments.length})` : ''}
        </p>
        <IntakeEvidenceGrid attachments={intakeAttachments} />
      </div>
    </section>
  );
}
