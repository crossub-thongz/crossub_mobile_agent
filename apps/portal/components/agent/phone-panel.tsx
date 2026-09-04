'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, PhoneCall, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { CrosAssistantLogo } from '@/components/brand/cros-assistant-logo';
import { TalkToStaffSupportButton } from '@/components/agent/talk-to-staff-button';
import { CROS_ASSISTANT_NAME } from '@/constants/cros-branding';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import {
  AGENT_PHONEBOOK_GROUP_LABEL,
  buildAgentPhonebook,
  phonebookContactsForProperty,
  resolveAccountManagerContact,
  type AgentAccountManager,
  type AgentPhonebookContact,
  type AgentPhonebookGroup,
} from '@/lib/agent-phonebook';
import { buildDialString, placePhoneCall } from '@/lib/phone';
import { useShellDockStore } from '@/lib/shell-dock-store';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

const TABS = [
  { id: 'contacts' as const, label: 'Contacts' },
  { id: 'account-manager' as const, label: 'Account Manager' },
];

const CONTACT_GROUPS: AgentPhonebookGroup[] = [
  'crossub',
  'tenant',
  'landlord',
  'agency',
];

/**
 * What a contact row shows under the name.
 *
 * Geng Xu, 24 Aug 2026: *"AGENT联系的时候，不显示电话号码。属于哪个AGENT就联系到谁"* — in the
 * Contacts list, CROSSUB rows show only the subtitle (not the shared agency line), because
 * printing it beside a named person invites an agency to save it as that person's number.
 * The dedicated Account Manager tab still shows the line so desktop agents can read or copy it.
 */
function contactCaption(contact: AgentPhonebookContact): string {
  const parts = contact.group === 'crossub' ? [] : [contact.phone];
  if (contact.subtitle) parts.push(contact.subtitle);
  return parts.join(' · ');
}

/**
 * What the card promises under the Call button.
 *
 * A manager is reached one of two ways and the promise has to match: on their own direct
 * line, where the call simply rings them, or on the shared agency line, where a key gets past
 * the menu. The API sends a key only in the second case — so "no key" cannot be read as "no
 * menu", and this stays deliberately non-committal there rather than promising a direct
 * connection the line may not give.
 */
function accountManagerCaption(manager: AgentAccountManager): string {
  if (!manager.phone) {
    return 'No line available right now — email or message and your Account Manager will call you back.';
  }
  if (manager.extension) {
    return `Connects you straight to ${manager.name}.`;
  }
  return `Calls ${manager.name} — you may hear a short menu first.`;
}

function accountManagerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AM';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function PhonePanel({
  variant = 'sheet',
  onClose,
  className,
  propertyId,
}: {
  variant?: 'sheet' | 'embedded';
  onClose?: () => void;
  className?: string;
  /** When set, show only this property's tenant and landlord contacts. */
  propertyId?: string;
}) {
  const { properties, agencies } = useAgentData();
  const openGii = useShellDockStore((s) => s.openGii);
  const closePanel = useShellDockStore((s) => s.closePanel);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('contacts');
  const [search, setSearch] = useState('');
  // Which property the Account Manager tab is answering for. An agency's portfolio can be
  // split across two managers, so "who is my Account Manager" has no answer until a property
  // is named — opening the panel from a property answers it, opening it from the dashboard
  // does not, and the tab asks.
  const [amPropertyId, setAmPropertyId] = useState<string | undefined>(propertyId);
  const [amSearch, setAmSearch] = useState('');

  // Re-opening the panel on a different property must move the tab with it. The dock keeps
  // this component mounted, so without this the card would keep answering for the address the
  // agent looked at last — the exact wrong-manager failure this step exists to prevent.
  useEffect(() => {
    if (propertyId) setAmPropertyId(propertyId);
  }, [propertyId]);

  const property = propertyId ? properties.find((p) => p.id === propertyId) : undefined;
  const amProperty = amPropertyId
    ? properties.find((p) => p.id === amPropertyId)
    : undefined;

  const phonebook = useMemo(() => {
    const all = buildAgentPhonebook(properties, agencies);
    if (!propertyId) return all;
    return phonebookContactsForProperty(propertyId, all);
  }, [properties, agencies, propertyId]);

  const accountManager = useMemo(
    () =>
      amPropertyId
        ? resolveAccountManagerContact(properties, agencies, amPropertyId)
        : null,
    [properties, agencies, amPropertyId],
  );
  const accountManagerPhone = accountManager?.phone;
  const accountManagerName = accountManager?.name;
  const accountManagerExtension = accountManager?.extension;

  const propertyLabel = property ? formatPropertyFullAddress(property) : undefined;

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return phonebook;
    return phonebook.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [phonebook, search]);

  const amProperties = useMemo(() => {
    const q = amSearch.trim().toLowerCase();
    const rows = q
      ? properties.filter((p) =>
          formatPropertyFullAddress(p).toLowerCase().includes(q),
        )
      : properties;
    // The address is what an agent recognises, so sort by it rather than by whatever order
    // the portfolio arrived in.
    return [...rows].sort((a, b) =>
      formatPropertyFullAddress(a).localeCompare(formatPropertyFullAddress(b)),
    );
  }, [properties, amSearch]);

  const handleCall = (number: string, name?: string, extension?: string) => {
    if (!number.trim()) return;
    placePhoneCall(number, extension);
    toast.success(`Calling ${name ?? number}…`);
  };

  const openGiiAccountManager = () => {
    onClose?.();
    closePanel();
    // The property the agent chose in this tab wins over the one the panel was opened from,
    // for the same reason the message thread uses it: it is the address they are asking about.
    const context = amProperty ?? property;
    if (context) {
      openGii({
        propertyId: context.id,
        propertyAddress: formatPropertyFullAddress(context),
      });
      return;
    }
    openGii();
  };

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {variant === 'sheet' && onClose ? (
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <p className="text-sm font-semibold">Contacts & Account Manager</p>
            </div>
            {propertyLabel ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">{propertyLabel}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X className="text-muted-foreground size-5" />
          </button>
        </div>
      ) : null}

      <div className="border-border/60 flex shrink-0 gap-2 border-b px-4 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'contacts' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-border/60 relative shrink-0 border-b p-2">
            <Search className="text-muted-foreground absolute top-1/2 left-4 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenants, landlords, agencies…"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <li className="text-muted-foreground px-4 py-8 text-center text-sm">
                No contacts with phone numbers on file.
              </li>
            ) : (
              CONTACT_GROUPS.map((group) => {
                const groupContacts = filteredContacts.filter((c) => c.group === group);
                if (groupContacts.length === 0) return null;
                return (
                  <li key={group}>
                    <p className="bg-card/95 text-muted-foreground sticky top-0 px-3 py-1.5 text-[10px] font-semibold tracking-wide uppercase">
                      {AGENT_PHONEBOOK_GROUP_LABEL[group]}
                    </p>
                    <ul>
                      {groupContacts.map((contact) => (
                        <li key={contact.id}>
                          <button
                            type="button"
                            onClick={() => handleCall(contact.phone, contact.name, contact.extension)}
                            className="border-border/40 hover:bg-muted/40 flex w-full items-center justify-between gap-2 border-b px-3 py-2.5 text-left text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium">{contact.name}</p>
                              <p className="text-muted-foreground truncate text-xs">
                                {contactCaption(contact)}
                              </p>
                            </div>
                            <PhoneCall className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {/*
            Which property, before which manager. An agency's portfolio can sit with two
            different Account Managers, so a card shown before a property is named is a guess
            — and a guess that dials. Naming the property first is the whole point of this
            step: the card below then answers for that address and nothing else.
          */}
          {amProperty ? (
            <div className="border-border/60 flex items-center justify-between gap-2 rounded-xl border px-3 py-2">
              <div className="min-w-0">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
                  Property
                </p>
                <p className="truncate text-sm font-medium">
                  {formatPropertyFullAddress(amProperty)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAmPropertyId(undefined);
                  setAmSearch('');
                }}
                className="text-primary shrink-0 text-xs font-semibold"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="text-sm font-semibold">Which property?</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Your portfolio is looked after by more than one Account Manager, so pick the
                  address you are calling about.
                </p>
              </div>
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  value={amSearch}
                  onChange={(e) => setAmSearch(e.target.value)}
                  placeholder="Search your properties…"
                  className="h-8 pl-8 text-sm"
                />
              </div>
              <ul className="border-border/60 max-h-64 overflow-y-auto rounded-xl border">
                {amProperties.length === 0 ? (
                  <li className="text-muted-foreground px-3 py-6 text-center text-sm">
                    No property matches that address.
                  </li>
                ) : (
                  amProperties.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setAmPropertyId(p.id)}
                        className="border-border/40 hover:bg-muted/40 w-full border-b px-3 py-2.5 text-left text-sm last:border-b-0"
                      >
                        <span className="block truncate font-medium">
                          {formatPropertyFullAddress(p)}
                        </span>
                        {p.accountManagerName ? (
                          <span className="text-muted-foreground block truncate text-xs">
                            {p.accountManagerName}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
          {amProperty && accountManager ? (
            <div className="bg-card rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  {accountManagerInitials(accountManager.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{accountManager.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    CROSSUB Account Manager
                  </p>
                  {accountManagerPhone ? (
                    <a
                      href={`tel:${buildDialString(accountManagerPhone, accountManagerExtension)}`}
                      className="text-emerald-700 dark:text-emerald-300 mt-1 block truncate text-sm font-medium tabular-nums hover:underline"
                    >
                      {accountManagerPhone}
                    </a>
                  ) : null}
                </div>
              </div>
              {accountManagerPhone ? (
                <button
                  type="button"
                  onClick={() =>
                    handleCall(accountManagerPhone, accountManagerName, accountManagerExtension)
                  }
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  <PhoneCall className="size-4 shrink-0" />
                  Call your Account Manager
                </button>
              ) : null}
              {accountManager.email ? (
                <a
                  href={`mailto:${accountManager.email}`}
                  className="border-border/60 hover:bg-muted/40 mt-2 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition"
                >
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">Email {accountManager.email}</span>
                </a>
              ) : null}
              <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                {accountManagerCaption(accountManager)}
              </p>
            </div>
          ) : null}
          <p className="text-muted-foreground text-xs leading-relaxed">
            Your CROSSUB Account Manager — message the team or ask Gii for help with this portfolio.
          </p>
          {/*
            The message thread is scoped to the property the agent just named, not to the one
            the panel happened to be opened from — otherwise choosing an address here and then
            messaging would file the message against a different home.
          */}
          {amPropertyId ? (
            <TalkToStaffSupportButton propertyId={amPropertyId} onOpened={onClose} />
          ) : (
            <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-3 text-sm">
              Choose a property above to start a property-scoped message with your Account
              Manager.
            </p>
          )}
          <button
            type="button"
            onClick={openGiiAccountManager}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3.5 text-sm font-semibold text-primary transition hover:bg-primary/10"
          >
            <CrosAssistantLogo size="sm" className="size-4 shrink-0" />
            Ask {CROS_ASSISTANT_NAME}, your Account Manager
          </button>
        </div>
      )}
    </div>
  );
}
