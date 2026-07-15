'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

import { LeasingApplicantDocumentDropzone } from '@/components/leasing-workflow/leasing-applicant-document-dropzone';
import { Button } from '@/components/ui/button';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  readFileUploadPayload,
  resolveCreatedApplicationId,
} from '@/lib/leasing-applicant-upload.util';
import { nextApplicantOrderLabel } from '@/lib/leasing/applicant-order';
import { LEASING_UI } from '@/lib/leasing/constants';
import type { LeasingApplicationDetail } from '@/lib/leasing/types';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn } from '@/lib/utils';

export function LeasingApplicantDocumentIntake({
  propertyId,
  cycleId,
  applications,
  disabled = false,
}: {
  propertyId: string;
  cycleId?: string;
  applications: LeasingApplicationDetail[];
  disabled?: boolean;
}) {
  const { apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const [files, setFiles] = useState<File[]>([]);
  const [confirming, setConfirming] = useState(false);

  const nextLabel = nextApplicantOrderLabel(applications);

  const confirmOrder = async () => {
    if (files.length === 0) {
      toast.error('Add at least one document');
      return;
    }
    if (!apiConnected || !cycleId) {
      toast.error('Leasing cycle not available — refresh and try again');
      return;
    }

    setConfirming(true);
    try {
      let view = await leasingOpsApi.createManualApplicant(cycleId, { name: nextLabel });
      const applicationId = resolveCreatedApplicationId(view, nextLabel);
      if (!applicationId) {
        throw new Error('Applicant order was created but could not be resolved');
      }
      for (const file of files) {
        const payload = await readFileUploadPayload(file);
        view = await leasingOpsApi.uploadApplicantDocument(cycleId, applicationId, payload);
      }
      applyCycleView(propertyId, view);
      setFiles([]);
      toast.success(`${nextLabel} order created with ${files.length} document${files.length === 1 ? '' : 's'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create applicant order');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="bg-card space-y-3 rounded-xl border px-4 py-4">
      <div>
        <p className="text-sm font-medium">Upload application materials</p>
        <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
          Drag in all documents for one applicant, then confirm to create{' '}
          <span className="text-foreground font-medium">{nextLabel}</span>. You can add more files
          to an existing applicant order later.
        </p>
      </div>

      <LeasingApplicantDocumentDropzone
        files={files}
        onFilesChange={setFiles}
        disabled={disabled || confirming}
      />

      {files.length > 0 ? (
        <div className="rounded-lg border border-violet-500/25 bg-violet-500/[0.05] px-3 py-3">
          <p className="text-[11px] font-medium leading-relaxed">
            Confirm these {files.length} file{files.length === 1 ? '' : 's'} belong to{' '}
            <span className="text-violet-700 dark:text-violet-300">{nextLabel}</span>?
          </p>
          <Button
            type="button"
            size="sm"
            className={cn('mt-2 gap-1.5', LEASING_UI.btnSecondary)}
            disabled={disabled || confirming}
            onClick={() => void confirmOrder()}
          >
            <CheckCircle2 className="size-3.5" />
            {confirming ? 'Creating order…' : `Confirm & create ${nextLabel} order`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
