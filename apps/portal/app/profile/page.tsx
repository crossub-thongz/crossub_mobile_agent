'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, History, LogOut, Mail, Phone, Settings, User, Users } from 'lucide-react';
import { toast } from 'sonner';

import { AgentShell } from '@/components/layout/agent-shell';
import { PortalServiceLevelBadge } from '@/components/agent/portal-service-level-badge';
import { useAuth } from '@/components/providers/auth-provider';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateAgencyBilling } from '@/lib/crossub-api/agent-client';
import { buildProfileHistory } from '@/lib/profile-history';
import { buildPhonebook } from '@/lib/phonebook';
import { ROUTES } from '@/constants/routes';
import { getLocalSessionAccount } from '@/lib/local-auth';
import { useAgentStore } from '@/lib/store';
import { cn, displayName, formatDateTime, formatRelative } from '@/lib/utils';

type ProfileTab = 'history' | 'contacts';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const {
    properties,
    messages,
    rentReviews,
    primaryAgency,
    portalAccessReady,
    refresh,
  } = useAgentData();
  const sentThreadMessages = useAgentStore((s) => s.sentThreadMessages);
  const rentReviewDecisions = useAgentStore((s) => s.rentReviewDecisions);
  const [tab, setTab] = useState<ProfileTab>('contacts');
  const [billingSaving, setBillingSaving] = useState(false);
  const [abn, setAbn] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankBsb, setBankBsb] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');

  useEffect(() => {
    setAbn(primaryAgency?.abn ?? '');
    setLicenceNumber(primaryAgency?.licenceNumber ?? '');
    setBankName(primaryAgency?.bankName ?? '');
    setBankAccountName(primaryAgency?.bankAccountName ?? '');
    setBankBsb(primaryAgency?.bankBsb ?? '');
    setBankAccountNumber(primaryAgency?.bankAccountNumber ?? '');
  }, [primaryAgency]);

  const phonebook = buildPhonebook(properties);
  const history = buildProfileHistory({
    messages,
    sentThreadMessages,
    rentReviewDecisions,
    rentReviews,
  });
  const phonebookCount = phonebook.landlords.length + phonebook.tenants.length;

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

        <ProfileSectionTabs
          active={tab}
          onChange={setTab}
          phonebookCount={phonebookCount}
          historyCount={history.length}
        />

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
            <div className="flex items-center gap-2 lg:hidden">
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
            {primaryAgency && portalAccessReady && (
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

        {primaryAgency ? (
          <section className="rounded-xl border bg-card p-4">
            <h2 className="text-sm font-semibold">Invoice billing details</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              ABN, licence, and bank details used on Crossub tax invoices.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <BillingField label="ABN">
                <Input value={abn} onChange={(e) => setAbn(e.target.value)} disabled={billingSaving} />
              </BillingField>
              <BillingField label="Licence number">
                <Input
                  value={licenceNumber}
                  onChange={(e) => setLicenceNumber(e.target.value)}
                  disabled={billingSaving}
                />
              </BillingField>
              <BillingField label="Bank name">
                <Input
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={billingSaving}
                />
              </BillingField>
              <BillingField label="Account name">
                <Input
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  disabled={billingSaving}
                />
              </BillingField>
              <BillingField label="BSB">
                <Input
                  value={bankBsb}
                  onChange={(e) => setBankBsb(e.target.value)}
                  disabled={billingSaving}
                />
              </BillingField>
              <BillingField label="Account number">
                <Input
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  disabled={billingSaving}
                />
              </BillingField>
            </div>
            <Button
              type="button"
              className="mt-3"
              size="sm"
              disabled={billingSaving}
              onClick={() => {
                void (async () => {
                  setBillingSaving(true);
                  try {
                    await updateAgencyBilling(primaryAgency.id, {
                      abn: abn.trim() || undefined,
                      licenceNumber: licenceNumber.trim() || undefined,
                      bankName: bankName.trim() || undefined,
                      bankAccountName: bankAccountName.trim() || undefined,
                      bankBsb: bankBsb.trim() || undefined,
                      bankAccountNumber: bankAccountNumber.trim() || undefined,
                    });
                    await refresh({ force: true });
                    toast.success('Billing details saved');
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : 'Could not save billing details',
                    );
                  } finally {
                    setBillingSaving(false);
                  }
                })();
              }}
            >
              {billingSaving ? 'Saving…' : 'Save billing details'}
            </Button>
          </section>
        ) : null}

        {/* Sales service-agreement lock retired — hide until signing is required again.
        <ProfileAgreementsSection />
        */}

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

function ProfileSectionTabs({
  active,
  onChange,
  phonebookCount,
  historyCount,
}: {
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  phonebookCount: number;
  historyCount: number;
}) {
  const tabs = [
    { id: 'contacts' as const, label: 'Phonebook', shortLabel: 'Contacts', icon: Users, count: phonebookCount },
    { id: 'history' as const, label: 'History', shortLabel: 'History', icon: History, count: historyCount },
  ];

  return (
    <div
      className={cn(
        'sticky top-[var(--shell-header-height,3.5rem)] z-30 -mx-4 border-b border-border/60 bg-background/95 px-4 py-2 backdrop-blur-md supports-[backdrop-filter]:bg-background/85 lg:static lg:mx-0 lg:rounded-xl lg:border lg:bg-card lg:p-1 lg:backdrop-blur-none',
      )}
    >
      <div className="grid grid-cols-2 gap-2 lg:gap-1">
        {tabs.map(({ id, label, shortLabel, icon: Icon, count }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl px-3 py-3 transition-colors lg:flex-row lg:justify-center lg:gap-2 lg:rounded-md lg:py-2.5',
                isActive
                  ? 'bg-primary/10 text-primary lg:bg-primary lg:text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground lg:bg-transparent',
              )}
            >
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-xl lg:size-auto lg:rounded-none lg:bg-transparent',
                  isActive ? 'bg-primary/15 lg:bg-transparent' : 'bg-background/80 lg:bg-transparent',
                )}
              >
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="flex flex-col items-center lg:flex-row lg:gap-1.5">
                <span className="text-xs font-semibold lg:text-sm">
                  <span className="lg:hidden">{shortLabel}</span>
                  <span className="hidden lg:inline">{label}</span>
                </span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    isActive
                      ? 'bg-primary/15 text-primary lg:bg-primary-foreground/20 lg:text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BillingField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <Label className="text-muted-foreground mb-1.5 text-xs">{label}</Label>
      {children}
    </div>
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
        entries.map((entry) => {
          const initials = entry.name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0] ?? '')
            .join('')
            .toUpperCase();

          return (
            <div key={entry.id} className="flex gap-3 rounded-2xl border bg-card p-3">
              <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
                {initials || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-snug">{entry.name}</p>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                  {entry.properties.join(' · ')}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {entry.contact.phone ? (
                    <a
                      href={`tel:${entry.contact.phone.replace(/\s/g, '')}`}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                    >
                      <Phone className="size-3 shrink-0" />
                      Call
                    </a>
                  ) : null}
                  {entry.contact.email ? (
                    <a
                      href={`mailto:${entry.contact.email}`}
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-secondary"
                    >
                      <Mail className="size-3 shrink-0" />
                      Email
                    </a>
                  ) : null}
                  {!entry.contact.phone && !entry.contact.email ? (
                    <span className="text-muted-foreground text-xs">No contact on file</span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
