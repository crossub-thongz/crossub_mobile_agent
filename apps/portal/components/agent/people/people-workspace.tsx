'use client';

import { ChevronRight, Loader2, Mail, Phone, Search, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { EmptyState } from '@/components/agent/empty-state';
import { FilterChips } from '@/components/agent/filter-chips';
import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import {
  PeopleLoadError,
  PeopleLoading,
  PersonReferenceChip,
  PersonRoleChips,
} from '@/components/agent/people/people-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PEOPLE_COPY,
  PEOPLE_ROLE_FILTER_ALL,
  PEOPLE_ROLE_FILTERS,
  PEOPLE_SEARCH_DEBOUNCE_MS,
  type PeopleRoleFilter,
} from '@/constants/people';
import { peopleList, personDetail } from '@/constants/routes';
import { useAgencyPeople } from '@/hooks/use-agency-people';
import { useDebouncedValue } from '@/hooks/use-trust-resource';
import type { AgencyPersonListItem } from '@/lib/crossub-api/agent-client';
import type { Agency } from '@/lib/types';

function PersonRow({ person, agencyId }: { person: AgencyPersonListItem; agencyId: string }) {
  return (
    <li>
      <Link
        href={personDetail(person.id, agencyId)}
        className="hover:bg-muted/50 flex min-w-0 items-center gap-3 px-4 py-3 transition-colors"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="min-w-0 truncate text-sm font-semibold">{person.displayName}</span>
            <PersonReferenceChip reference={person.reference} />
          </div>
          <PersonRoleChips roles={person.roles} />
          <div className="text-muted-foreground flex min-w-0 flex-col gap-0.5 text-xs sm:flex-row sm:flex-wrap sm:gap-x-4">
            <span className="flex min-w-0 items-center gap-1.5">
              <Mail className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{person.email ?? PEOPLE_COPY.noEmail}</span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <Phone className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{person.phone ?? PEOPLE_COPY.noPhone}</span>
            </span>
          </div>
        </div>
        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
      </Link>
    </li>
  );
}

/**
 * Self-Manage People: the agency's tenants, owners, suppliers, applicants and staff with their
 * CP references. Search and the role chips go to the API; rows open the person's profile.
 */
export function PeopleWorkspace({
  agencies,
  initialAgencyId,
}: {
  agencies: readonly Agency[];
  initialAgencyId: string | null;
}) {
  const router = useRouter();
  const [agencyId, setAgencyId] = useState(
    agencies.some((a) => a.id === initialAgencyId) ? (initialAgencyId as string) : (agencies[0]?.id ?? ''),
  );
  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState<PeopleRoleFilter>(PEOPLE_ROLE_FILTER_ALL);
  const search = useDebouncedValue(searchInput, PEOPLE_SEARCH_DEBOUNCE_MS);
  const people = useAgencyPeople(agencyId || null, { search, role });
  const filtered = search.trim() !== '' || role !== PEOPLE_ROLE_FILTER_ALL;

  if (agencies.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={PEOPLE_COPY.noAgencyTitle}
        description={PEOPLE_COPY.noAgencyDescription}
      />
    );
  }

  return (
    <div className="space-y-4 lg:px-6 lg:py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {agencies.length > 1 ? (
          <div className="space-y-1.5 lg:w-64">
            <Label htmlFor="people-agency">{PEOPLE_COPY.agencyLabel}</Label>
            <select
              id="people-agency"
              className={SELECT_CLASS}
              value={agencyId}
              onChange={(e) => {
                setAgencyId(e.target.value);
                router.replace(peopleList(e.target.value));
              }}
            >
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="relative w-full lg:w-96">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder={PEOPLE_COPY.searchPlaceholder}
            aria-label={PEOPLE_COPY.searchPlaceholder}
            className="h-9 rounded-lg pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      <FilterChips options={PEOPLE_ROLE_FILTERS} value={role} onChange={setRole} />

      {people.error && people.items.length === 0 ? (
        <PeopleLoadError message={people.error} onRetry={() => void people.reload()} />
      ) : people.loading && people.items.length === 0 ? (
        <PeopleLoading />
      ) : people.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={filtered ? PEOPLE_COPY.noMatchTitle : PEOPLE_COPY.emptyTitle}
          description={filtered ? PEOPLE_COPY.noMatchDescription : PEOPLE_COPY.emptyDescription}
        />
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            {PEOPLE_COPY.shownOf(people.items.length, people.total)}
            {people.loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
          </p>
          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {people.items.map((person) => (
              <PersonRow key={person.id} person={person} agencyId={agencyId} />
            ))}
          </ul>
          {people.error ? (
            <PeopleLoadError message={people.error} onRetry={() => void people.loadMore()} />
          ) : null}
          {people.hasMore ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 w-full text-xs"
              disabled={people.loadingMore}
              onClick={() => void people.loadMore()}
            >
              {people.loadingMore ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {people.loadingMore ? PEOPLE_COPY.loading : PEOPLE_COPY.loadMore}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
