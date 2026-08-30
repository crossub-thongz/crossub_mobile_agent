'use client';

import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  emptyPartyContact,
  ensureExactlyOnePrimary,
  setPrimaryParty,
} from '@/lib/property-parties';
import type { PropertyPartyContact } from '@/lib/types';
import { cn } from '@/lib/utils';

export function TenancyTenantCards({
  parties,
  onChange,
  disabled,
}: {
  parties: PropertyPartyContact[];
  onChange: (parties: PropertyPartyContact[]) => void;
  disabled?: boolean;
}) {
  const tenants =
    parties.length > 0
      ? ensureExactlyOnePrimary(parties)
      : [emptyPartyContact({ isPrimary: true })];

  const updateParty = (index: number, field: 'name' | 'phone' | 'email', value: string) => {
    onChange(tenants.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const removeParty = (index: number) => {
    if (tenants.length <= 1) {
      onChange([emptyPartyContact({ isPrimary: true })]);
      return;
    }
    onChange(ensureExactlyOnePrimary(tenants.filter((_, i) => i !== index)));
  };

  return (
    <div className="space-y-3">
      {tenants.map((party, index) => (
        <article
          key={index}
          className={cn(
            'space-y-3 rounded-lg border bg-card p-4',
            party.isPrimary ? 'border-primary/40' : 'border-border/60',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Tenant{tenants.length > 1 ? ` ${index + 1}` : ''}
                {party.isPrimary ? (
                  <span className="text-muted-foreground ml-1.5 text-xs font-medium">
                    · Primary
                  </span>
                ) : null}
              </p>
              {index === 0 && tenants.length === 1 && !party.name.trim() ? (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Leave blank if the property is vacant.
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant={party.isPrimary ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 px-2.5 text-xs font-medium"
                disabled={disabled || party.isPrimary}
                onClick={() => onChange(setPrimaryParty(tenants, index))}
              >
                {party.isPrimary ? 'Primary' : 'Set Primary'}
              </Button>
              {tenants.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive size-8"
                  onClick={() => removeParty(index)}
                  disabled={disabled}
                  aria-label={`Remove tenant ${index + 1}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`tenant-name-${index}`} className="text-muted-foreground text-xs font-medium">
              Name
            </Label>
            <Input
              id={`tenant-name-${index}`}
              value={party.name}
              onChange={(e) => updateParty(index, 'name', e.target.value)}
              placeholder="Tenant name"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`tenant-phone-${index}`} className="text-muted-foreground text-xs font-medium">
              Phone
            </Label>
            <Input
              id={`tenant-phone-${index}`}
              value={party.phone ?? ''}
              onChange={(e) => updateParty(index, 'phone', e.target.value)}
              placeholder="Phone"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`tenant-email-${index}`} className="text-muted-foreground text-xs font-medium">
              Email
            </Label>
            <Input
              id={`tenant-email-${index}`}
              type="email"
              value={party.email ?? ''}
              onChange={(e) => updateParty(index, 'email', e.target.value)}
              placeholder="Email"
              disabled={disabled}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
