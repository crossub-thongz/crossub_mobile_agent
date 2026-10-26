'use client';

import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
import { TrustLoadError, TrustLoading } from '@/components/agent/trust/trust-ui';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  TRUST_INPUT_LIMITS,
  TRUST_LEDGER_KIND,
  TRUST_OPEN_LEDGERS_COPY as COPY,
  TRUST_OPENABLE_LEDGER_KINDS,
  type TrustOpenableLedgerKind,
} from '@/constants/trust';
import { useTrustResource } from '@/hooks/use-trust-resource';
import {
  fetchTrustFolioSync,
  openTrustLedger,
  runTrustFolioSync,
  type TrustFolioSyncPreview,
} from '@/lib/crossub-api/agent-trust-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/**
 * "Open missing ledgers" (D122 folio sync): every current owner and tenant of the agency's
 * properties without a ledger, opened in one go.
 */
export function TrustFolioSyncDialog({
  agencyId,
  bankAccountId,
  onClose,
  onOpened,
}: {
  agencyId: string;
  bankAccountId: string;
  onClose: () => void;
  onOpened: () => void;
}) {
  const preview = useTrustResource(`${agencyId}:${bankAccountId}:folio-sync`, () =>
    fetchTrustFolioSync(agencyId, bankAccountId),
  );
  const [pending, setPending] = useState(false);

  async function onRun() {
    setPending(true);
    try {
      const result = await runTrustFolioSync(agencyId, bankAccountId);
      toast.success(COPY.synced(result.opened.length));
      onOpened();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  const count = preview.data ? preview.data.owners.length + preview.data.tenants.length : 0;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{COPY.syncTitle}</DialogTitle>
          <DialogDescription>{COPY.syncDescription}</DialogDescription>
        </DialogHeader>
        {preview.data ? (
          <FolioSyncPreview preview={preview.data} />
        ) : preview.error ? (
          <TrustLoadError error={preview.error} onRetry={preview.reload} />
        ) : (
          <TrustLoading />
        )}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending || count === 0} onClick={() => void onRun()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.syncSubmit(count)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FolioSyncPreview({ preview }: { preview: TrustFolioSyncPreview }) {
  if (preview.owners.length + preview.tenants.length === 0 && preview.skipped.length === 0) {
    return <p className="text-muted-foreground text-sm">{COPY.nothingMissing}</p>;
  }
  const groups = [
    {
      title: COPY.owners(preview.owners.length),
      rows: preview.owners.map((o) => ({ key: `o:${o.propertyId}`, name: o.name, place: o.propertyReferenceAddress })),
    },
    {
      title: COPY.tenants(preview.tenants.length),
      rows: preview.tenants.map((t) => ({ key: `t:${t.tenancyId}`, name: t.name, place: t.propertyReferenceAddress })),
    },
    {
      title: COPY.skipped(preview.skipped.length),
      rows: preview.skipped.map((s) => ({
        key: `s:${s.propertyId}:${s.tenancyId ?? ''}`,
        name: s.reasonLabel,
        place: s.propertyAddress,
      })),
    },
  ].filter((group) => group.rows.length > 0);

  return (
    <div className="space-y-3 text-sm">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="text-muted-foreground mb-1 text-xs font-semibold uppercase tracking-wide">{group.title}</p>
          <ul className="divide-y rounded-lg border">
            {group.rows.map((row) => (
              <li key={row.key} className="px-3 py-1.5">
                <p className="font-medium">{row.name}</p>
                <p className="text-muted-foreground text-xs">{row.place}</p>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {preview.truncated ? <p className="text-xs text-amber-600">{COPY.truncated}</p> : null}
    </div>
  );
}

/** Open one ledger: an owner or tenant on one of the agency's properties, or the agency ledger. */
export function TrustOpenLedgerDialog({
  agencyId,
  bankAccountId,
  onClose,
  onOpened,
}: {
  agencyId: string;
  bankAccountId: string;
  onClose: () => void;
  onOpened: () => void;
}) {
  const { properties } = useAgentData();
  const agencyProperties = useMemo(
    () =>
      properties
        .filter((property) => property.agencyId === agencyId)
        .sort((a, b) => a.address.localeCompare(b.address)),
    [properties, agencyId],
  );
  const [kind, setKind] = useState<TrustOpenableLedgerKind>(TRUST_LEDGER_KIND.OWNER);
  const [propertyId, setPropertyId] = useState('');
  const [name, setName] = useState('');
  const [managementStart, setManagementStart] = useState('');
  const [pending, setPending] = useState(false);
  const needsProperty = kind !== TRUST_LEDGER_KIND.AGENCY;

  async function onSubmit() {
    if (needsProperty && !propertyId) {
      toast.error(COPY.propertyRequired);
      return;
    }
    setPending(true);
    try {
      const ledger = await openTrustLedger(agencyId, bankAccountId, {
        kind,
        name: name.trim() || undefined,
        propertyId: needsProperty ? propertyId : undefined,
        managementStart: kind === TRUST_LEDGER_KIND.OWNER && managementStart ? managementStart : undefined,
      });
      toast.success(COPY.opened(ledger.name));
      onOpened();
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{COPY.oneTitle}</DialogTitle>
          <DialogDescription>{COPY.oneDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="trust-open-kind">{COPY.kind}</Label>
            <select
              id="trust-open-kind"
              className={SELECT_CLASS}
              value={kind}
              disabled={pending}
              onChange={(e) => setKind(e.target.value as TrustOpenableLedgerKind)}
            >
              {TRUST_OPENABLE_LEDGER_KINDS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {needsProperty ? (
            <div className="space-y-1.5">
              <Label htmlFor="trust-open-property">{COPY.property}</Label>
              <select
                id="trust-open-property"
                className={SELECT_CLASS}
                value={propertyId}
                disabled={pending}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                <option value="">{COPY.chooseProperty}</option>
                {agencyProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {[property.address, property.suburb].filter(Boolean).join(', ')}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="trust-open-name">{COPY.name}</Label>
            <Input
              id="trust-open-name"
              value={name}
              maxLength={TRUST_INPUT_LIMITS.ledgerNameMax}
              disabled={pending}
              onChange={(e) => setName(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">{COPY.nameHint}</p>
          </div>
          {kind === TRUST_LEDGER_KIND.OWNER ? (
            <div className="space-y-1.5">
              <Label htmlFor="trust-open-start">{COPY.managementStart}</Label>
              <Input
                id="trust-open-start"
                type="date"
                value={managementStart}
                disabled={pending}
                onChange={(e) => setManagementStart(e.target.value)}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
            {COPY.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {COPY.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
