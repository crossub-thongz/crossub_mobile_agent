'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  FOLIO_STATUS_LABEL,
  FOLIO_STATUS_TONE,
  PEOPLE_COPY,
  PERSON_PROFILE_COPY,
  PERSON_ROLE_LABEL,
  PERSON_ROLE_TONE,
} from '@/constants/people';
import { propertyDetail } from '@/constants/routes';
import type {
  AgencyPeopleFolioRef,
  AgencyPeoplePropertyRef,
  AgencyPersonRole,
} from '@/lib/crossub-api/agent-client';
import { cn } from '@/lib/utils';

export function PeoplePill({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The person's CP reference, e.g. CP-00012. */
export function PersonReferenceChip({ reference }: { reference: string }) {
  return <PeoplePill className="bg-primary/10 text-primary tabular-nums">{reference}</PeoplePill>;
}

export function PersonRoleChips({ roles }: { roles: readonly AgencyPersonRole[] }) {
  if (roles.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {roles.map((role) => (
        <PeoplePill key={role} className={PERSON_ROLE_TONE[role]}>
          {PERSON_ROLE_LABEL[role]}
        </PeoplePill>
      ))}
    </div>
  );
}

export function PeopleLoading({ label = PEOPLE_COPY.loading }: { label?: string }) {
  return (
    <p className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-xs">
      <Loader2 className="size-3.5 animate-spin" />
      {label}
    </p>
  );
}

export function PeopleLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed p-4 text-sm">
      <p className="text-destructive break-words">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        {PEOPLE_COPY.retry}
      </Button>
    </div>
  );
}

/** A titled card on the profile; callers only render it when it has rows. */
export function PeopleSection({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {meta}
      </div>
      <ul className="divide-y">{children}</ul>
    </section>
  );
}

export function PeopleSectionRow({ children }: { children: ReactNode }) {
  return <li className="min-w-0 space-y-1.5 px-4 py-3">{children}</li>;
}

/** Address linked to the property hub, with suburb and an Archived chip when it applies. */
export function PeoplePropertyLink({
  property,
  isPrimary,
}: {
  property: AgencyPeoplePropertyRef;
  isPrimary?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <Link
        href={propertyDetail(property.id)}
        className="text-primary min-w-0 break-words text-sm font-medium hover:underline"
      >
        {property.address}
        {property.suburb ? `, ${property.suburb}` : ''}
      </Link>
      {isPrimary ? (
        <PeoplePill className="bg-secondary text-secondary-foreground">
          {PERSON_PROFILE_COPY.primary}
        </PeoplePill>
      ) : null}
      {property.archived ? (
        <PeoplePill className="bg-muted text-muted-foreground">{PERSON_PROFILE_COPY.archived}</PeoplePill>
      ) : null}
    </div>
  );
}

export function PeopleFolioChip({ folio }: { folio: AgencyPeopleFolioRef }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{PERSON_PROFILE_COPY.folioLabel}</span>
      <span className="font-medium tabular-nums">{folio.code}</span>
      <PeoplePill className={FOLIO_STATUS_TONE[folio.status]}>{FOLIO_STATUS_LABEL[folio.status]}</PeoplePill>
    </span>
  );
}

/** Folio, or why there is none: the agency keeps trust outside Crossub, or it is not opened yet. */
export function PeopleFolioLine({
  trustManaged,
  folio,
}: {
  trustManaged: boolean;
  folio: AgencyPeopleFolioRef | null;
}) {
  if (!trustManaged) {
    return <p className="text-muted-foreground text-xs">{PERSON_PROFILE_COPY.trustNotManaged}</p>;
  }
  if (!folio) return <p className="text-muted-foreground text-xs">{PERSON_PROFILE_COPY.noFolio}</p>;
  return <PeopleFolioChip folio={folio} />;
}
