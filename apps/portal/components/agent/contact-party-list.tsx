'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PropertyPartyContact } from '@/lib/property-parties';
import { emptyPartyContact } from '@/lib/property-parties';

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
}: ContactPartyListProps) {
  const updateParty = (index: number, field: keyof PropertyPartyContact, value: string) => {
    onChange(parties.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const removeParty = (index: number) => {
    if (parties.length <= 1) {
      onChange([emptyPartyContact()]);
      return;
    }
    onChange(parties.filter((_, i) => i !== index));
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

      <div className="space-y-4">
        {parties.map((party, index) => (
          <div
            key={index}
            className="space-y-3 rounded-lg border border-border/60 bg-secondary/10 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">
                {title} {index + 1}
              </p>
              {parties.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive h-7 px-2"
                  onClick={() => removeParty(index)}
                  aria-label={`Remove ${title.toLowerCase()} ${index + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${title}-name-${index}`}>Name</Label>
              <Input
                id={`${title}-name-${index}`}
                value={party.name}
                onChange={(e) => updateParty(index, 'name', e.target.value)}
                placeholder={namePlaceholder}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`${title}-email-${index}`}>Email</Label>
                <Input
                  id={`${title}-email-${index}`}
                  type="email"
                  value={party.email ?? ''}
                  onChange={(e) => updateParty(index, 'email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${title}-phone-${index}`}>Phone</Label>
                <Input
                  id={`${title}-phone-${index}`}
                  value={party.phone ?? ''}
                  onChange={(e) => updateParty(index, 'phone', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addParty}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </>
  );

  if (!asFieldset) {
    return <div className="space-y-3">{body}</div>;
  }

  return (
    <fieldset className="space-y-3 rounded-xl border bg-card p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {body}
    </fieldset>
  );
}
