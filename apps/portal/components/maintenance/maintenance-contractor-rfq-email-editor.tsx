'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { fetchContractorRfqEmailDraft } from '@/lib/crossub-api/maintenance-client';

export type ContractorRfqEmailDraft = {
  subject: string;
  bodyText: string;
  sampleContractorName: string;
};

export function MaintenanceContractorRfqEmailEditor({
  requestId,
  previewContractorName,
  value,
  onChange,
  disabled = false,
}: {
  requestId: string;
  previewContractorName?: string;
  value: ContractorRfqEmailDraft | null;
  onChange: (draft: ContractorRfqEmailDraft) => void;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchContractorRfqEmailDraft(requestId, previewContractorName)
      .then((draft) => {
        if (cancelled) return;
        onChange(draft);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Could not load contractor email template.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when job or preview contractor changes
  }, [requestId, previewContractorName]);

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3">
      <div>
        <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
          Email to contractor *
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Sent to each selected contractor when you confirm. The greeting uses each contractor&apos;s
          name{previewContractorName ? ` (preview: ${previewContractorName})` : ''}.
        </p>
      </div>

      {loading ? (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="size-4 animate-spin" />
          Loading email template…
        </div>
      ) : error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : value ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="agent-contractor-rfq-subject" className="text-xs">
              Subject
            </Label>
            <Input
              id="agent-contractor-rfq-subject"
              inputKind="email_subject"
              value={value.subject}
              onChange={(e) => onChange({ ...value, subject: e.target.value })}
              disabled={disabled}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-contractor-rfq-body" className="text-xs">
              Message
            </Label>
            <Textarea
              id="agent-contractor-rfq-body"
              inputKind="message"
              value={value.bodyText}
              onChange={(e) => onChange({ ...value, bodyText: e.target.value })}
              disabled={disabled}
              rows={8}
              className="resize-none text-xs"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
