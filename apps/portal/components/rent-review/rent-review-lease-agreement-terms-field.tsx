'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RentReviewWorkflowDetail } from '@/lib/rent-review/types';
import { apiErrorMessage } from '@/lib/utils/api-error-message';

export function RentReviewLeaseAgreementTermsField({
  detail,
  onSave,
  onPreview,
  disabled,
  previewing = false,
}: {
  detail: RentReviewWorkflowDetail;
  onSave: (input: {
    additionalTerms: string | null;
    additionalTermsPets: string | null;
  }) => Promise<RentReviewWorkflowDetail>;
  onPreview?: () => void | Promise<void>;
  disabled?: boolean;
  previewing?: boolean;
}) {
  const [additionalTerms, setAdditionalTerms] = useState(detail.leaseAdditionalTerms ?? '');
  const [additionalTermsPets, setAdditionalTermsPets] = useState(
    detail.leaseAdditionalTermsPets ?? '',
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAdditionalTerms(detail.leaseAdditionalTerms ?? '');
    setAdditionalTermsPets(detail.leaseAdditionalTermsPets ?? '');
  }, [detail.id, detail.leaseAdditionalTerms, detail.leaseAdditionalTermsPets]);

  const normalize = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const saveIfChanged = async () => {
    const nextTerms = normalize(additionalTerms);
    const nextPets = normalize(additionalTermsPets);
    const currentTerms = normalize(detail.leaseAdditionalTerms ?? '');
    const currentPets = normalize(detail.leaseAdditionalTermsPets ?? '');
    if (nextTerms === currentTerms && nextPets === currentPets) return;

    setSaving(true);
    try {
      await onSave({ additionalTerms: nextTerms, additionalTermsPets: nextPets });
      toast.success('Lease agreement terms saved');
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setAdditionalTerms(detail.leaseAdditionalTerms ?? '');
      setAdditionalTermsPets(detail.leaseAdditionalTermsPets ?? '');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide">Lease agreement terms</p>
          <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
            Optional. Leave blank to send the standard NSW agreement. Filled terms appear on page
            15 before the agreement is emailed to the tenant.
          </p>
        </div>
        {saving ? <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" /> : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`lease-additional-terms-${detail.id}`} className="text-xs font-semibold">
          Any additional term
        </Label>
        <Textarea
          id={`lease-additional-terms-${detail.id}`}
          value={additionalTerms}
          disabled={disabled || saving}
          rows={4}
          placeholder="Insert any other agreed additional terms here…"
          onChange={(e) => setAdditionalTerms(e.target.value)}
          onBlur={() => void saveIfChanged()}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`lease-pets-terms-${detail.id}`} className="text-xs font-semibold">
          Any additional term – pets
        </Label>
        <Textarea
          id={`lease-pets-terms-${detail.id}`}
          value={additionalTermsPets}
          disabled={disabled || saving}
          rows={3}
          placeholder="Describe the animal the tenant may keep at the premises…"
          onChange={(e) => setAdditionalTermsPets(e.target.value)}
          onBlur={() => void saveIfChanged()}
        />
      </div>

      {onPreview ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5"
          disabled={disabled || saving || previewing}
          onClick={() => void onPreview()}
        >
          <FileText className="size-3.5" />
          {previewing ? 'Opening preview…' : 'Preview lease agreement'}
        </Button>
      ) : null}
    </div>
  );
}
