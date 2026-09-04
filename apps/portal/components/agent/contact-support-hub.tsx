'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Headphones, Mail, MessageSquare, PhoneCall, Search } from 'lucide-react';
import { toast } from 'sonner';

import { PageIntro } from '@/components/agent/page-intro';
import { TalkToStaffSupportButton } from '@/components/agent/talk-to-staff-button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { useIsAgentUiV2 } from '@/components/providers/agent-ui-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { messageDetail } from '@/constants/routes';
import { resolveAccountManagerContact } from '@/lib/agent-phonebook';
import { buildDialString, placePhoneCall } from '@/lib/phone';
import { findStaffSupportThread } from '@/lib/staff-support-thread';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

function accountManagerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'AM';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function accountManagerCaption(manager: {
  name: string;
  phone?: string;
  extension?: string;
}): string {
  if (!manager.phone) {
    return 'No line available right now — message CROSSUB support and your Account Manager will call you back.';
  }
  if (manager.extension) {
    return `Connects you straight to ${manager.name}.`;
  }
  return `Calls ${manager.name} — you may hear a short menu first.`;
}

export function ContactSupportHub() {
  const isV2 = useIsAgentUiV2();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { properties, agencies, messages } = useAgentData();
  const [propertySearch, setPropertySearch] = useState('');
  const [propertyId, setPropertyId] = useState(() => searchParams.get('property') ?? '');

  useEffect(() => {
    const fromUrl = searchParams.get('property');
    if (fromUrl && properties.some((p) => p.id === fromUrl)) {
      setPropertyId(fromUrl);
      return;
    }
    if (!propertyId && properties.length === 1) {
      setPropertyId(properties[0]!.id);
    }
  }, [properties, propertyId, searchParams]);

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const accountManager = useMemo(
    () => (propertyId ? resolveAccountManagerContact(properties, agencies, propertyId) : null),
    [properties, agencies, propertyId],
  );
  const existingThread = useMemo(
    () => (propertyId ? findStaffSupportThread(messages, propertyId) : undefined),
    [messages, propertyId],
  );

  const filteredProperties = useMemo(() => {
    const q = propertySearch.trim().toLowerCase();
    const rows = q
      ? properties.filter((p) => formatPropertyFullAddress(p).toLowerCase().includes(q))
      : properties;
    return [...rows].sort((a, b) =>
      formatPropertyFullAddress(a).localeCompare(formatPropertyFullAddress(b)),
    );
  }, [properties, propertySearch]);

  const handleCall = () => {
    if (!accountManager?.phone) return;
    placePhoneCall(accountManager.phone, accountManager.extension);
    toast.success(`Calling ${accountManager.name}…`);
  };

  return (
    <div className={cn('space-y-5', isV2 && 'v2-dashboard normal-case')}>
      <PageIntro description="Reach CROSSUB support about a property in your portfolio. Messages go to your Account Manager team in the Communication Hub." />

      {selectedProperty ? (
        <div className="rounded-2xl border bg-gradient-to-br from-card to-secondary/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Property</p>
              <p className="mt-0.5 truncate text-sm font-semibold">
                {formatPropertyFullAddress(selectedProperty)}
              </p>
            </div>
            {properties.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  setPropertyId('');
                  setPropertySearch('');
                }}
                className="text-primary shrink-0 text-xs font-semibold"
              >
                Change
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <section className="space-y-3 rounded-2xl border p-4">
          <div>
            <p className="text-sm font-semibold">Which property?</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              CROSSUB support is property-scoped so your Account Manager sees the right context.
            </p>
          </div>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={propertySearch}
              onChange={(e) => setPropertySearch(e.target.value)}
              placeholder="Search your properties…"
              className="rounded-xl pl-10"
            />
          </div>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {filteredProperties.length === 0 ? (
              <li className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-center text-sm">
                {properties.length === 0
                  ? 'Add a property to contact CROSSUB support.'
                  : 'No property matches that address.'}
              </li>
            ) : (
              filteredProperties.map((property) => (
                <li key={property.id}>
                  <button
                    type="button"
                    onClick={() => setPropertyId(property.id)}
                    className="hover:border-primary/30 flex w-full rounded-xl border px-3 py-2.5 text-left text-sm transition hover:bg-secondary/40"
                  >
                    <span className="block truncate font-medium">
                      {formatPropertyFullAddress(property)}
                    </span>
                    {property.accountManagerName ? (
                      <span className="text-muted-foreground block truncate text-xs">
                        {property.accountManagerName}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {selectedProperty && accountManager ? (
        <section className="space-y-3 rounded-2xl border p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {accountManagerInitials(accountManager.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{accountManager.name}</p>
              <p className="text-muted-foreground text-xs">CROSSUB Account Manager</p>
              {accountManager.phone ? (
                <a
                  href={`tel:${buildDialString(accountManager.phone, accountManager.extension)}`}
                  className="text-primary mt-1 block truncate text-sm font-medium tabular-nums hover:underline"
                >
                  {accountManager.phone}
                </a>
              ) : null}
            </div>
          </div>

          {existingThread ? (
            <Button
              type="button"
              className="w-full rounded-xl"
              size="lg"
              onClick={() => router.push(messageDetail(existingThread.id))}
            >
              <MessageSquare className="size-4" />
              Continue CROSSUB support conversation
            </Button>
          ) : (
            <TalkToStaffSupportButton propertyId={selectedProperty.id} className="rounded-xl" />
          )}

          {accountManager.phone ? (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={handleCall}
            >
              <PhoneCall className="size-4" />
              Call your Account Manager
            </Button>
          ) : null}

          {accountManager.email ? (
            <Button asChild variant="outline" className="w-full rounded-xl">
              <a href={`mailto:${accountManager.email}`}>
                <Mail className="size-4" />
                Email {accountManager.email}
              </a>
            </Button>
          ) : null}

          <p className="text-muted-foreground text-xs leading-relaxed">
            {accountManagerCaption(accountManager)}
          </p>
        </section>
      ) : selectedProperty ? (
        <section className="space-y-3 rounded-2xl border p-4">
          {existingThread ? (
            <Button
              type="button"
              className="w-full rounded-xl"
              size="lg"
              onClick={() => router.push(messageDetail(existingThread.id))}
            >
              <MessageSquare className="size-4" />
              Continue CROSSUB support conversation
            </Button>
          ) : (
            <TalkToStaffSupportButton propertyId={selectedProperty.id} className="rounded-xl" />
          )}
          <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
            <Headphones className="mt-0.5 size-3.5 shrink-0" />
            Your message is routed to CROSSUB support for this property.
          </p>
        </section>
      ) : null}
    </div>
  );
}
