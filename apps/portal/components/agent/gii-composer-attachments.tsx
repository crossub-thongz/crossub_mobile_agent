'use client';

import { useRef } from 'react';
import { FileText, Paperclip, X } from 'lucide-react';

import type { GiiPendingAttachment } from '@/lib/gii-attachments';
import { cn } from '@/lib/utils';

export function GiiAttachmentPreviewRow({
  attachments,
  onRemove,
  disabled,
}: {
  attachments: GiiPendingAttachment[];
  onRemove: (id: string) => void;
  disabled?: boolean;
}) {
  if (attachments.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((att) => {
        const isImage = att.file.type.startsWith('image/');
        return (
          <div
            key={att.id}
            className="bg-secondary/60 flex max-w-[140px] items-center gap-2 rounded-xl border border-border/70 px-2 py-1.5"
          >
            {isImage && att.previewUrl ? (
              <img
                src={att.previewUrl}
                alt=""
                className="size-8 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                <FileText className="text-muted-foreground size-4" />
              </div>
            )}
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
              {att.file.name}
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(att.id)}
              className="text-muted-foreground hover:text-foreground flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-background/80 disabled:opacity-50"
              aria-label={`Remove ${att.file.name}`}
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function GiiAttachButton({
  onPick,
  disabled,
  className,
}: {
  onPick: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="sr-only"
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length) onPick(files);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'text-muted-foreground hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-full border border-border/80 bg-secondary/40 transition hover:bg-secondary disabled:opacity-50',
          className,
        )}
        aria-label="Add attachment"
      >
        <Paperclip className="size-4" />
      </button>
    </>
  );
}

export function GiiComposerDropOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[1px]">
      <p className="text-primary text-sm font-semibold">Drop files to attach</p>
    </div>
  );
}
