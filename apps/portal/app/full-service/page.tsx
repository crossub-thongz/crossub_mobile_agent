'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { AgentShell } from '@/components/layout/agent-shell';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import { useSelfManagedAccess } from '@/hooks/use-self-managed-access';
import {
  createFullServiceApplication,
  fetchFullServiceApplications,
  FULL_SERVICE_REQUEST_STATUS,
  type FullServiceApplication,
  type FullServiceApplications,
} from '@/lib/crossub-api/service-offer-client';
import { isPropertySelfManaged } from '@/lib/portal-service-level';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

const STATUS_LABEL: Record<string, string> = {
  [FULL_SERVICE_REQUEST_STATUS.PENDING_REVIEW]: 'Pending review',
  [FULL_SERVICE_REQUEST_STATUS.CONFIRMED]: 'Confirmed',
  [FULL_SERVICE_REQUEST_STATUS.ACTIVE]: 'Active',
  [FULL_SERVICE_REQUEST_STATUS.DECLINED]: 'Declined',
};

function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date());
}

function ApplicationStatus({
  request,
  addresses,
}: {
  request: FullServiceApplication;
  addresses: Map<string, string>;
}) {
  const when = request.effectiveDate ?? request.requestedEffectiveDate;
  return (
    <li className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{STATUS_LABEL[request.status] ?? request.status}</p>
        {when ? <p className="text-muted-foreground text-xs">Effective date {when}</p> : null}
      </div>
      <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
        {request.propertyIds.map((id) => (
          <li key={id}>{addresses.get(id) ?? id}</li>
        ))}
      </ul>
      {request.declineReason ? <p className="mt-2 text-sm">{request.declineReason}</p> : null}
    </li>
  );
}

export default function FullServicePage() {
  const { ready, selfManaged } = useSelfManagedAccess();
  const { properties, agencies } = useAgentData();
  const [pack, setPack] = useState<FullServiceApplications | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [effectiveDate, setEffectiveDate] = useState(todayIso);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = useMemo(
    () => properties.filter((property) => isPropertySelfManaged(agencies, property.agencyId)),
    [agencies, properties],
  );
  const addresses = useMemo(
    () => new Map(properties.map((property) => [property.id, property.address])),
    [properties],
  );
  const openPropertyIds = useMemo(() => {
    const ids = new Set<string>();
    for (const request of pack?.requests ?? []) {
      if (
        request.status !== FULL_SERVICE_REQUEST_STATUS.PENDING_REVIEW &&
        request.status !== FULL_SERVICE_REQUEST_STATUS.CONFIRMED
      ) {
        continue;
      }
      for (const id of request.propertyIds) ids.add(id);
    }
    return ids;
  }, [pack]);

  const load = () => {
    fetchFullServiceApplications()
      .then(setPack)
      .catch((err: unknown) => setError(apiErrorMessage(err)));
  };

  useEffect(() => {
    if (!selfManaged) return;
    load();
  }, [selfManaged]);

  if (!ready) return null;
  if (!selfManaged) {
    return (
      <AgentShell title="Full Service">
        <p className="text-muted-foreground text-sm">Full Service applications are for Self-Manage agencies.</p>
      </AgentShell>
    );
  }

  const toggle = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await createFullServiceApplication({
        propertyIds: selected,
        requestedEffectiveDate: effectiveDate,
      });
      toast.success('Application submitted. The effective date does not change the property to Full Service.');
      setSelected([]);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AgentShell title="Full Service" wide>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <section className="rounded-2xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Choose the properties to hand to Crossub</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Submitting records the application. The effective date does not change the agency plan or any property&apos;s service level.
          </p>
          {pack ? (
            <div className="mt-4 space-y-3 text-sm">
              <p>{pack.offer.feeSummary}</p>
              <p className="text-muted-foreground">{pack.offer.termsSummary}</p>
            </div>
          ) : null}
          <label className="mt-4 block text-sm font-medium">
            Effective date
            <input
              type="date"
              min={todayIso()}
              value={effectiveDate}
              onChange={(event) => setEffectiveDate(event.target.value)}
              className="border-input mt-1 block rounded-md border bg-transparent px-3 py-2 text-sm"
            />
          </label>
          <ul className="mt-4 space-y-2">
            {eligible.map((property) => {
              const open = openPropertyIds.has(property.id);
              return (
                <li key={property.id}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.includes(property.id)}
                      disabled={open}
                      onChange={() => toggle(property.id)}
                    />
                    <span>
                      {property.address}
                      {open ? (
                        <span className="text-muted-foreground"> — application already open</span>
                      ) : null}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          {error ? <p className="text-destructive mt-3 text-sm">{error}</p> : null}
          <Button
            className="mt-4"
            disabled={submitting || selected.length === 0 || !effectiveDate}
            onClick={() => void submit()}
          >
            Submit application
          </Button>
        </section>

        <section>
          <h2 className="text-sm font-semibold">Your applications</h2>
          {pack && pack.requests.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {pack.requests.map((request) => (
                <ApplicationStatus key={request.id} request={request} addresses={addresses} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-2 text-sm">No applications yet.</p>
          )}
        </section>
      </div>
    </AgentShell>
  );
}
