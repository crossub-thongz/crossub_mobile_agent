'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { SELECT_CLASS } from '@/components/agent/maintenance-self-managed/step-card';
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
  TRUST_ACCOUNT_CODE_DIALOG_COPY as COPY,
  TRUST_ACCOUNT_CODE_KIND,
  TRUST_ACCOUNT_CODE_KIND_LABEL,
  TRUST_ACCOUNT_CODE_KINDS,
  TRUST_INPUT_LIMITS,
  type TrustAccountCodeKind,
} from '@/constants/trust';
import {
  createTrustAccountCode,
  updateTrustAccountCode,
  type TrustAccountCode,
} from '@/lib/crossub-api/agent-trust-client';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

/** Add an account code, or edit one (`code` null adds). The code and kind are fixed once added. */
export function TrustAccountCodeDialog({
  agencyId,
  code,
  onClose,
  onSaved,
}: {
  agencyId: string;
  code: TrustAccountCode | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [codeValue, setCodeValue] = useState(code?.code ?? '');
  const [name, setName] = useState(code?.name ?? '');
  const [kind, setKind] = useState<TrustAccountCodeKind>(code?.kind ?? TRUST_ACCOUNT_CODE_KIND.EXPENSE);
  const [gstApplies, setGstApplies] = useState(code?.gstApplies ?? false);
  const [isActive, setIsActive] = useState(code?.isActive ?? true);
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    const trimmedCode = codeValue.trim();
    const trimmedName = name.trim();
    if (!trimmedCode || !trimmedName) {
      toast.error(COPY.codeRequired);
      return;
    }
    setPending(true);
    try {
      if (code) {
        await updateTrustAccountCode(agencyId, code.id, { name: trimmedName, gstApplies, isActive });
        toast.success(COPY.saved(code.code));
      } else {
        await createTrustAccountCode(agencyId, { code: trimmedCode, name: trimmedName, kind, gstApplies });
        toast.success(COPY.added(trimmedCode));
      }
      onSaved();
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
          <DialogTitle>{code ? COPY.editTitle(code.code) : COPY.addTitle}</DialogTitle>
          <DialogDescription>{COPY.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_2fr] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trust-code-code">{COPY.code}</Label>
              <Input
                id="trust-code-code"
                value={codeValue}
                maxLength={TRUST_INPUT_LIMITS.accountCodeMax}
                disabled={pending || code != null}
                onChange={(e) => setCodeValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trust-code-name">{COPY.name}</Label>
              <Input
                id="trust-code-name"
                value={name}
                maxLength={TRUST_INPUT_LIMITS.accountCodeNameMax}
                disabled={pending}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
          {code ? <p className="text-muted-foreground text-xs">{COPY.codeLocked}</p> : null}
          <div className="space-y-1.5">
            <Label htmlFor="trust-code-kind">{COPY.kind}</Label>
            <select
              id="trust-code-kind"
              className={SELECT_CLASS}
              value={kind}
              disabled={pending || code != null}
              onChange={(e) => setKind(e.target.value as TrustAccountCodeKind)}
            >
              {TRUST_ACCOUNT_CODE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {TRUST_ACCOUNT_CODE_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4"
                checked={gstApplies}
                disabled={pending}
                onChange={(e) => setGstApplies(e.target.checked)}
              />
              {COPY.gstApplies}
            </label>
            {code ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={isActive}
                  disabled={pending}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                {COPY.active}
              </label>
            ) : null}
          </div>
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
