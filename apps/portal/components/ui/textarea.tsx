'use client';

import * as React from 'react';

import { AgentInputHint } from '@/components/ui/agent-input-feedback';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import {
  AGENT_INPUT_RULES,
  type AgentInputKind,
  agentInputViolationMessages,
  sanitizeAgentInput,
} from '@/lib/agent-input-rules';
import { propAllowsEmoji, propAllowsHtml, stripEmojis } from '@/lib/strip-emojis';
import { cn } from '@/lib/utils';

export type TextareaProps = React.ComponentProps<'textarea'> & {
  inputKind?: AgentInputKind;
  'data-allow-emoji'?: boolean | '';
  'data-allow-html'?: boolean | '';
};

function Textarea({
  className,
  ref,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  value,
  defaultValue,
  inputKind,
  maxLength,
  ...props
}: TextareaProps) {
  const isV2 = useIsAgentUiV2();
  const [focused, setFocused] = React.useState(false);
  const [notices, setNotices] = React.useState<string[]>([]);
  const rule = inputKind ? AGENT_INPUT_RULES[inputKind] : undefined;
  const dataAllowEmoji = props['data-allow-emoji'];
  const dataAllowHtml = props['data-allow-html'];
  const allowEmoji = rule ? rule.allowEmoji : !isV2 || propAllowsEmoji(dataAllowEmoji);
  const allowHtml = propAllowsHtml(dataAllowHtml);
  const resolvedMaxLength = maxLength ?? rule?.maxLength;
  const sanitize = (raw: string) =>
    sanitizeAgentInput(raw, { kind: inputKind, allowEmoji, allowHtml, stripEmojis });
  const textValue = typeof value === 'string' ? sanitize(value) : value;
  const textDefault =
    typeof defaultValue === 'string' ? sanitize(defaultValue) : defaultValue;
  const showHint = isV2 && !!inputKind && (focused || notices.length > 0);

  const field = (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        'placeholder:text-muted-foreground border-input flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
      data-input-kind={inputKind}
      data-allow-emoji={allowEmoji ? true : dataAllowEmoji}
      maxLength={resolvedMaxLength}
      value={textValue}
      defaultValue={value === undefined ? textDefault : undefined}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      onChange={(event) => {
        const raw = event.target.value;
        const next = sanitize(raw);
        const nextNotices =
          raw === next
            ? []
            : agentInputViolationMessages(raw, {
                kind: inputKind,
                allowHtml,
                allowEmoji,
                stripEmojis,
              });
        setNotices((prev) =>
          prev.length === nextNotices.length && prev.every((item, i) => item === nextNotices[i])
            ? prev
            : nextNotices,
        );
        onChange?.(event);
      }}
      onKeyDown={(event) => {
        if (rule && !rule.allowLineBreaks && event.key === 'Enter') {
          event.preventDefault();
          setNotices(['Line breaks are not allowed — use one line']);
        }
        onKeyDown?.(event);
      }}
    />
  );

  if (!isV2 || !inputKind) return field;

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1',
        className?.includes('flex-1') ? 'flex-1' : 'w-full',
      )}
    >
      {field}
      {showHint ? (
        <AgentInputHint
          kind={inputKind}
          notices={notices}
          focused={focused}
          value={typeof textValue === 'string' ? textValue : ''}
        />
      ) : null}
    </div>
  );
}

export { Textarea };
