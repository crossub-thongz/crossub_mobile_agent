import { Mail, Phone } from 'lucide-react';

import type { PropertyContact } from '@/lib/types';

export function ContactDetails({
  tenantName,
  tenantContact,
  highlightParty,
}: {
  tenantName: string;
  tenantContact: PropertyContact;
  highlightParty?: 'tenant';
}) {
  return (
    <dl className="grid gap-3 text-xs">
      <ContactBlock
        label="Tenant"
        name={tenantName}
        contact={tenantContact}
        highlighted={highlightParty === 'tenant'}
      />
    </dl>
  );
}

function ContactBlock({
  label,
  name,
  contact,
  highlighted,
}: {
  label: string;
  name: string;
  contact: PropertyContact;
  highlighted?: boolean;
}) {
  const vacant = name.toLowerCase() === 'vacant';

  return (
    <div
      className={`rounded-lg border p-2.5 ${
        highlighted ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'bg-secondary/30'
      }`}
    >
      <dt className="text-muted-foreground text-[10px] font-medium uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium">{name}</dd>
      {!vacant && (contact.phone || contact.email) ? (
        <dd className="text-muted-foreground mt-1.5 space-y-1">
          {contact.phone && (
            <a
              href={`tel:${contact.phone.replace(/\s/g, '')}`}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="size-3 shrink-0" />
              {contact.phone}
            </a>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-1.5 hover:text-foreground"
            >
              <Mail className="size-3 shrink-0" />
              {contact.email}
            </a>
          )}
        </dd>
      ) : (
        !vacant && (
          <dd className="text-muted-foreground mt-1 text-[11px]">No contact on file</dd>
        )
      )}
    </div>
  );
}
