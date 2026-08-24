'use client';

import { useMemo, useState } from 'react';
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
  type AgentPhonebookContact,
  type AgentPhonebookGroup,
} from '@/lib/agent-phonebook';
import { placePhoneCall } from '@/lib/phone';
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
 * Geng Xu, 24 Aug 2026: *"AGENT联系的时候，不显示电话号码。属于哪个AGENT就联系到谁"* — an agency
 * does not see the Account Manager number, because every manager shares one line and the
 * phone system decides who it reaches. Printing it would invite an agency to save it as a
 * personal number for a manager it may not actually route to. Tenants, landlords and agency
 * contacts are real per-person numbers and still show.
 */
function contactCaption(contact: AgentPhonebookContact): string {
  const parts = contact.group === 'crossub' ? [] : [contact.phone];
  if (contact.subtitle) parts.push(contact.subtitle);
  return parts.join(' · ');
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

  const property = propertyId ? properties.find((p) => p.id === propertyId) : undefined;

  const phonebook = useMemo(() => {
    const all = buildAgentPhonebook(properties, agencies);
    if (!propertyId) return all;
    return phonebookContactsForProperty(propertyId, all);
  }, [properties, agencies, propertyId]);

  const accountManager = useMemo(
    () => resolveAccountManagerContact(properties, agencies, propertyId),
    [properties, agencies, propertyId],
  );
  const accountManagerPhone = accountManager?.phone;
  const accountManagerName = accountManager?.name;

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

  const handleCall = (number: string, name?: string) => {
    if (!number.trim()) return;
    placePhoneCall(number);
    toast.success(`Calling ${name ?? number}…`);
  };

  const openGiiAccountManager = () => {
    onClose?.();
    closePanel();
    if (propertyId && property) {
      openGii({ propertyId, propertyAddress: formatPropertyFullAddress(property) });
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
                            onClick={() => handleCall(contact.phone, contact.name)}
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
          {accountManager ? (
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
                </div>
              </div>
              {accountManagerPhone ? (
                <button
                  type="button"
                  onClick={() => handleCall(accountManagerPhone, accountManagerName)}
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
                {accountManagerPhone
                  ? 'Calls go straight to the manager looking after your portfolio.'
                  : 'No line available right now — email or message and your Account Manager will call you back.'}
              </p>
            </div>
          ) : null}
          <p className="text-muted-foreground text-xs leading-relaxed">
            Your CROSSUB Account Manager — message the team or ask Gii for help with this portfolio.
          </p>
          {propertyId ? (
            <TalkToStaffSupportButton propertyId={propertyId} onOpened={onClose} />
          ) : (
            <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-3 text-sm">
              Open a property to start a property-scoped message with your Account Manager.
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
