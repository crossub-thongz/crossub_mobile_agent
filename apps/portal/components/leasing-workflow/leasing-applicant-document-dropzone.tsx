'use client';

import { useCallback, useRef, useState } from 'react';
import { FileUp, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx';

function mergeFiles(existing: File[], incoming: FileList | File[]): File[] {
  const keys = new Set(existing.map((file) => `${file.name}:${file.size}`));
  const merged = [...existing];
  for (const file of Array.from(incoming)) {
    const key = `${file.name}:${file.size}`;
    if (keys.has(key)) continue;
    keys.add(key);
    merged.push(file);
  }
  return merged;
}

export function LeasingApplicantDocumentDropzone({
  files,
  onFilesChange,
  disabled = false,
  compact = false,
  label = 'Drag application documents here',
  description = 'PDF, Word, or images · multiple files supported',
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  compact?: boolean;
  label?: string;
  description?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | File[] | null) => {
      if (!incoming || disabled) return;
      onFilesChange(mergeFiles(files, incoming));
    },
    [disabled, files, onFilesChange],
  );

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (disabled) return;
          addFiles(event.dataTransfer.files);
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-center transition-colors',
          compact ? 'px-3 py-4' : 'px-4 py-8',
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/30',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <div
          className={cn(
            'bg-background flex items-center justify-center rounded-full border',
            compact ? 'size-8' : 'size-10',
          )}
        >
          <Upload className={cn('text-muted-foreground', compact ? 'size-3.5' : 'size-4')} />
        </div>
        <p className={cn('mt-2 font-medium', compact ? 'text-[11px]' : 'text-sm')}>{label}</p>
        <p className={cn('text-muted-foreground mt-0.5', compact ? 'text-[10px]' : 'text-xs')}>
          {description}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('pointer-events-none mt-3', compact ? 'h-7 text-[10px]' : 'h-8 text-xs')}
          tabIndex={-1}
        >
          Browse files
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        accept={ACCEPTED_TYPES}
        disabled={disabled}
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = '';
        }}
      />

      {files.length > 0 ? (
        <ul className="space-y-1">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="bg-muted/30 flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <FileUp className="text-muted-foreground size-3.5 shrink-0" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground shrink-0"
                onClick={(event) => {
                  event.stopPropagation();
                  removeFile(index);
                }}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
