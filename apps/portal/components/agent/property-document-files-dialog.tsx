'use client';

import { Eye, FileText, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DocumentChecklistFile, DocumentChecklistRow } from '@/lib/property-create-document-groups';
import { isViewableDocumentUrl } from '@/lib/document-preview';
import { formatDateTime } from '@/lib/utils';

export function PropertyDocumentFilesDialog({
  row,
  propertyAddress,
  open,
  onClose,
  onPreview,
  onDelete,
  deletingId,
}: {
  row: DocumentChecklistRow | null;
  propertyAddress: string;
  open: boolean;
  onClose: () => void;
  onPreview: (file: DocumentChecklistFile, typeTitle: string) => void;
  onDelete?: (file: DocumentChecklistFile) => void;
  deletingId?: string | null;
}) {
  const fileCount = row?.files.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{row?.title ?? 'Documents'}</DialogTitle>
          <DialogDescription className="text-xs">
            {propertyAddress}
            {fileCount > 0
              ? ` · ${fileCount} document${fileCount === 1 ? '' : 's'} uploaded`
              : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border">
          {!row?.files.length ? (
            <div className="flex min-h-[160px] flex-col items-center justify-center p-6 text-center">
              <FileText className="text-muted-foreground mb-2 size-8" />
              <p className="text-muted-foreground text-sm">No files uploaded</p>
            </div>
          ) : (
            <ul className="divide-y">
              {row.files.map((file, index) => {
                const canPreview = isViewableDocumentUrl(file.href);
                const canDelete = Boolean(file.deletable && onDelete);
                const deleting = deletingId === file.id;

                return (
                  <li key={file.id}>
                    <div className="flex items-center gap-1 pr-1">
                      {canPreview ? (
                        <button
                          type="button"
                          onClick={() => onPreview(file, row.title)}
                          disabled={deleting}
                          className="hover:bg-muted/50 flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left disabled:opacity-50"
                        >
                          <Eye className="text-primary size-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{file.fileName}</p>
                            <p className="text-muted-foreground text-[11px] tabular-nums">
                              {formatDateTime(file.uploadedAt)}
                              {index === 0 ? ' · Latest' : ''}
                            </p>
                          </div>
                        </button>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5">
                          <FileText className="text-muted-foreground size-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{file.fileName}</p>
                            <p className="text-muted-foreground text-[11px] tabular-nums">
                              {formatDateTime(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                      )}

                      {canDelete ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8 shrink-0"
                          disabled={deleting || deletingId != null}
                          aria-label={`Delete ${file.fileName}`}
                          onClick={() => onDelete?.(file)}
                        >
                          {deleting ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Preview opens as a second dialog on top */}
    </Dialog>
  );
}
