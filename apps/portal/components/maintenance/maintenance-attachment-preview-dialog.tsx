'use client';

import { Download, FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ApiMaintenanceAttachment } from '@/lib/crossub-api/types';

export function maintenanceAttachmentPreviewUrl(att: ApiMaintenanceAttachment): string {
  return att.previewUrl ?? `/api/maintenance/attachments/${att.id}/preview`;
}

export function MaintenanceAttachmentPreviewDialog({
  attachment,
  onClose,
}: {
  attachment: ApiMaintenanceAttachment | null;
  onClose: () => void;
}) {
  if (!attachment) return null;

  const preview = maintenanceAttachmentPreviewUrl(attachment);
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
