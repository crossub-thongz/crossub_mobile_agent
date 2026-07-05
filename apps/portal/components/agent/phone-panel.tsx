'use client';

import { useMemo, useState } from 'react';
import { Phone, PhoneCall, Search, X } from 'lucide-react';
import { toast } from 'sonner';

import { DialPad } from '@/components/agent/dial-pad';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Input } from '@/components/ui/input';
import {
  AGENT_PHONEBOOK_GROUP_LABEL,
  buildAgentPhonebook,
  type AgentPhonebookGroup,
} from '@/lib/agent-phonebook';
import { placePhoneCall } from '@/lib/phone';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'dial' as const, label: 'Dial pad' },
  { id: 'contacts' as const, label: 'Contacts' },
];

const CONTACT_GROUPS: AgentPhonebookGroup[] = ['tenant', 'landlord', 'agency'];

export function PhonePanel({
  variant = 'sheet',
  onClose,
  className,
}: {
  variant?: 'sheet' | 'embedded';
  onClose?: () => void;
  className?: string;
}) {
  const { properties, agencies } = useAgentData();
  const [tab, setTab] = useState<'dial' | 'contacts'>('dial');
  const [dialNumber, setDialNumber] = useState('');
  const [search, setSearch] = useState('');

  const phonebook = useMemo(
    () => buildAgentPhonebook(properties, agencies),
    [properties, agencies],
  );

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

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {variant === 'sheet' && onClose ? (
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold">Calls</p>
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

      {tab === 'dial' ? (
        <DialPad
          value={dialNumber}
          onChange={setDialNumber}
          onDigit={(digit) => setDialNumber((n) => n + digit)}
          onBackspace={() => setDialNumber((n) => n.slice(0, -1))}
          onClear={() => setDialNumber('')}
          onCall={() => handleCall(dialNumber)}
          listenToKeyboard
          className={variant === 'embedded' ? 'min-h-[440px]' : undefined}
        />
      ) : (
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
                                {contact.phone}
                                {contact.subtitle ? ` · ${contact.subtitle}` : ''}
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
      )}
    </div>
  );
}
