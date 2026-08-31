'use client';

import { useMemo, useRef, useState } from 'react';
import { AtSign } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  buildThreadMentionCandidates,
  detectMentionQuery,
  filterMentionCandidates,
  insertMention,
  type MentionCandidate,
} from '@/lib/message-mentions';
import { AGENT_INPUT_KIND, sanitizeAgentInput } from '@/lib/agent-input-rules';
import { stripEmojis } from '@/lib/strip-emojis';
import { cn } from '@/lib/utils';

export function MessageCompose({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  homeOwnerName,
  tenantName,
  rows = 4,
  variant = 'default',
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  homeOwnerName: string;
  tenantName: string;
  rows?: number;
  variant?: 'default' | 'v2';
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const candidates = useMemo(
    () => buildThreadMentionCandidates({ homeOwnerName, tenantName }),
    [homeOwnerName, tenantName],
  );

  const mentionQuery = useMemo(() => {
    const el = textareaRef.current;
    if (!el) return null;
    return detectMentionQuery(value, el.selectionStart ?? value.length);
  }, [value]);

  const filtered = useMemo(
    () =>
      mentionQuery
        ? filterMentionCandidates(candidates, mentionQuery.query)
        : [],
    [candidates, mentionQuery],
  );

  const showPicker = mentionOpen && mentionQuery != null && filtered.length > 0;

  const applyMention = (mention: MentionCandidate) => {
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? value.length;
    const next = insertMention(value, cursor, mention);
    onChange(next.text);
    setMentionOpen(false);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.cursor, next.cursor);
    });
  };

  const handleChange = (next: string) => {
    onChange(
      sanitizeAgentInput(next, {
        kind: AGENT_INPUT_KIND.MESSAGE,
        allowEmoji: true,
        stripEmojis,
      }),
    );
    const el = textareaRef.current;
    const cursor = el?.selectionStart ?? next.length;
    const query = detectMentionQuery(next, cursor);
    setMentionOpen(query != null);
    setActiveIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPicker) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMention(filtered[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionOpen(false);
        return;
      }
    }

    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-[10px]">
          Type <span className="font-medium">@</span> to tag landlord, tenant, or
          CROSSUB
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => {
            const el = textareaRef.current;
            const cursor = el?.selectionStart ?? value.length;
            const next = `${value.slice(0, cursor)}@${value.slice(cursor)}`;
            onChange(next);
            setMentionOpen(true);
            requestAnimationFrame(() => {
              el?.focus();
              el?.setSelectionRange(cursor + 1, cursor + 1);
            });
          }}
        >
          <AtSign className="size-3.5" />
          Tag
        </Button>
      </div>

      {showPicker && (
        <div className="absolute bottom-full left-0 z-40 mb-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
          {filtered.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              className={cn(
                'flex w-full flex-col items-start px-3 py-2.5 text-left text-sm',
                index === activeIndex ? 'bg-primary/10' : 'hover:bg-secondary',
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                applyMention(candidate);
              }}
            >
              <span className="font-medium">@{candidate.name}</span>
              {candidate.subtitle && (
                <span className="text-muted-foreground text-xs">
                  {candidate.subtitle}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        data-input-kind="message"
        data-allow-emoji
        maxLength={5000}
        placeholder={placeholder}
        value={value}
        rows={rows}
        disabled={disabled}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onClick={() => {
          const el = textareaRef.current;
          if (!el) return;
          const query = detectMentionQuery(value, el.selectionStart ?? value.length);
          setMentionOpen(query != null);
        }}
        className={cn(
          'placeholder:text-muted-foreground w-full resize-none border px-3 py-2 text-sm outline-none',
          variant === 'v2'
            ? 'border-border/50 rounded-xl border bg-transparent focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring/30'
            : 'border-input rounded-md bg-transparent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30',
        )}
      />
    </div>
  );
}
