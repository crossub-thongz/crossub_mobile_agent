import * as React from 'react';

import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import {
  AGENT_INPUT_RULES,
  type AgentInputKind,
  sanitizeAgentInput,
} from '@/lib/agent-input-rules';
import {
  bindSanitizedTextValue,
  propAllowsEmoji,
  propAllowsHtml,
  stripEmojis,
} from '@/lib/strip-emojis';
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
  value,
  defaultValue,
  inputKind,
  maxLength,
  ...props
}: TextareaProps) {
  const isV2 = useIsAgentUiV2();
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

  return (
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
      defaultValue={textDefault}
      onChange={bindSanitizedTextValue({ kind: inputKind, allowEmoji, allowHtml, onChange })}
      onKeyDown={(event) => {
        if (rule && !rule.allowLineBreaks && event.key === 'Enter') {
          event.preventDefault();
        }
        onKeyDown?.(event);
      }}
    />
  );
}

export { Textarea };
