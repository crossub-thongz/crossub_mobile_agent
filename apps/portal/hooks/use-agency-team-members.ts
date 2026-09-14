'use client';

import { useEffect, useState } from 'react';

import { fetchAgencyTeam, type AgencyTeamMember } from '@/lib/crossub-api/agent-client';

/** Team members of an agency (the default-inspector pool). Loads only while `enabled`. */
export function useAgencyTeamMembers(
  agencyId: string | null | undefined,
  enabled: boolean,
): { members: AgencyTeamMember[]; loading: boolean; failed: boolean } {
  const [members, setMembers] = useState<AgencyTeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || !agencyId) return;
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    void fetchAgencyTeam(agencyId)
      .then((team) => {
        if (!cancelled) setMembers(team.members);
      })
      .catch(() => {
        if (!cancelled) {
          setMembers([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agencyId, enabled]);

  return { members, loading, failed };
}
