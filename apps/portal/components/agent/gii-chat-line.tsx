'use client';

import { Sparkles } from 'lucide-react';

import type { GiiChatAttachmentView } from '@/lib/gii-attachments';
import { cn } from '@/lib/utils';

function AttachmentPreview({ attachments }: { attachments: GiiChatAttachmentView[] }) {
  if (!attachments.length) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      {attachments.map((att) =>
        att.previewUrl ? (
          <img
            key={att.fileName}
            src={att.previewUrl}
            alt={att.fileName}
            className="max-h-24 max-w-full rounded-lg border border-white/20 object-cover"
          />
        ) : (
          <span
            key={att.fileName}
            className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-medium"
          >
            {att.fileName}
          </span>
        ),
      )}
    </div>
  );
}

export function GiiChatLine({
  role,
  text,
  pending,
  attachments,
  className,
}: {
  role: 'user' | 'assistant';
  text: string;
  pending?: boolean;
  attachments?: GiiChatAttachmentView[];
  className?: string;
}) {
  if (role === 'user') {
    return (
      <div className={cn('flex w-full justify-end', className)}>
        <div
          className={cn(
            'max-w-[92%] rounded-2xl bg-primary px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground',
            pending && 'animate-pulse opacity-80',
          )}
        >
          {attachments?.length ? <AttachmentPreview attachments={attachments} /> : null}
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex w-full justify-start', className)}>
      <div className="max-w-[92%]">
        <p className="text-violet-700 dark:text-violet-300 mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase">
          <Sparkles className="size-3 shrink-0" aria-hidden />
          Gii
        </p>
        <div
          className={cn(
            'rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-background to-emerald-500/10 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-foreground shadow-sm',
            pending && 'text-muted-foreground animate-pulse',
          )}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

export function GiiChatGreeting({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn('flex w-full justify-start', className)}>
      <div className="max-w-[92%]">
        <p className="text-violet-700 dark:text-violet-300 mb-1 flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase">
          <Sparkles className="size-3 shrink-0" aria-hidden />
          Gii
        </p>
        <p className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/8 to-emerald-500/8 px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap text-foreground">
          {text}
        </p>
      </div>
    </div>
  );
}
