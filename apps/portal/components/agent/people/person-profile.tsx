'use client';

import { Mail, Phone, UserX } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/agent/empty-state';
import {
  PeopleFolioChip,
  PeopleFolioLine,
  PeopleLoadError,
  PeopleLoading,
  PeoplePill,
  PeoplePropertyLink,
  PeopleSection,
  PeopleSectionRow,
  PersonReferenceChip,
  PersonRoleChips,
} from '@/components/agent/people/people-ui';
import {
  PEOPLE_COPY,
  PEOPLE_NOT_FOUND_STATUS,
  PERSON_APPLICATION_STATUS_LABEL,
  PERSON_APPLICATION_STATUS_TONE,
  PERSON_JOB_STATUS_LABEL,
  PERSON_JOB_STATUS_TONE,
  PERSON_PROFILE_COPY,
  TENANCY_MEMBER_ROLE_LABEL,
  TENANCY_MEMBER_STATUS,
  TENANCY_STATUS_LABEL,
  TENANCY_STATUS_TONE,
} from '@/constants/people';
import { maintenanceDetail } from '@/constants/routes';
import { useAgencyPerson } from '@/hooks/use-agency-people';
import { ApiError } from '@/lib/api';
import type {
  AgencyPersonProfile,
  AgencyPersonSupplier,
  AgencyPersonTenancy,
} from '@/lib/crossub-api/agent-client';
import { formatPropertyDateNumeric } from '@/lib/format-datetime';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

function ProfileHeader({ person }: { person: AgencyPersonProfile }) {
  return (
    <header className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="min-w-0 break-words text-lg font-semibold">{person.displayName}</h1>
        <PersonReferenceChip reference={person.reference} />
        {person.hasLogin ? (
          <PeoplePill className="bg-secondary text-secondary-foreground">
            {PERSON_PROFILE_COPY.hasLogin}
          </PeoplePill>
        ) : null}
      </div>
      <PersonRoleChips roles={person.roles} />
      <div className="flex min-w-0 flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-6">
        <span className="flex min-w-0 items-center gap-2">
          <Mail className="text-muted-foreground size-4 shrink-0" />
          {person.email ? (
            <a href={`mailto:${person.email}`} className="text-primary min-w-0 break-all hover:underline">
              {person.email}
            </a>
          ) : (
            <span className="text-muted-foreground">{PEOPLE_COPY.noEmail}</span>
          )}
        </span>
        <span className="flex min-w-0 items-center gap-2">
          <Phone className="text-muted-foreground size-4 shrink-0" />
          {person.phone ? (
            <a href={`tel:${person.phone}`} className="text-primary min-w-0 break-all hover:underline">
              {person.phone}
            </a>
          ) : (
            <span className="text-muted-foreground">{PEOPLE_COPY.noPhone}</span>
          )}
        </span>
      </div>
    </header>
  );
}

