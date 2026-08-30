import * as React from 'react';

import { bindTextValueWithoutEmojis, propAllowsEmoji, stripEmojis } from '@/lib/strip-emojis';
import { cn } from '@/lib/utils';

function Textarea({
  className,
  ref,
  onChange,
  value,
  defaultValue,
  ...props
}: React.ComponentProps<'textarea'>) {
  const allowEmoji = propAllowsEmoji(props['data-allow-emoji']);
  const textValue = typeof value === 'string' && !allowEmoji ? stripEmojis(value) : value;
  const textDefault =
    typeof defaultValue === 'string' && !allowEmoji ? stripEmojis(defaultValue) : defaultValue;

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
      value={textValue}
      defaultValue={textDefault}
      onChange={allowEmoji ? onChange : bindTextValueWithoutEmojis(onChange)}
    />
  );
}

export { Textarea };
