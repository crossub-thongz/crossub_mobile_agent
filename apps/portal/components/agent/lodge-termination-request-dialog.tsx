'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { usePropertyTenantContacts } from '@/lib/use-property-tenant-contacts';
import { createAgentTerminationRequest, fetchTerminationReasons } from '@/lib/termination-request/api';
import {
  TERMINATION_REQUEST_JURISDICTION,
  TERMINATION_REQUEST_STATE,
  type TerminationReasonOption,
} from '@/lib/termination-request/constants';
import { primaryTenantForTermination } from '@/lib/termination-request/primary-tenant';
import type { LeasingRecord, Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

/**
 * Agent lodge form. Fields match Add termination: address, primary tenant
 * reference and name, and the reason title. It records the request and notifies
 * the account manager. It does not open a vacating case.
 */
export function LodgeTerminationRequestDialog({
  open,
  onOpenChange,
  property,
  currentLease,
  onLodged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property;
  currentLease?: LeasingRecord;
  onLodged?: () => void;
}) {
  const contactsByProperty = usePropertyTenantContacts(open ? [property.id] : []);
  const contacts = contactsByProperty[property.id];
  const [reasons, setReasons] = useState<TerminationReasonOption[]>([]);
  const [reasonsError, setReasonsError] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // The reasons are NSW notice grounds. A property with a state on file outside NSW
  // is refused here; one with no state is left to the API, which explains it.
  const propertyState = property.state?.trim().toUpperCase() ?? '';
  const outsideNsw = Boolean(propertyState) && propertyState !== TERMINATION_REQUEST_STATE;

  const tenant = useMemo(
    () =>
      primaryTenantForTermination({
        property,
        contacts,
        leaseId: currentLease?.id,
        leases: currentLease ? [currentLease] : [],
      }),
    [contacts, currentLease, property],
  );

  useEffect(() => {
    if (!open) {
      setReasonCode('');
      setReasons([]);
      setReasonsError(null);
      return;
    }
    let cancelled = false;
    fetchTerminationReasons(TERMINATION_REQUEST_JURISDICTION)
      .then((next) => {
        if (cancelled) return;
        setReasons(next);
        setReasonsError(next.length > 0 ? null : 'No termination reasons are available.');
      })
      .catch((err) => {
        if (cancelled) return;
        setReasons([]);
        setReasonsError(
          err instanceof Error ? err.message : 'Could not load the termination reasons.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!tenant) {
      toast.error('This property has no current tenant.');
      return;
    }
    if (!reasonCode) {
      toast.error('Select a termination reason.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createAgentTerminationRequest(property.id, {
        reasonCode,
        jurisdictionCode: TERMINATION_REQUEST_JURISDICTION,
      });
      toast.success(
        created.notifiedAccountManager
          ? 'Termination request lodged. Your account manager has been notified.'
          : 'Termination request lodged.',
      );
      onOpenChange(false);
      onLodged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not lodge the termination request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add termination</DialogTitle>
          <DialogDescription>
            Lodge a termination request. Your account manager is notified to issue the notice.
            This does not open a vacating case.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{formatPropertyFullAddress(property)}</p>
            {tenant ? (
              <p className="text-muted-foreground text-sm">
                {tenant.referenceId} · {tenant.name}
              </p>
            ) : (
              <p className="text-sm text-amber-700 dark:text-amber-400">No current tenant</p>
            )}
            {outsideNsw ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Termination requests are for NSW properties. This property is in {propertyState}.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="termination-reason" className="text-xs">
              Termination reason *
            </Label>
            <select
              id="termination-reason"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={reasonCode}
              onChange={(event) => setReasonCode(event.target.value)}
            >
              <option value="">Select a reason</option>
              {reasons.map((reason) => (
                <option key={reason.code} value={reason.code}>
                  {reason.title}
                </option>
              ))}
            </select>
            {reasonsError ? (
              <p className="text-sm text-destructive">{reasonsError}</p>
            ) : (
              <p className="text-muted-foreground text-[12px]">
                The request records the reason title only.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !tenant || !reasonCode || outsideNsw}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Lodge request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
