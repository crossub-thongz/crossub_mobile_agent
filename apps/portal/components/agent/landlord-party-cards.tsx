'use client';

import { useState } from 'react';
import { MoreVertical, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  emptyPartyContact,
  ensureExactlyOnePrimary,
  setPrimaryParty,
} from '@/lib/property-parties';
import type { PropertyPartyContact } from '@/lib/types';
import { cn } from '@/lib/utils';

const menuItemClass =
  'hover:bg-muted/60 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors';

function LandlordCardMenu({
  index,
  isPrimary,
  canRemove,
  disabled,
  onSetPrimary,
  onRemove,
}: {
  index: number;
  isPrimary: boolean;
  canRemove: boolean;
  disabled?: boolean;
  onSetPrimary: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground size-8 shrink-0"
          disabled={disabled}
          aria-label={`Landlord ${index + 1} actions`}
        >
          <MoreVertical className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <button
          type="button"
          className={cn(menuItemClass, isPrimary && 'text-muted-foreground')}
          disabled={isPrimary}
          onClick={() => {
            onSetPrimary();
            setOpen(false);
          }}
        >
          Set as primary
        </button>
        {canRemove ? (
          <button
            type="button"
            className={cn(menuItemClass, 'text-destructive')}
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
          >
            Remove landlord
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function LandlordPartyCards({
  parties,
  onChange,
  disabled,
}: {
  parties: PropertyPartyContact[];
  onChange: (parties: PropertyPartyContact[]) => void;
  disabled?: boolean;
}) {
  const landlords =
    parties.length > 0
      ? ensureExactlyOnePrimary(parties)
      : [emptyPartyContact({ isPrimary: true })];

  const updateParty = (index: number, field: 'name' | 'email' | 'phone', value: string) => {
    onChange(landlords.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const removeParty = (index: number) => {
    if (landlords.length <= 1) {
      onChange([emptyPartyContact({ isPrimary: true })]);
      return;
    }
    onChange(ensureExactlyOnePrimary(landlords.filter((_, i) => i !== index)));
  };

  return (
    <div className="space-y-3">
      {landlords.map((party, index) => (
        <article
          key={index}
          className="space-y-3 rounded-lg border border-border/60 bg-background p-4"
        >
          <div className="flex items-center gap-2.5">
            <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
              <UserRound className="size-4" />
            </div>
            <p className="min-w-0 flex-1 text-sm font-semibold">
              Landlord {index + 1}
            </p>
            {party.isPrimary ? (
              <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-medium">
                Primary contact
              </span>
            ) : null}
            <LandlordCardMenu
              index={index}
              isPrimary={party.isPrimary === true}
              canRemove={landlords.length > 1}
              disabled={disabled}
              onSetPrimary={() => onChange(setPrimaryParty(landlords, index))}
              onRemove={() => removeParty(index)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label
                htmlFor={`landlord-name-${index}`}
                className="text-muted-foreground text-xs font-medium"
              >
                Name/Company Name
                <span className="text-rose-600 dark:text-rose-400"> *</span>
              </Label>
              <Input
                id={`landlord-name-${index}`}
                value={party.name}
                onChange={(e) => updateParty(index, 'name', e.target.value)}
                placeholder="Enter landlord name"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor={`landlord-email-${index}`}
                className="text-muted-foreground text-xs font-medium"
              >
                Email
              </Label>
              <Input
                id={`landlord-email-${index}`}
                type="email"
                value={party.email ?? ''}
                onChange={(e) => updateParty(index, 'email', e.target.value)}
                placeholder="Email address"
                disabled={disabled}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor={`landlord-phone-${index}`}
                className="text-muted-foreground text-xs font-medium"
              >
                Phone
              </Label>
              <Input
                id={`landlord-phone-${index}`}
                value={party.phone ?? ''}
                onChange={(e) => updateParty(index, 'phone', e.target.value)}
                placeholder="Mobile number"
                disabled={disabled}
              />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
