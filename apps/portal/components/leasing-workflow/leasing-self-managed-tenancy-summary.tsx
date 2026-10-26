'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { StepCard, StepFact } from '@/components/leasing-workflow/leasing-step-kit';
import { Button } from '@/components/ui/button';
import { propertyDetail } from '@/constants/routes';
import { CREATE_TENANCY_COPY as COPY } from '@/constants/self-managed-tenancy';
import { LEASING_ITEM_STATUS, LEASING_UI } from '@/lib/leasing/constants';
import {
  listPropertyContacts,
  sendTenantLogin,
  type AgentPropertyContact,
} from '@/lib/crossub-api/agent-client';
import {
  recordedTenancySummary,
  recordedTenantContacts,
  type RecordedTenant,
} from '@/lib/leasing/self-managed-tenancy';
import { apiErrorMessage } from '@/lib/utils/api-error-message';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

/**
 * Self-Manage: the tenancy the agency recorded with "Create tenancy" (Results), and on the
 * Tenancy step what is left to do outside this letting.
 */
export function LeasingSelfManagedTenancySummary({
  detail,
  showNextSteps = false,
}: {
  detail: LeasingPropertyDetail;
  showNextSteps?: boolean;
}) {
  const summary = recordedTenancySummary(detail);
  const dateText = (iso?: string) => (iso ? formatDate(iso.slice(0, 10)) : COPY.noValue);

  return (
    <StepCard
      icon={Home}
      title={COPY.recordedTitle}
      description={COPY.recordedHint}
      status={LEASING_ITEM_STATUS.DONE}
      footer={
        <Button asChild size="sm" variant="ghost" className={cn('gap-1.5', LEASING_UI.btnSecondary)}>
          <Link href={propertyDetail(detail.propertyId)}>{COPY.openProperty}</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StepFact
          className="col-span-2 sm:col-span-3"
          label={COPY.tenants}
          value={summary.tenantNames.length > 0 ? summary.tenantNames.join(', ') : COPY.noValue}
        />
        <StepFact
          label={COPY.weeklyRent}
          value={summary.weeklyRent != null ? formatCurrency(summary.weeklyRent) : COPY.noValue}
        />
        <StepFact
          label={COPY.bond}
          value={summary.bond != null ? formatCurrency(summary.bond) : COPY.noValue}
        />
        <StepFact label={COPY.leaseTerm} value={summary.leaseTerm || COPY.noValue} />
        <StepFact label={COPY.starts} value={dateText(summary.startDate)} />
        <StepFact label={COPY.ends} value={dateText(summary.endDate)} />
      </div>
      <LeasingSelfManagedTenantInvites propertyId={detail.propertyId} tenants={summary.tenants} />
      {showNextSteps ? (
        <div className="mt-3 space-y-1">
          <p className={LEASING_UI.sectionLabel}>{COPY.nextStepsTitle}</p>
          <ul className="text-muted-foreground list-disc space-y-0.5 pl-4 text-xs">
            {COPY.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </StepCard>
  );
}

/**
 * "Invite to tenant app" per recorded tenant. Create tenancy adds each tenant as a TENANT contact
 * without emailing anyone; this sends that contact a login through the property's existing
 * "Send tenant login" route (409 when they already have one).
 */
function LeasingSelfManagedTenantInvites({
  propertyId,
  tenants,
}: {
  propertyId: string;
  tenants: readonly RecordedTenant[];
}) {
  const [contacts, setContacts] = useState<AgentPropertyContact[] | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<ReadonlySet<string>>(() => new Set());
  // Re-read the contacts only when who the tenancy names changes, not on every live poll.
  const tenantKey = tenants.map((t) => `${t.name}|${t.email ?? ''}`).join(';');

  useEffect(() => {
    let active = true;
    void listPropertyContacts(propertyId)
      .then((rows) => {
        if (active) setContacts(recordedTenantContacts(rows, tenants));
      })
      .catch((err) => {
        if (!active) return;
        setContacts([]);
        toast.error(apiErrorMessage(err));
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on `tenantKey`, see above
  }, [propertyId, tenantKey]);

  const invite = async (contact: AgentPropertyContact) => {
    setPendingId(contact.id);
    try {
      const sent = await sendTenantLogin(propertyId, contact.id);
      setInvitedIds((prev) => new Set(prev).add(contact.id));
      toast.success(COPY.inviteSent(sent.email));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className={LEASING_UI.sectionLabel}>{COPY.invitesTitle}</p>
      <p className="text-muted-foreground text-xs">{COPY.invitesHint}</p>
      {contacts === null ? (
        <p className="text-muted-foreground text-xs">{COPY.invitesLoading}</p>
      ) : contacts.length === 0 ? (
        <p className="text-muted-foreground text-xs">{COPY.invitesNone}</p>
      ) : (
        <ul className="space-y-1.5">
          {contacts.map((contact) => {
            const invited = invitedIds.has(contact.id);
            return (
              <li key={contact.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[13px]">
                  {contact.name ?? contact.email ?? COPY.noValue}
                  {contact.email ? (
                    <span className="text-muted-foreground"> · {contact.email}</span>
                  ) : null}
                </span>
                {contact.email ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={cn('h-7 text-xs', LEASING_UI.btnSecondary)}
                    disabled={invited || pendingId !== null}
                    onClick={() => void invite(contact)}
                  >
                    {invited
                      ? COPY.invited
                      : pendingId === contact.id
                        ? COPY.inviting
                        : COPY.invite}
                  </Button>
                ) : (
                  <span className="text-muted-foreground text-xs">{COPY.noEmail}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Self-Manage Tenancy step before a tenancy exists: send the agent back to Results. */
export function LeasingSelfManagedTenancyWaiting({ onGoToResults }: { onGoToResults: () => void }) {
  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3">
      <p className="text-muted-foreground text-xs">{COPY.tenancyWaiting}</p>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={LEASING_UI.btnSecondary}
        onClick={onGoToResults}
      >
        {COPY.goToResults}
      </Button>
    </div>
  );
}
