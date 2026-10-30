'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';

import {
  flagEmoji,
  PHONE_COUNTRIES,
  phoneCountryMeta,
  type PhoneCountry,
} from '@/lib/registration-mobile';
import { cn } from '@/lib/utils';

export function PhoneCountryField({
  country,
  onCountryChange,
  phoneProps,
  placeholder,
}: {
  country: PhoneCountry;
  onCountryChange: (country: PhoneCountry) => void;
  phoneProps: React.InputHTMLAttributes<HTMLInputElement>;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = phoneCountryMeta(country);
  const needle = query.trim().toLowerCase();
  const options = PHONE_COUNTRIES.filter((item) => {
    if (!needle) return true;
    return (
      item.name.toLowerCase().includes(needle) ||
      item.code.toLowerCase().includes(needle) ||
      item.dial.includes(needle.replace(/\s/g, ''))
    );
  });

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const choose = (code: PhoneCountry) => {
    onCountryChange(code);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          'flex h-12 overflow-hidden rounded-[9px] border bg-white',
          open ? 'border-[#00bd85]' : 'border-[#CED9E4] focus-within:border-[#00bd85]',
        )}
      >
        <button
          type="button"
          className="flex h-full w-[16.75rem] shrink-0 items-center gap-1.5 border-r border-[#CED9E4] pr-2.5 pl-3 text-sm text-[#171E4B]"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            setOpen((value) => !value);
            setQuery('');
          }}
        >
          <span className="text-base leading-none" aria-hidden>
            {flagEmoji(selected.code)}
          </span>
          <span className="font-medium whitespace-nowrap">({selected.code})</span>
          <span className="whitespace-nowrap">{selected.name}</span>
          <span className="font-medium whitespace-nowrap text-[#52647C]">{selected.dial}</span>
          <ChevronDown
            className={cn('ml-auto size-4 text-[#52647C] transition-transform', open && 'rotate-180')}
            aria-hidden
          />
        </button>
        <input
          type="tel"
          autoComplete="tel-national"
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none placeholder:text-[#9AADC0]"
          {...phoneProps}
        />
      </div>

      {open ? (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[min(100%,20rem)] overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_rgba(23,30,75,0.14)] ring-1 ring-[#171E4B]/8">
          <div className="border-b border-[#171E4B]/8 p-2">
            <label className="flex h-10 items-center gap-2 rounded-xl bg-[#F4F6F8] px-3">
              <Search className="size-4 shrink-0 text-[#8AA0B5]" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search country..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9AADC0]"
                aria-label="Search country"
              />
            </label>
          </div>
          <ul id={listId} role="listbox" aria-label="Country code" className="max-h-64 overflow-y-auto p-1.5">
            {options.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-[#8AA0B5]">No countries found</li>
            ) : (
              options.map((item) => {
                const active = item.code === country;
                return (
                  <li key={item.code}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-sm',
                        active ? 'bg-[#F3F6F8]' : 'hover:bg-[#F7F9FB]',
                      )}
                      onClick={() => choose(item.code)}
                    >
                      <span className="text-base leading-none" aria-hidden>
                        {flagEmoji(item.code)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-[#171E4B]">
                        ({item.code}) {item.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-[#52647C]">{item.dial}</span>
                      {active ? <Check className="size-4 shrink-0 text-[#00bd85]" aria-hidden /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
