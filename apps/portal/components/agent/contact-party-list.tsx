'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  emptyPartyContact,
  ensureExactlyOnePrimary,
  type PropertyPartyContact,
} from '@/lib/property-parties';

interface ContactPartyListProps {
  title: string;
  description?: string;
  parties: PropertyPartyContact[];
  onChange: (parties: PropertyPartyContact[]) => void;
  addLabel: string;
  namePlaceholder?: string;
  vacantHint?: string;
  /** When false, renders inside an existing section (e.g. registry form). */
  asFieldset?: boolean;
  /** Hide the built-in add control (e.g. when the parent section header owns it). */
  hideAddButton?: boolean;
}

export function ContactPartyList({
  title,
  description,
  parties,
  onChange,
  addLabel,
  namePlaceholder,
  vacantHint,
  asFieldset = true,
  hideAddButton = false,
}: ContactPartyListProps) {
  const updateParty = (index: number, field: 'name' | 'email' | 'phone', value: string) => {
    onChange(parties.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const removeParty = (index: number) => {
    if (parties.length <= 1) {
      onChange([emptyPartyContact({ isPrimary: true })]);
      return;
    }
    onChange(ensureExactlyOnePrimary(parties.filter((_, i) => i !== index)));
  };

  const addParty = () => {
    onChange([...parties, emptyPartyContact()]);
  };

  const body = (
    <>
      {description ? <p className="text-muted-foreground text-xs">{description}</p> : null}
      {vacantHint && parties.length === 1 && !parties[0]?.name.trim() ? (
        <p className="text-muted-foreground text-xs">{vacantHint}</p>
      ) : null}

      <div className="space-y-3">
        {parties.map((party, index) => (
          <div
            key={index}
            className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end"
          >
            <div className="space-y-1.5">
              <Label
                htmlFor={`${title}-name-${index}`}
                className="text-muted-foreground text-xs font-medium"
              >
                Name
                {parties.length > 1 ? (
                  <span className="text-muted-foreground/70 font-normal normal-case tracking-normal">
                    {' '}
                    · {title} {index + 1}
                  </span>
                ) : null}
              </Label>
              <Input
                id={`${title}-name-${index}`}
                inputKind="person_name"
                value={party.name}
                onChange={(e) => updateParty(index, 'name', e.target.value)}
                placeholder={namePlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor={`${title}-email-${index}`}
                className="text-muted-foreground text-xs font-medium"
              >
                Email
              </Label>
              <Input
                id={`${title}-email-${index}`}
                type="email"
                value={party.email ?? ''}
                onChange={(e) => updateParty(index, 'email', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor={`${title}-phone-${index}`}
                className="text-muted-foreground text-xs font-medium"
              >
                Phone
              </Label>
              <Input
                id={`${title}-phone-${index}`}
                value={party.phone ?? ''}
                onChange={(e) => updateParty(index, 'phone', e.target.value)}
              />
            </div>
            {parties.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive size-9 shrink-0"
                onClick={() => removeParty(index)}
                aria-label={`Remove ${title.toLowerCase()} ${index + 1}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      {!hideAddButton && !asFieldset ? (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/10 h-8 px-2 text-xs font-medium"
            onClick={addParty}
          >
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        </div>
      ) : null}
    </>
  );

  if (!asFieldset) {
    return <div className="space-y-3">{body}</div>;
  }

  return (
    <fieldset className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <legend className="px-1 text-sm font-semibold">{title}</legend>
        {!hideAddButton ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary hover:bg-primary/10 h-8 shrink-0 px-2 text-xs font-medium"
            onClick={addParty}
          >
            <Plus className="size-3.5" />
            {addLabel}
          </Button>
        ) : null}
      </div>
      {body}
    </fieldset>
  );
}
