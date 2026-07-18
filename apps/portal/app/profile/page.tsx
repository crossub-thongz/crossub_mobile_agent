'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Building2, ChevronRight, History, LogOut, Mail, Phone, Settings, User } from 'lucide-react';
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
