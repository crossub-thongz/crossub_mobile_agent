'use client';

import { CheckCircle2, Lightbulb } from 'lucide-react';

import type { AgentPageGuideContent } from '@/constants/agent-page-guides';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export function AgentPageGuideDialog({
  open,
  guide,
  onDismiss,
  onSkip,
}: {
  open: boolean;
  guide: AgentPageGuideContent;
  onDismiss: () => void;
  onSkip: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onSkip();
      }}
    >
      <DialogContent
        elevated
        className="flex max-h-[min(85vh,720px)] max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <div className="border-border/60 border-b bg-primary/5 px-5 py-4">
          <DialogHeader className="gap-1 text-left">
            <p className="text-primary text-[10px] font-semibold uppercase tracking-[0.2em]">
              {guide.eyebrow}
            </p>
            <DialogTitle className="text-xl">{guide.pageName}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {guide.overview}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            How to use this page
          </p>
          <ol className="mt-3 space-y-2.5">
            {guide.steps.map((step, index) => (
              <li
                key={step.title}
                className={cn(
                  'flex gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-3',
                )}
              >
                <span className="bg-primary/15 text-primary flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{step.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {guide.tips.length > 0 ? (
            <div className="border-primary/15 bg-primary/[0.04] mt-4 rounded-xl border p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Lightbulb className="text-primary size-4 shrink-0" />
                Tips
              </div>
              <ul className="mt-2 space-y-1.5">
                {guide.tips.map((tip) => (
                  <li key={tip} className="text-muted-foreground flex gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 opacity-60" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-border/60 flex-row justify-between gap-2 border-t px-5 py-4">
          <Button type="button" variant="ghost" className="text-muted-foreground" onClick={onSkip}>
            Skip guide
          </Button>
          <Button type="button" onClick={onDismiss}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
