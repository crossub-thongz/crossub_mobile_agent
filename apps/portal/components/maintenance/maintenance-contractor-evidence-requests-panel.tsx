'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  fulfillContractorEvidenceRequest,
  uploadMaintenanceAttachment,
} from '@/lib/crossub-api/maintenance-client';
import type { ApiMaintenanceRequest } from '@/lib/crossub-api/types';
import { fileToBase64 } from '@/lib/file-upload';
import { resolveContractorDisplayName } from '@/lib/maintenance/resolve-contractor-display';

export function MaintenanceContractorEvidenceRequestsPanel({
  request,
  contractors = [],
  onCaseUpdated,
}: {
  request: ApiMaintenanceRequest;
  contractors?: Array<{ id: string; name: string }>;
  onCaseUpdated?: () => Promise<void>;
}) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const pending = (request.contractorEvidenceRequests ?? []).filter(
    (r) => r.status === 'pending',
  );

  if (pending.length === 0) return null;

  const label = (contractorId: string) =>
    resolveContractorDisplayName(contractorId, {
      contractors,
      invitedContractors: request.invitedContractors,
      invitedContractorIds: request.invitedContractorIds,
    });

  const onFulfill = async (evidenceRequestId: string) => {
    setBusyId(evidenceRequestId);
    try {
      await fulfillContractorEvidenceRequest({
        requestId: request.id,
        evidenceRequestId,
        fulfillmentNote: notes[evidenceRequestId]?.trim(),
      });
      toast.success('Contractor notified — evidence request fulfilled');
      await onCaseUpdated?.();
    } catch {
      toast.error('Could not fulfil request');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <div>
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          Contractor photo requests
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          {request.source === 'tenant_app'
            ? 'Ask the tenant to upload via the tenant app, or upload here on their behalf.'
            : 'Upload photos and add a description, then notify the contractor.'}
        </p>
      </div>
      {pending.map((row) => (
        <div key={row.id} className="space-y-2 rounded-lg border bg-card p-3">
          <p className="text-sm font-medium">{label(row.contractorId)}</p>
          <p className="text-muted-foreground text-xs whitespace-pre-wrap">{row.message}</p>
          <Textarea
            inputKind="contractor_quote_note"
            placeholder="Note for the contractor (optional)"
            value={notes[row.id] ?? ''}
            onChange={(e) => setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))}
            rows={2}
            className="text-xs"
          />
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusyId(row.id);
                  void fileToBase64(file)
                    .then((contentBase64) =>
                      uploadMaintenanceAttachment({
                        maintenanceRequestId: request.id,
                        kind: 'initial_evidence',
                        fileName: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        sizeBytes: file.size,
                        contentBase64,
                      }),
                    )
                    .then(() => onFulfill(row.id))
                    .catch(() => toast.error('Upload failed'))
                    .finally(() => setBusyId(null));
                  e.target.value = '';
                }}
              />
              <Button type="button" size="sm" variant="outline" disabled={busyId === row.id} asChild>
                <span>Upload photo</span>
              </Button>
            </label>
            <Button
              type="button"
              size="sm"
              disabled={busyId === row.id}
              onClick={() => void onFulfill(row.id)}
            >
              Mark fulfilled &amp; notify
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
