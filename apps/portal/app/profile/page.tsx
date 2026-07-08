'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, History, LogOut, Mail, Phone, Settings, User } from 'lucide-react';

import { AgentShell } from '@/components/layout/agent-shell';
import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { buildProfileHistory } from '@/lib/profile-history';
import { buildPhonebook } from '@/lib/phonebook';
import { ROUTES } from '@/constants/routes';
import { getLocalSessionAccount } from '@/lib/local-auth';
import { useAgentStore } from '@/lib/store';
import { cn, displayName, formatDateTime, formatRelative } from '@/lib/utils';

type ProfileTab = 'history' | 'contacts';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { properties, messages, rentReviews, primaryAgency } = useAgentData();
  const sentThreadMessages = useAgentStore((s) => s.sentThreadMessages);
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);
  const [tab, setTab] = useState<ProfileTab>('contacts');

  const phonebook = buildPhonebook(properties);
  const history = buildProfileHistory({
    messages,
    sentThreadMessages,
    rentReviewDecisions,
    rentReviews,
  });

  const localAccount = getLocalSessionAccount();
  const agencyName = primaryAgency?.name ?? localAccount?.agencyName ?? '—';
  const agencyCompany =
    primaryAgency?.company ?? localAccount?.agencyCompany ?? '—';

  return (
    <AgentShell title="Profile">
      <div className="space-y-5">
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">
                {user ? displayName(user) : 'Agent'}
              </p>
              <p className="text-muted-foreground truncate text-sm">
                {user?.email ?? '—'}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {properties.length} propert{properties.length === 1 ? 'y' : 'ies'}{' '}
                in your portfolio
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">Your details</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Information from your agent registration
          </p>
          <dl className="mt-3 space-y-2.5 text-sm">
            <ProfileRow label="First name" value={user?.firstName} />
            <ProfileRow label="Last name" value={user?.lastName} />
            <ProfileRow label="Email" value={user?.email} />
            <ProfileRow label="Phone" value={user?.phone ?? localAccount?.phone} />
            <ProfileRow label="Role" value={user?.role?.replace(/_/g, ' ')} />
          </dl>
        </section>

        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Agency details</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                Your client agency in crossub_web
              </p>
            </div>
            {primaryAgency && (
              <PortalServiceLevelBadge level={primaryAgency.portalServiceLevel} size="xs" />
            )}
          </div>
          <dl className="mt-3 space-y-2.5 text-sm">
            <ProfileRow label="Agency name" value={agencyName} />
            <ProfileRow label="Company" value={agencyCompany} />
            {primaryAgency?.contactName && (
              <ProfileRow label="Contact name" value={primaryAgency.contactName} />
            )}
            {primaryAgency?.contactEmail && (
              <ProfileRow label="Contact email" value={primaryAgency.contactEmail} />
            )}
            {primaryAgency?.contactPhone && (
              <ProfileRow label="Contact phone" value={primaryAgency.contactPhone} />
            )}
          </dl>
        </section>

        <Link
          href={ROUTES.SETTINGS}
          className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm active:bg-secondary/50"
        >
          <span className="flex items-center gap-2">
            <Settings className="text-muted-foreground size-4" />
            Settings & notifications
          </span>
          <ChevronRight className="text-muted-foreground size-4" />
        </Link>

        <div className="flex rounded-lg border bg-card p-1">
          {(
            [
              { id: 'contacts' as const, label: 'Phonebook' },
              { id: 'history' as const, label: 'History' },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
                tab === id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'contacts' ? (
          <div className="space-y-6">
            <PhonebookSection
              title="Landlords"
              icon={Building2}
              entries={phonebook.landlords}
              emptyLabel="No landlords in your portfolio"
            />
            <PhonebookSection
              title="Tenants"
              icon={User}
              entries={phonebook.tenants}
              emptyLabel="No tenants in your portfolio"
            />
          </div>
        ) : (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <History className="text-muted-foreground size-4" />
              <h2 className="text-sm font-semibold">Your activity</h2>
            </div>
            {history.length === 0 ? (
              <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
                Messages you send and rent review decisions will appear here.
              </div>
            ) : (
              history.map((item) => {
                const content = (
                  <div className="rounded-xl border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                          {item.detail}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-[10px]">
                        {formatRelative(item.at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-2 text-[10px]">
                      {formatDateTime(item.at)}
                    </p>
                  </div>
                );

                return item.href ? (
                  <Link key={item.id} href={item.href} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={item.id}>{content}</div>
                );
              })
            )}
          </section>
        )}

        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
          onClick={() => void logout()}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </AgentShell>
  );
}

function ProfileRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  const display = value?.trim() || '—';
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{display}</dd>
    </div>
  );
}

function PhonebookSection({
  title,
  icon: Icon,
  entries,
  emptyLabel,
}: {
  title: string;
  icon: typeof User;
  entries: ReturnType<typeof buildPhonebook>['landlords'];
  emptyLabel: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="text-muted-foreground size-4" />
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-muted-foreground text-xs">({entries.length})</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          {emptyLabel}
        </p>
      ) : (
        entries.map((entry) => (
          <div key={entry.id} className="rounded-xl border bg-card p-3">
            <p className="font-medium">{entry.name}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {entry.properties.join(' · ')}
            </p>
            <div className="text-muted-foreground mt-2 space-y-1 text-xs">
              {entry.contact.phone && (
                <a
                  href={`tel:${entry.contact.phone.replace(/\s/g, '')}`}
                  className="flex items-center gap-1.5 hover:text-foreground"
                >
                  <Phone className="size-3 shrink-0" />
                  {entry.contact.phone}
                </a>
              )}
              {entry.contact.email && (
                <a
                  href={`mailto:${entry.contact.email}`}
                  className="flex items-center gap-1.5 hover:text-foreground"
                >
                  <Mail className="size-3 shrink-0" />
                  {entry.contact.email}
                </a>
              )}
              {!entry.contact.phone && !entry.contact.email && (
                <span>No contact on file</span>
              )}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
