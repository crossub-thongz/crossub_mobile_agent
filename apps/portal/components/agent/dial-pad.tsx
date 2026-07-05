'use client';

import { useEffect, useRef } from 'react';
import { Delete, PhoneCall } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const DIAL_KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
] as const;

const DIAL_CHARS = new Set(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '#']);

function sanitizeDialInput(raw: string): string {
  return raw.replace(/[^\d*#+]/g, '');
}

export interface DialPadProps {
  value: string;
  onChange: (value: string) => void;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onCall: () => void;
  className?: string;
  listenToKeyboard?: boolean;
}

export function DialPad({
  value,
  onChange,
  onDigit,
  onBackspace,
  onClear,
  onCall,
  className,
  listenToKeyboard = true,
}: DialPadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!listenToKeyboard) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (value.trim()) onCall();
        return;
      }
      if (event.key === 'Backspace') {
        event.preventDefault();
        onBackspace();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClear();
        return;
      }
      if (DIAL_CHARS.has(event.key)) {
        event.preventDefault();
        onDigit(event.key);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [listenToKeyboard, onBackspace, onCall, onClear, onDigit, value]);

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div className="from-muted/40 shrink-0 border-b bg-gradient-to-b to-transparent px-4 pt-4 pb-3">
        <label className="sr-only" htmlFor="dial-pad-number">
          Phone number
        </label>
        <input
          ref={inputRef}
          id="dial-pad-number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          onChange={(e) => onChange(sanitizeDialInput(e.target.value))}
          placeholder="Enter number"
          aria-label="Phone number"
          className={cn(
            'w-full border-0 bg-transparent text-center font-mono tabular-nums outline-none ring-0 placeholder:text-muted-foreground/70 focus:ring-0',
            value
              ? 'text-foreground text-3xl font-medium tracking-[0.12em]'
              : 'text-muted-foreground text-lg',
          )}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-end px-4 pt-3 pb-5">
        <div className="grid w-full max-w-[264px] grid-cols-3 gap-x-3 gap-y-1">
          {DIAL_KEYS.map(({ digit, letters }) => (
            <button
              key={digit}
              type="button"
              onClick={() => onDigit(digit)}
              className="group bg-muted/50 text-foreground hover:bg-muted flex h-[58px] flex-col items-center justify-center rounded-full transition-colors active:scale-95"
            >
              <span className="text-[22px] leading-none font-normal">{digit}</span>
              {letters ? (
                <span className="text-muted-foreground mt-0.5 text-[9px] font-medium tracking-[0.2em]">
                  {letters}
                </span>
              ) : (
                <span className="mt-0.5 h-[11px]" aria-hidden />
              )}
            </button>
          ))}
        </div>

        <div className="mt-5 flex w-full max-w-[264px] items-center justify-between px-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={!value}
            className="text-muted-foreground h-9 min-w-[4.5rem] text-xs"
          >
            Clear
          </Button>

          <button
            type="button"
            onClick={onCall}
            disabled={!value.trim()}
            aria-label="Place call"
            className="flex size-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-600/25 transition-transform hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
          >
            <PhoneCall className="size-6" />
          </button>

          <button
            type="button"
            onClick={onBackspace}
            disabled={!value}
            aria-label="Delete last digit"
            className="text-muted-foreground hover:bg-muted/60 hover:text-foreground flex h-9 min-w-[4.5rem] items-center justify-center rounded-lg transition-colors disabled:opacity-40"
          >
            <Delete className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
