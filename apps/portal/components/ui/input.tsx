import * as React from 'react';

import { INPUT_TYPE, NUMBER_INPUT_WHEEL_EVENT } from '@/constants/form-input';
import { bindTextValueWithoutEmojis, propAllowsEmoji, stripEmojis } from '@/lib/strip-emojis';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, onChange, value, defaultValue, ...props }, ref) => {
    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const allowEmoji = propAllowsEmoji(props['data-allow-emoji']);
    const textValue = typeof value === 'string' && !allowEmoji ? stripEmojis(value) : value;
    const textDefault =
      typeof defaultValue === 'string' && !allowEmoji ? stripEmojis(defaultValue) : defaultValue;

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
        value={textValue}
        defaultValue={textDefault}
        onChange={allowEmoji ? onChange : bindTextValueWithoutEmojis(onChange)}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
