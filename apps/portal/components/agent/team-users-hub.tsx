'use client';

import Link from 'next/link';
import { Building2, ChevronRight } from 'lucide-react';

import { AgencyTeamPanel } from '@/components/agent/agency-team-panel';
import { EmptyState } from '@/components/agent/empty-state';
import { PageIntro } from '@/components/agent/page-intro';
import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { agencyDetail, ROUTES } from '@/constants/routes';
import type { Agency } from '@/lib/types';
import { cn } from '@/lib/utils';

function membershipLabel(tier: Agency['membershipTier']): string {
  return tier === 'AGENT' ? 'Agent' : 'Principal';
}

function AgencyTeamSection({
  agency,
  currentUserId,
}: {
  agency: Agency;
  currentUserId?: string;
}) {
  const isPrincipal = agency.membershipTier !== 'AGENT';
  const isLocal = agency.id.startsWith('local-');

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border bg-gradient-to-br from-card to-secondary/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Your agency</p>
              <p className="mt-0.5 text-lg font-semibold leading-tight">{agency.name}</p>
              {agency.company && agency.company !== agency.name ? (
                <p className="text-muted-foreground mt-0.5 text-sm">{agency.company}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    'inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    isPrincipal
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  Your role: {membershipLabel(agency.membershipTier)}
                </span>
                <PortalServiceLevelBadge
                  level={agency.portalServiceLevel}
                  variant="level"
                  size="xs"
                />
              </div>
            </div>
          </div>
          {!isLocal ? (
            <Link
              href={agencyDetail(agency.id)}
              className="text-muted-foreground hover:text-foreground flex shrink-0 items-center gap-0.5 text-xs font-medium transition"
            >
              Agency profile
              <ChevronRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      {isLocal ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          Team members are available once your agency is connected to CROSSUB.
        </p>
      ) : (
        <AgencyTeamPanel
          agencyId={agency.id}
          canManage={isPrincipal}
          currentUserId={currentUserId}
          title={isPrincipal ? 'Agency team' : 'Colleagues on your team'}
        />
      )}
    </section>
  );
}

export function TeamUsersHub() {
  const isV2 = useIsAgentUiV2();
  const { user } = useAuth();
  const { agencies, apiConnected } = useAgentData();

  const teamAgencies = agencies.filter((agency) => !agency.id.startsWith('local-'));
  const intro =
    teamAgencies.length > 1
      ? 'View your agencies and the agents working alongside you on each team.'
      : 'View your agency and the agents working alongside you.';

  return (
    <div className={cn('space-y-5', isV2 && 'v2-dashboard normal-case')}>
      <PageIntro description={intro} />

      {!apiConnected && teamAgencies.length === 0 ? (
        <EmptyState
          title="Team unavailable offline"
          description="Connect to CROSSUB to see your agency team."
        />
      ) : teamAgencies.length === 0 ? (
        <EmptyState
          title="No agency team yet"
          description="When you are assigned to an agency, your team members will appear here."
        />
      ) : (
        <div className="space-y-6">
          {teamAgencies.map((agency) => (
            <AgencyTeamSection key={agency.id} agency={agency} currentUserId={user?.id} />
          ))}
        </div>
      )}
    </div>
  );
}
