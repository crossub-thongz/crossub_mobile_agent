'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { toast } from 'sonner';

import { FieldLabel, StepCard } from '@/components/agent/maintenance-self-managed/step-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SELF_MANAGED_MAINTENANCE_COPY as COPY } from '@/constants/self-managed-maintenance';
import type { SelfManagedMaintenanceRun } from '@/hooks/use-self-managed-maintenance';
import {
  addPreferredContractor,
  fetchPreferredContractors,
  type PreferredContractor,
} from '@/lib/crossub-api/agent-client';
import {
  inviteMaintenanceContractors,
  type AgentMaintenanceContractorRef,
} from '@/lib/crossub-api/maintenance-client';
import { maintenanceContractorSelectionKey } from '@/lib/maintenance/maintenance-contractor-key';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * Ask the agency's preferred tradies to quote, with an inline "add a tradie" for an agency that
 * has none yet — a Self-Manage agency has no CROSSUB officer to pick them.
 */
export function InviteTradiesStep({
  requestId,
  agencyId,
  invited,
  busy,
  run,
}: {
  requestId: string;
  agencyId: string | null;
  invited: readonly AgentMaintenanceContractorRef[];
  busy: boolean;
  run: SelfManagedMaintenanceRun;
}) {
  const id = useId();
  const [tradies, setTradies] = useState<PreferredContractor[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!agencyId) return;
    try {
      setTradies(await fetchPreferredContractors(agencyId));
      setLoadError(null);
    } catch (err) {
      setLoadError(apiErrorMessage(err));
    }
  }, [agencyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const invitedKeys = new Set(invited.map((c) => c.id));
  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const send = async () => {
    const ok = await run(
      () => inviteMaintenanceContractors(requestId, [...selected]),
      COPY.invitesSent,
    );
    if (ok) setSelected(new Set());
  };

  const saveTradie = async () => {
    if (!agencyId) return;
    setSaving(true);
    try {
      const row = await addPreferredContractor(agencyId, {
        name: name.trim(),
        email: email.trim(),
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      toast.success(COPY.tradieSaved);
      setName('');
      setEmail('');
      setPhone('');
      setAdding(false);
      await load();
      setSelected((prev) => new Set(prev).add(maintenanceContractorSelectionKey(row)));
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StepCard title={COPY.inviteTitle} hint={COPY.inviteHint}>
      {loadError ? <p className="text-destructive text-xs">{loadError}</p> : null}
      {tradies.length > 0 ? (
        <ul className="space-y-1.5">
          {tradies.map((t) => {
            const key = maintenanceContractorSelectionKey(t);
            const already = invitedKeys.has(key);
            return (
              <li key={t.id}>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={already || selected.has(key)}
                    disabled={busy || already}
                    onChange={() => toggle(key)}
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{t.name}</span>
                    {already ? (
                      <span className="text-muted-foreground"> · {COPY.invited}</span>
                    ) : t.email ? (
                      <span className="text-muted-foreground"> · {t.email}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tradies.length > 0 ? (
          <Button size="sm" disabled={busy || selected.size === 0} onClick={() => void send()}>
            {COPY.invite}
          </Button>
        ) : null}
        {!adding ? (
          <Button size="sm" variant="outline" disabled={!agencyId} onClick={() => setAdding(true)}>
            {COPY.addTradie}
          </Button>
        ) : null}
      </div>

      {adding ? (
        <div className="border-border/60 space-y-2 border-t pt-2.5">
          <div>
            <FieldLabel htmlFor={`${id}-name`}>{COPY.tradieName}</FieldLabel>
            <Input id={`${id}-name`} value={name} disabled={saving} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <FieldLabel htmlFor={`${id}-email`}>{COPY.tradieEmail}</FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              value={email}
              disabled={saving}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor={`${id}-phone`}>{COPY.tradiePhone}</FieldLabel>
            <Input id={`${id}-phone`} value={phone} disabled={saving} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={saving || !name.trim() || !email.trim()}
            onClick={() => void saveTradie()}
          >
            {COPY.saveTradie}
          </Button>
        </div>
      ) : null}
    </StepCard>
  );
}
