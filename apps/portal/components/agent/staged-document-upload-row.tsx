'use client';

import { Eye, Loader2, Trash2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StagedUploadFile {
  id: string;
  fileName: string;
  uploadedAt: string;
}

export function StagedDocumentUploadRow({
  label,
  files,
  disabled,
  uploading,
  onUpload,
  onPreview,
  onRemove,
}: {
  label: string;
  files: StagedUploadFile[];
  disabled?: boolean;
  uploading?: boolean;
  onUpload: () => void;
  onPreview?: (file: StagedUploadFile) => void;
  onRemove?: (file: StagedUploadFile) => void;
}) {
  const hasFiles = files.length > 0;

  return (
    <div className="space-y-2 rounded-lg border border-primary/15 bg-primary/[0.02] px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        {!hasFiles ? (
          <Button
            type="button"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 shrink-0 text-xs"
            disabled={disabled || uploading}
            onClick={onUpload}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            <span className="ml-1">Upload</span>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-primary/40 text-primary hover:bg-primary/10 h-8 shrink-0 text-xs"
            disabled={disabled || uploading}
            onClick={onUpload}
          >
            {uploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            <span className="ml-1">Add more</span>
          </Button>
        )}
      </div>

      {!hasFiles ? (
        <p className="text-muted-foreground text-xs">Not uploaded</p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/80 px-2 py-1.5"
            >
              <p className="min-w-0 truncate text-xs font-medium">{file.fileName}</p>
              <div className="flex shrink-0 items-center gap-1">
                {onPreview ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn('h-7 px-2 text-xs')}
                    disabled={disabled}
                    onClick={() => onPreview(file)}
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </Button>
                ) : null}
                {onRemove ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive h-7 px-2 text-xs"
                    disabled={disabled}
                    onClick={() => onRemove(file)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
