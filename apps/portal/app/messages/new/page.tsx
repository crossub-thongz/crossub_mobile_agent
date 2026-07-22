'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, Search } from 'lucide-react';
import { toast } from 'sonner';

import { FormStep, SelectChip } from '@/components/agent/form-step';
import { PageIntro } from '@/components/agent/page-intro';
import { PropertyNewMessageRecipients } from '@/components/agent/property-new-message-recipients';
import { AgentShell } from '@/components/layout/agent-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { messageDetail, ROUTES } from '@/constants/routes';
import type { MessageCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

const CATEGORIES: MessageCategory[] = [
  'Leasing',
  'Maintenance',
  'Inspection',
  'Accounting',
  'Tribunal',
  'Others',
];

const RECIPIENTS: Record<MessageCategory, string[]> = {
  Leasing: ['Leasing team', 'Landlord', 'Tenant'],
  Maintenance: ['Maintenance team', 'Contractor', 'Landlord', 'Tenant'],
  Inspection: ['Inspector', 'Inspection team', 'Landlord'],
  Accounting: ['Accounting team', 'Landlord', 'Tenant'],
  Tribunal: ['Tribunal team', 'Landlord', 'Tenant'],
  Others: ['CROSSUB support', 'Landlord', 'Tenant'],
};

const MESSAGE_TYPES = ['App message', 'Email', 'Internal message'] as const;

export default function NewMessagePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { properties, ensureMessageThread } = useAgentData();
  const [search, setSearch] = useState('');
  const [propertyId, setPropertyId] = useState(() => searchParams.get('property') ?? '');
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
  const step = !propertyId ? 1 : !category ? 2 : 3;

  if (selected && searchParams.get('property')) {
    return (
      <AgentShell
        title="New message"
        backHref={`/properties/${selected.id}`}
        backLabel="Property"
      >
        <div className="space-y-4">
          <PageIntro description="Choose who to message for this property." />
          <PropertyNewMessageRecipients property={selected} />
        </div>
      </AgentShell>
    );
  }

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
      <div className="space-y-4">
        <PageIntro description="Choose a property, category, and recipient to start a tracked conversation." />

        <FormStep
          step={1}
          title="Select property"
          description="Search your portfolio"
          active={step === 1}
        >
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search address or tenant…"
              className="rounded-xl pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-3 max-h-44 space-y-1.5 overflow-y-auto">
            {filteredProperties.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPropertyId(p.id)}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition',
                  propertyId === p.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/30',
                )}
              >
                <MapPin className="text-primary mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-medium">{p.address}</span>
                  <span className="text-muted-foreground block text-xs">{p.suburb}</span>
                </span>
              </button>
            ))}
          </div>
        </FormStep>

        <FormStep
          step={2}
          title="Category"
          description="What is this message about?"
          active={step >= 2}
        >
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <SelectChip
                key={c}
                selected={category === c}
                onClick={() => {
                  setCategory(c);
                  setRecipient('');
                }}
              >
                {c}
              </SelectChip>
            ))}
          </div>
        </FormStep>

        <FormStep
          step={3}
          title="Recipient & type"
          description="Who should receive this?"
          active={step >= 3}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {RECIPIENTS[category].map((r) => (
                <SelectChip key={r} selected={recipient === r} onClick={() => setRecipient(r)}>
                  {r}
                </SelectChip>
              ))}
            </div>
            <select
              value={messageType}
              onChange={(e) => setMessageType(e.target.value as (typeof MESSAGE_TYPES)[number])}
              className="border-input h-10 w-full rounded-xl border bg-transparent px-3 text-sm outline-none dark:bg-input/30"
            >
              {MESSAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </FormStep>

        {selected && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs">
            <span className="text-muted-foreground">Summary · </span>
            <span className="font-medium">
              {selected.address} · {category} · {recipient || 'General'} · {messageType}
            </span>
          </div>
        )}

        <Button className="w-full rounded-xl" size="lg" onClick={onStart}>
          Start conversation
        </Button>
      </div>
    </AgentShell>
  );
}
