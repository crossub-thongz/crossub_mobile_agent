'use client';

import { Building2, Mail, Phone, Users } from 'lucide-react';

import type { MaintenanceWorkspaceParty } from '@/lib/maintenance-workspace/types';

function ContactCard({
  title,
  icon: Icon,
  contact,
  meta,
}: {
  title: string;
  icon: typeof Building2;
  contact?: MaintenanceWorkspaceParty;
  meta?: string;
}) {
  if (!contact?.name && !contact?.email && !contact?.phone) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-4" />
          <p className="text-sm font-medium">{title}</p>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          No contact details recorded on this property.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start gap-2">
        <Icon className="text-primary mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-1 text-sm font-semibold">{contact?.name ?? '—'}</p>
          {meta ? <p className="text-muted-foreground mt-1 text-xs">{meta}</p> : null}
        </div>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        {contact?.phone ? (
          <a
            href={`tel:${contact.phone.replace(/\s/g, '')}`}
            className="text-primary inline-flex items-center gap-2 font-medium"
          >
            <Phone className="size-4" />
            {contact.phone}
          </a>
        ) : null}
        {contact?.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="text-primary inline-flex items-center gap-2 font-medium"
          >
            <Mail className="size-4" />
            {contact.email}
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function MaintenanceStrataContactsPanel({
  buildingManager,
  strataContact,
  strataPlanNumber,
  buildingName,
}: {
  buildingManager?: MaintenanceWorkspaceParty;
  strataContact?: MaintenanceWorkspaceParty;
  strataPlanNumber?: string | null;
  buildingName?: string | null;
}) {
  const strataMeta = [
    buildingName?.trim(),
    strataPlanNumber?.trim() ? `Plan ${strataPlanNumber.trim()}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Strata coordination contacts</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Building manager and strata body details from the property record.
        </p>
      </div>
      <ContactCard title="Building manager" icon={Building2} contact={buildingManager} />
      <ContactCard
        title="Strata contact"
        icon={Users}
        contact={strataContact}
        meta={strataMeta || undefined}
      />
    </div>
  );
}
