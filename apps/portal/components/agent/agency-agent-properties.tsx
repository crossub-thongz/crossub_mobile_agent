'use client';

import { useMemo, useState } from 'react';

import { FilterChips } from '@/components/agent/filter-chips';
import { PropertyListCard } from '@/components/agent/property-list-card';
import { unreadMessagesForProperty } from '@/lib/communications-log';
import type { AgencyTeamMember } from '@/lib/crossub-api/agent-client';
import type { MessageThread, Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';
import { propertyHref } from '@/constants/routes';

export const AGENCY_UNASSIGNED_AGENT = 'unassigned';

const ALL_AGENTS = 'all';

type AgentFilterId = typeof ALL_AGENTS | typeof AGENCY_UNASSIGNED_AGENT | string;
type PropertySortId = 'address' | 'newest' | 'occupancy' | 'agent';

const SORT_OPTIONS: { id: PropertySortId; label: string }[] = [
  { id: 'agent', label: 'By agent' },
  { id: 'address', label: 'Address' },
  { id: 'newest', label: 'Newest' },
  { id: 'occupancy', label: 'Occupied first' },
];

function memberName(member: AgencyTeamMember): string {
  const parts = [member.firstName, member.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : member.email;
}

function propertyAgentKey(property: Property): string {
  return property.assignedPortalAgentUserId || AGENCY_UNASSIGNED_AGENT;
}

function occupancyRank(property: Property): number {
  if (property.leaseStatus === 'vacant') return 2;
  if (property.leaseStatus === 'vacating') return 1;
  return 0;
}

function sortProperties(items: Property[], sort: PropertySortId): Property[] {
  const next = [...items];
  next.sort((a, b) => {
    switch (sort) {
      case 'newest':
        return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      case 'occupancy': {
        const rank = occupancyRank(a) - occupancyRank(b);
        if (rank !== 0) return rank;
        return formatPropertyFullAddress(a).localeCompare(formatPropertyFullAddress(b));
      }
      case 'agent': {
        const agent = (a.assignedPortalAgentName ?? '').localeCompare(
          b.assignedPortalAgentName ?? '',
        );
        if (agent !== 0) return agent;
        return formatPropertyFullAddress(a).localeCompare(formatPropertyFullAddress(b));
      }
      default:
        return formatPropertyFullAddress(a).localeCompare(formatPropertyFullAddress(b));
    }
  });
  return next;
}

export function AgencyAgentProperties({
  properties,
  messages,
  members,
  isPrincipal,
  selectedAgentId,
  onSelectAgent,
}: {
  properties: Property[];
  messages: MessageThread[];
  members: AgencyTeamMember[];
  isPrincipal: boolean;
  selectedAgentId: string | null;
  onSelectAgent: (userId: string | null) => void;
}) {
  const [sort, setSort] = useState<PropertySortId>(isPrincipal ? 'agent' : 'address');
  const agentFilter: AgentFilterId = selectedAgentId ?? ALL_AGENTS;

  const chipOptions = useMemo(() => {
    const options: { id: AgentFilterId; label: string }[] = [
      { id: ALL_AGENTS, label: `All (${properties.length})` },
    ];
    const unassignedCount = properties.filter((p) => !p.assignedPortalAgentUserId).length;
    if (unassignedCount > 0) {
      options.push({
        id: AGENCY_UNASSIGNED_AGENT,
        label: `Unassigned (${unassignedCount})`,
      });
    }
    for (const member of members) {
      const count = properties.filter(
        (p) => p.assignedPortalAgentUserId === member.userId,
      ).length;
      options.push({
        id: member.userId,
        label: `${memberName(member)} (${count})`,
      });
    }
    return options;
  }, [members, properties]);

  const visible = useMemo(() => {
    const filtered =
      agentFilter === ALL_AGENTS
        ? properties
        : agentFilter === AGENCY_UNASSIGNED_AGENT
          ? properties.filter((p) => !p.assignedPortalAgentUserId)
          : properties.filter((p) => p.assignedPortalAgentUserId === agentFilter);
    return sortProperties(filtered, sort);
  }, [agentFilter, properties, sort]);

  const grouped = useMemo(() => {
    if (!isPrincipal || agentFilter !== ALL_AGENTS || sort !== 'agent') return null;
    const groups = new Map<string, Property[]>();
    for (const property of visible) {
      const key = propertyAgentKey(property);
      const list = groups.get(key) ?? [];
      list.push(property);
      groups.set(key, list);
    }
    const orderedKeys = [
      ...members.map((member) => member.userId).filter((id) => groups.has(id)),
      ...(groups.has(AGENCY_UNASSIGNED_AGENT) ? [AGENCY_UNASSIGNED_AGENT] : []),
    ];
    for (const key of groups.keys()) {
      if (!orderedKeys.includes(key)) orderedKeys.push(key);
    }
    return orderedKeys.map((key) => {
      const member = members.find((m) => m.userId === key);
      return {
        key,
        title:
          key === AGENCY_UNASSIGNED_AGENT
            ? 'Unassigned'
            : member
              ? memberName(member)
              : visible.find((p) => p.assignedPortalAgentUserId === key)
                  ?.assignedPortalAgentName || 'Agent',
        properties: groups.get(key) ?? [],
      };
    });
  }, [agentFilter, isPrincipal, members, sort, visible]);

  const occupied = visible.filter((p) => p.leaseStatus !== 'vacant').length;
  const vacant = visible.length - occupied;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">
          {isPrincipal ? 'Properties' : 'Your properties'} ({visible.length})
        </h2>
        {visible.length > 0 && (
          <p className="text-muted-foreground text-xs tabular-nums">
            {occupied} occupied · {vacant} vacant
          </p>
        )}
      </div>

      {isPrincipal && properties.length > 0 ? (
        <>
          <FilterChips
            options={chipOptions}
            value={agentFilter}
            onChange={(id) => {
              if (id === ALL_AGENTS) onSelectAgent(null);
              else onSelectAgent(id);
            }}
          />
          <label className="text-muted-foreground flex items-center justify-end gap-2 text-xs">
            Sort
            <select
              className="border-input bg-background h-8 rounded-md border px-2 text-xs text-foreground"
              value={sort}
              onChange={(e) => setSort(e.target.value as PropertySortId)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : null}

      {visible.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-center text-sm">
          {isPrincipal
            ? 'No properties under this agency yet.'
            : 'No properties in your book yet. Properties you add will appear here.'}
        </p>
      ) : grouped ? (
        grouped.map((group) => (
          <div key={group.key} className="space-y-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {group.title} ({group.properties.length})
            </h3>
            {group.properties.map((p) => (
              <PropertyListCard
                key={p.id}
                property={p}
                messageUnread={unreadMessagesForProperty(
                  p.id,
                  messages,
                  formatPropertyFullAddress(p),
                )}
                href={propertyHref(p)}
              />
            ))}
          </div>
        ))
      ) : (
        visible.map((p) => (
          <PropertyListCard
            key={p.id}
            property={p}
            messageUnread={unreadMessagesForProperty(
              p.id,
              messages,
              formatPropertyFullAddress(p),
            )}
            href={propertyHref(p)}
          />
        ))
      )}
    </section>
  );
}