function TenancyRow({ tenancy }: { tenancy: AgencyPersonTenancy }) {
  const dates = PERSON_PROFILE_COPY.dateRange(
    tenancy.startDate ? formatPropertyDateNumeric(tenancy.startDate) : null,
    tenancy.endDate ? formatPropertyDateNumeric(tenancy.endDate) : null,
  );
  return (
    <PeopleSectionRow>
      <PeoplePropertyLink property={tenancy.property} isPrimary={tenancy.isPrimary} />
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <PeoplePill className={TENANCY_STATUS_TONE[tenancy.status]}>
          {TENANCY_STATUS_LABEL[tenancy.status]}
        </PeoplePill>
        <span>{TENANCY_MEMBER_ROLE_LABEL[tenancy.role]}</span>
        {tenancy.memberStatus === TENANCY_MEMBER_STATUS.ENDED ? (
          <PeoplePill className="bg-muted text-muted-foreground">{PERSON_PROFILE_COPY.leftTenancy}</PeoplePill>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">{dates || PERSON_PROFILE_COPY.noDates}</p>
      <PeopleFolioLine trustManaged={tenancy.trustManaged} folio={tenancy.folio} />
    </PeopleSectionRow>
  );
}

function SupplierSection({ supplier }: { supplier: AgencyPersonSupplier }) {
  const copy = PERSON_PROFILE_COPY.sections;
  return (
    <PeopleSection
      title={copy.supplier}
      meta={<span className="text-muted-foreground text-xs">{PERSON_PROFILE_COPY.jobCount(supplier.jobCount)}</span>}
    >
      {supplier.agencies.length > 0 ? (
        <PeopleSectionRow>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {copy.supplierAgencies}
          </p>
          {supplier.agencies.map((agency) => (
            <div key={agency.agencyId} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="min-w-0 break-words font-medium">{agency.agencyName}</span>
              {agency.isBlacklisted ? (
                <PeoplePill className="bg-destructive/15 text-destructive">
                  {PERSON_PROFILE_COPY.blacklisted}
                </PeoplePill>
              ) : null}
              {agency.serviceTypes.length > 0 ? (
                <span className="text-muted-foreground min-w-0 break-words text-xs">
                  {agency.serviceTypes.join(', ')}
                </span>
              ) : null}
            </div>
          ))}
        </PeopleSectionRow>
      ) : null}
      {supplier.recentJobs.length > 0 ? (
        <PeopleSectionRow>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {copy.recentJobs}
          </p>
          <ul className="space-y-2">
            {supplier.recentJobs.map((job) => (
              <li key={job.id} className="min-w-0 space-y-1">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={maintenanceDetail(job.id)}
                    className="text-primary text-sm font-medium tabular-nums hover:underline"
                  >
                    {job.reference ?? PERSON_PROFILE_COPY.jobNoReference}
                  </Link>
                  <PeoplePill className={PERSON_JOB_STATUS_TONE[job.status]}>
                    {PERSON_JOB_STATUS_LABEL[job.status]}
                  </PeoplePill>
                  <span className="text-muted-foreground text-xs">
                    {PERSON_PROFILE_COPY.raised(formatPropertyDateNumeric(job.createdAt))}
                  </span>
                </div>
                {job.property ? (
                  <PeoplePropertyLink property={job.property} />
                ) : (
                  <p className="text-muted-foreground text-xs">{PERSON_PROFILE_COPY.noProperty}</p>
                )}
              </li>
            ))}
          </ul>
        </PeopleSectionRow>
      ) : null}
      {supplier.folios.length > 0 ? (
        <PeopleSectionRow>
          <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
            {copy.supplierFolios}
          </p>
          <div className="flex flex-col gap-1">
            {supplier.folios.map((folio) => (
              <PeopleFolioChip key={folio.ledgerId} folio={folio} />
            ))}
          </div>
        </PeopleSectionRow>
      ) : null}
    </PeopleSection>
  );
}

function ProfileSections({ person }: { person: AgencyPersonProfile }) {
  const copy = PERSON_PROFILE_COPY.sections;
  return (
    <>
      {person.tenancies.length > 0 ? (
        <PeopleSection title={copy.tenancies}>
          {person.tenancies.map((tenancy) => (
            <TenancyRow key={tenancy.tenancyId} tenancy={tenancy} />
          ))}
        </PeopleSection>
      ) : null}
      {person.tenantContacts.length > 0 ? (
        <PeopleSection title={copy.tenantContacts}>
          {person.tenantContacts.map((contact) => (
            <PeopleSectionRow key={contact.property.id}>
              <PeoplePropertyLink property={contact.property} isPrimary={contact.isPrimary} />
            </PeopleSectionRow>
          ))}
        </PeopleSection>
      ) : null}
      {person.ownedProperties.length > 0 ? (
        <PeopleSection title={copy.owned}>
          {person.ownedProperties.map((owned) => (
            <PeopleSectionRow key={owned.property.id}>
              <PeoplePropertyLink property={owned.property} isPrimary={owned.isPrimary} />
              <PeopleFolioLine trustManaged={owned.trustManaged} folio={owned.folio} />
            </PeopleSectionRow>
          ))}
        </PeopleSection>
      ) : null}
      {person.supplier ? <SupplierSection supplier={person.supplier} /> : null}
      {person.applications.length > 0 ? (
        <PeopleSection title={copy.applications}>
          {person.applications.map((application) => (
            <PeopleSectionRow key={application.id}>
              {application.property ? (
                <PeoplePropertyLink property={application.property} />
              ) : (
                <p className="text-muted-foreground text-xs">{PERSON_PROFILE_COPY.noProperty}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <PeoplePill className={PERSON_APPLICATION_STATUS_TONE[application.status]}>
                  {PERSON_APPLICATION_STATUS_LABEL[application.status]}
                </PeoplePill>
                <span className="text-muted-foreground">
                  {PERSON_PROFILE_COPY.applied(formatPropertyDateNumeric(application.createdAt))}
                </span>
              </div>
            </PeopleSectionRow>
          ))}
        </PeopleSection>
      ) : null}
    </>
  );
}

/** One person on one Self-Manage agency: contact details, then every non-empty relationship. */
export function PersonProfile({ agencyId, personId }: { agencyId: string | null; personId: string }) {
  const person = useAgencyPerson(agencyId, personId);
  const notFound =
    !agencyId ||
    (person.error instanceof ApiError && person.error.status === PEOPLE_NOT_FOUND_STATUS);

  return (
    <div className="space-y-4 lg:px-6 lg:py-4">
      {notFound ? (
        <EmptyState
          icon={UserX}
          title={PERSON_PROFILE_COPY.notFoundTitle}
          description={PERSON_PROFILE_COPY.notFoundDescription}
        />
      ) : person.error ? (
        <PeopleLoadError
          message={apiErrorMessage(person.error, PERSON_PROFILE_COPY.loadFailed)}
          onRetry={person.reload}
        />
      ) : !person.data || person.loading ? (
        <PeopleLoading label={PERSON_PROFILE_COPY.loading} />
      ) : (
        <>
          <ProfileHeader person={person.data} />
          <ProfileSections person={person.data} />
        </>
      )}
    </div>
  );
}
