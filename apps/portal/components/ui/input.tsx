import * as React from 'react';

import { INPUT_TYPE, NUMBER_INPUT_WHEEL_EVENT } from '@/constants/form-input';
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

export type InputProps = React.ComponentProps<'input'> & {
  inputKind?: AgentInputKind;
  'data-allow-emoji'?: boolean | '';
  'data-allow-html'?: boolean | '';
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      onChange,
      onKeyDown,
      value,
      defaultValue,
      inputKind,
      maxLength,
      ...props
    },
    ref,
  ) => {
    const isV2 = useIsAgentUiV2();
    const innerRef = React.useRef<HTMLInputElement | null>(null);
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

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref],
    );

    // ⭐ CRS-0150 — a wheel over a focused number field steps its value with no keystroke.
    // See `constants/form-input.ts` for why this is a native, non-passive listener and not an
    // `onWheel` prop. Only while the field holds focus: scrolling past one must not eat the
    // page's scroll.
    React.useEffect(() => {
      const el = innerRef.current;
      if (!el || type !== INPUT_TYPE.NUMBER) return;
      const swallowWheel = (event: WheelEvent) => {
        if (document.activeElement === el) event.preventDefault();
      };
      el.addEventListener(NUMBER_INPUT_WHEEL_EVENT, swallowWheel, { passive: false });
      return () => el.removeEventListener(NUMBER_INPUT_WHEEL_EVENT, swallowWheel);
    }, [type]);

    return (
      <input
        ref={setRefs}
        type={type}
        className={cn(
          'placeholder:text-muted-foreground border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          className,
        )}
        {...props}
        data-input-kind={inputKind}
        data-allow-emoji={allowEmoji ? true : dataAllowEmoji}
        maxLength={resolvedMaxLength}
        value={textValue}
        defaultValue={textDefault}
        onChange={bindSanitizedTextValue({ kind: inputKind, allowEmoji, allowHtml, onChange })}
        onKeyDown={onKeyDown}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
