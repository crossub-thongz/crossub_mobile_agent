'use client';

import { useRef, useState } from 'react';
import { CircleCheck, Plus, RefreshCw, Send, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingAgreementActionGroup } from '@/components/leasing-workflow/leasing-agreement-signed-document';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AGREEMENT_SIGNING_STATUS,
  AGREEMENT_UPLOAD_ACCEPT,
  SELF_MANAGED_LEASING_COPY as COPY,
} from '@/constants/self-managed-leasing';
import { useSelfManagedLettingAction } from '@/hooks/use-self-managed-letting';
import {
  addSelfManagedContractCondition,
  confirmSelfManagedContract,
  regenerateSelfManagedContract,
  sendSelfManagedContractToTenant,
  updateSelfManagedContract,
  uploadSelfManagedContract,
  uploadSelfManagedSignedAgreement,
} from '@/lib/crossub-api/agent-workflow-client';
import { readFileUploadPayload } from '@/lib/leasing-applicant-upload.util';
import {
  buildContractBasicsPatch,
  contractBasicsFormFrom,
  type ContractBasicsForm,
} from '@/lib/leasing/self-managed-letting';
import type { LeasingPropertyDetail } from '@/lib/leasing/types';

const ACTION = {
  SAVE_BASICS: 'save-basics',
  ADD_CONDITION: 'add-condition',
  CONFIRM: 'confirm',
  REGENERATE: 'regenerate',
  SEND: 'send',
  UPLOAD_OWN: 'upload-own',
  UPLOAD_SIGNED: 'upload-signed',
} as const;

/**
 * Self-Manage lease agreement: the agent edits the draft, adds conditions, confirms and sends
 * it, or uploads their own agreement and the signed copy. Hidden once the agreement is signed.
 */
