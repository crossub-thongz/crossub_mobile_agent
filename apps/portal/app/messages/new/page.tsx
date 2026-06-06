'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail, ROUTES } from '@/constants/routes';
import type { MessageCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

const CATEGORIES: MessageCategory[] = [
  'Leasing',
  'Maintenance',
  'Inspection',
  'Accounting',
  'Others',
];

const RECIPIENTS: Record<MessageCategory, string[]> = {
  Leasing: ['Leasing team', 'Landlord', 'Tenant'],
  Maintenance: ['Maintenance team', 'Contractor', 'Landlord', 'Tenant'],
  Inspection: ['Inspector', 'Inspection team', 'Landlord'],
  Accounting: ['Accounting team', 'Landlord', 'Tenant'],
  Others: ['CROSSUB support', 'Landlord', 'Tenant'],
};

const MESSAGE_TYPES = ['App message', 'Email', 'Internal message'] as const;

export default function NewMessagePage() {
  const router = useRouter();
  const { properties, ensureMessageThread } = useAgentData();
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [category, setCategory] = useState<MessageCategory>('Others');
  const [recipient, setRecipient] = useState('');
  const [messageType, setMessageType] = useState<(typeof MESSAGE_TYPES)[number]>('App message');

  const filteredProperties = useMemo(() => {
    if (!search.trim()) return properties;
    const q = search.toLowerCase();
    return properties.filter(
      (p) =>
        p.address.toLowerCase().includes(q) ||
        p.suburb.toLowerCase().includes(q) ||
        p.tenantName.toLowerCase().includes(q),
    );
  }, [properties, search]);

  const selected = properties.find((p) => p.id === propertyId);

  const onStart = () => {
    if (!propertyId) {
      toast.error('Select a property');
      return;
    }
    const subject = `${category} — ${recipient || 'General'}`;
    const threadId = ensureMessageThread(propertyId, { category, subject });
    if (!threadId) {
      toast.error('Could not create message thread');
      return;
    }
    toast.success(`New ${messageType.toLowerCase()} thread started`);
    router.push(messageDetail(threadId));
  };

  return (
    <AgentShell title="New message" backHref={ROUTES.MESSAGES}>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>Property</Label>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search property address…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-1">
            {filteredProperties.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPropertyId(p.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-sm',
                  propertyId === p.id ? 'bg-primary/10 text-primary' : 'hover:bg-secondary',
                )}
              >
                {p.address}, {p.suburb}
              </button>
            ))}
          </div>
          {selected && (
            <p className="text-muted-foreground text-xs">
              Selected: {selected.address} — {selected.tenantName}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setRecipient('');
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium',
                  category === c
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Recipient</Label>
          <div className="flex flex-wrap gap-2">
            {RECIPIENTS[category].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecipient(r)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium',
                  recipient === r
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Message type</Label>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as (typeof MESSAGE_TYPES)[number])}
            className="border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30"
          >
            {MESSAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <Button className="w-full" onClick={onStart}>
          Start conversation
        </Button>
      </div>
    </AgentShell>
  );
}
