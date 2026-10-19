'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  PEOPLE_PAGE_SIZE,
  PEOPLE_ROLE_FILTER_ALL,
  type PeopleRoleFilter,
} from '@/constants/people';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchAgencyPeople,
  fetchAgencyPerson,
  type AgencyPersonListItem,
} from '@/lib/crossub-api/agent-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export type AgencyPeopleFilters = {
  /** Already debounced. */
  search: string;
  role: PeopleRoleFilter;
};

/** Appends a page, skipping anyone already shown (a person can shift pages between loads). */
function mergePeoplePages(
  shown: readonly AgencyPersonListItem[],
  next: readonly AgencyPersonListItem[],
): AgencyPersonListItem[] {
  const seen = new Set(shown.map((p) => p.id));
  return [...shown, ...next.filter((p) => !seen.has(p.id))];
}

/**
 * One agency's people: the first page on every agency or filter change, then "load more". A
 * stale response (the agency or filters changed while it was in flight) is dropped.
 */
export function useAgencyPeople(agencyId: string | null, filters: AgencyPeopleFilters) {
  const [items, setItems] = useState<AgencyPersonListItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);
  const { search, role } = filters;

  const load = useCallback(
    async (nextPage: number) => {
      const request = ++requestRef.current;
      if (!agencyId) {
        setItems([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      const term = search.trim();
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const result = await fetchAgencyPeople(agencyId, {
          page: nextPage,
          pageSize: PEOPLE_PAGE_SIZE,
          ...(term ? { search: term } : {}),
          ...(role === PEOPLE_ROLE_FILTER_ALL ? {} : { role }),
        });
        if (request !== requestRef.current) return;
        setItems((shown) => (nextPage === 1 ? result.items : mergePeoplePages(shown, result.items)));
        setPage(result.page);
        setTotal(result.total);
      } catch (err) {
        if (request !== requestRef.current) return;
        // A failed first page clears the old rows: they belong to the previous agency or filter.
        if (nextPage === 1) {
          setItems([]);
          setTotal(0);
        }
        setError(apiErrorMessage(err));
      } finally {
        if (request === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [agencyId, role, search],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const reload = useCallback(() => load(1), [load]);
  const loadMore = useCallback(() => load(page + 1), [load, page]);
  const hasMore = page * PEOPLE_PAGE_SIZE < total;

  return { items, total, hasMore, loading, loadingMore, error, reload, loadMore };
}

/** One person's profile on one agency; nothing loads until both ids are known. */
export function useAgencyPerson(agencyId: string | null, personId: string) {
  const key = agencyId ? `${agencyId}:${personId}` : null;
  return useTrustResource(key, () => fetchAgencyPerson(agencyId ?? '', personId));
}