export function LeasingSelfManagedAgreementPanel({
  detail,
  cycleId,
}: {
  detail: LeasingPropertyDetail;
  cycleId?: string;
}) {
  const propertyId = detail.propertyId;
  const agreement = detail.onboarding.agreement;
  const contract = agreement.contract;
  const { pending, run } = useSelfManagedLettingAction(propertyId, cycleId);
  const [editing, setEditing] = useState(false);
  const [basics, setBasics] = useState<ContractBasicsForm>(() => contractBasicsFormFrom(contract));
  const [condition, setCondition] = useState('');
  const [sendOwnToTenant, setSendOwnToTenant] = useState(true);
  const ownFileRef = useRef<HTMLInputElement>(null);
  const signedFileRef = useRef<HTMLInputElement>(null);

  if (agreement.signingStatus === AGREEMENT_SIGNING_STATUS.SIGNED) return null;

  const busy = pending !== null;
  const label = (key: string, idle: string, active: string) => (pending === key ? active : idle);

  const startEditing = () => {
    setBasics(contractBasicsFormFrom(contract));
    setEditing(true);
  };

  const saveBasics = async () => {
    let patch: ReturnType<typeof buildContractBasicsPatch>;
    try {
      patch = buildContractBasicsPatch(basics, contract);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : COPY.basicsEmpty);
      return;
    }
    if (!patch) {
      toast.error(COPY.basicsEmpty);
      return;
    }
    const ok = await run(
      ACTION.SAVE_BASICS,
      (id) => updateSelfManagedContract(propertyId, id, patch),
      COPY.basicsSaved,
    );
    if (ok) setEditing(false);
  };

  const addCondition = async () => {
    const text = condition.trim();
    if (!text) return;
    const ok = await run(
      ACTION.ADD_CONDITION,
      (id) => addSelfManagedContractCondition(propertyId, id, { text }),
      COPY.conditionAdded,
    );
    if (ok) setCondition('');
  };

  const uploadOwn = async (file: File | undefined) => {
    if (!file) return;
    await run(
      ACTION.UPLOAD_OWN,
      async (id) =>
        uploadSelfManagedContract(propertyId, id, {
          ...(await readFileUploadPayload(file)),
          sendToTenant: sendOwnToTenant,
        }),
      COPY.uploadedOwn,
    );
  };

  const uploadSigned = async (file: File | undefined) => {
    if (!file) return;
    await run(
      ACTION.UPLOAD_SIGNED,
      async (id) =>
        uploadSelfManagedSignedAgreement(propertyId, id, await readFileUploadPayload(file)),
      COPY.uploadedSigned,
    );
  };

  const setBasicsField = (field: keyof ContractBasicsForm, value: string) =>
    setBasics((current) => ({ ...current, [field]: value }));

  return (
    <div className="space-y-3 rounded-lg border bg-muted/10 p-3">
      <div>
        <p className="text-[13px] font-semibold">{COPY.agreementTitle}</p>
        <p className="text-muted-foreground text-[12px]">{COPY.agreementHint}</p>
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`contract-term-${propertyId}`} className="text-xs">
                {COPY.leaseTerm}
              </Label>
              <Input
                id={`contract-term-${propertyId}`}
                value={basics.leaseTerm}
                placeholder={COPY.leaseTermPlaceholder}
                onChange={(e) => setBasicsField('leaseTerm', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`contract-start-${propertyId}`} className="text-xs">
                {COPY.startDate}
              </Label>
              <Input
                id={`contract-start-${propertyId}`}
                type="date"
                value={basics.startDate}
                onChange={(e) => setBasicsField('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`contract-rent-${propertyId}`} className="text-xs">
                {COPY.weeklyRent}
              </Label>
              <Input
                id={`contract-rent-${propertyId}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={basics.weeklyRent}
                onChange={(e) => setBasicsField('weeklyRent', e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`contract-bond-${propertyId}`} className="text-xs">
                {COPY.bond}
              </Label>
              <Input
                id={`contract-bond-${propertyId}`}
                type="number"
                inputMode="decimal"
                min={0}
                value={basics.bond}
                onChange={(e) => setBasicsField('bond', e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => void saveBasics()}
            >
              {label(ACTION.SAVE_BASICS, COPY.saveBasics, COPY.saving)}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 text-xs"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              {COPY.cancel}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="text-xs font-medium">{COPY.conditionsHeading}</p>
        {contract.specialConditions.length === 0 ? (
          <p className="text-muted-foreground text-[12px]">{COPY.noConditions}</p>
        ) : (
          <ul className="space-y-1">
            {contract.specialConditions.map((c) => (
              <li key={c.id} className="bg-background rounded-md border px-2.5 py-1.5 text-[12px]">
                {c.text}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor={`contract-condition-${propertyId}`} className="text-xs">
          {COPY.conditionLabel}
        </Label>
        <div className="flex gap-1.5">
          <Input
            id={`contract-condition-${propertyId}`}
            value={condition}
            placeholder={COPY.conditionPlaceholder}
            onChange={(e) => setCondition(e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 shrink-0 gap-1 text-xs"
            disabled={busy || !condition.trim()}
            onClick={() => void addCondition()}
          >
            <Plus className="size-3.5" />
            {label(ACTION.ADD_CONDITION, COPY.addCondition, COPY.saving)}
          </Button>
        </div>
      </div>

      <LeasingAgreementActionGroup label="Draft">
        {!editing ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={busy}
            onClick={startEditing}
          >
            {COPY.editBasics}
          </Button>
        ) : null}
        {!contract.confirmed ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 gap-1 text-xs"
            disabled={busy}
            onClick={() =>
              void run(ACTION.CONFIRM, (id) => confirmSelfManagedContract(propertyId, id), COPY.confirmed)
            }
          >
            <CircleCheck className="size-3" />
            {label(ACTION.CONFIRM, COPY.confirm, COPY.saving)}
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={busy}
          onClick={() =>
            void run(
              ACTION.SEND,
              (id) => sendSelfManagedContractToTenant(propertyId, id),
              COPY.sentToTenant,
            )
          }
        >
          <Send className="size-3" />
          {label(ACTION.SEND, COPY.sendToTenant, COPY.sending)}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={busy}
          onClick={() =>
            void run(
              ACTION.REGENERATE,
              (id) => regenerateSelfManagedContract(propertyId, id),
              COPY.regenerated,
            )
          }
        >
          <RefreshCw className="size-3" />
          {label(ACTION.REGENERATE, COPY.regenerate, COPY.sending)}
        </Button>
      </LeasingAgreementActionGroup>

      <LeasingAgreementActionGroup label="Files">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={busy}
          onClick={() => ownFileRef.current?.click()}
        >
          <Upload className="size-3" />
          {label(ACTION.UPLOAD_OWN, COPY.uploadOwn, COPY.uploading)}
        </Button>
        <label className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
          <input
            type="checkbox"
            checked={sendOwnToTenant}
            disabled={busy}
            onChange={(e) => setSendOwnToTenant(e.target.checked)}
          />
          {COPY.uploadOwnSendToTenant}
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          disabled={busy}
          onClick={() => signedFileRef.current?.click()}
        >
          <Upload className="size-3" />
          {label(ACTION.UPLOAD_SIGNED, COPY.uploadSigned, COPY.uploading)}
        </Button>
      </LeasingAgreementActionGroup>

      <input
        ref={ownFileRef}
        type="file"
        accept={AGREEMENT_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          void uploadOwn(file);
        }}
      />
      <input
        ref={signedFileRef}
        type="file"
        accept={AGREEMENT_UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          void uploadSigned(file);
        }}
      />
    </div>
  );
}
