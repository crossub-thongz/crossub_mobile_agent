'use client';

import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  updateAgentTribunalRentChasing,
  type AgentTribunalRentChasingDetail,
} from '@/lib/crossub-api/agent-workflow-client';
import { fileToBase64, MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from '@/lib/file-upload';

type FilePayload = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64: string;
};

async function toUploadPayload(file: File): Promise<FilePayload> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name} exceeds the ${MAX_UPLOAD_LABEL} limit`);
  }
  const contentBase64 = await fileToBase64(file);
  return {
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
    contentBase64,
  };
}

export function EvictionRequiredDialog({
  open,
  onOpenChange,
  caseId,
  detail,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  detail: AgentTribunalRentChasingDetail;
  onSaved: (next: AgentTribunalRentChasingDetail) => void;
}) {
  const [lodgementDate, setLodgementDate] = useState('');
  const [hearingDate, setHearingDate] = useState('');
  const [hearingNoticeFile, setHearingNoticeFile] = useState<File | null>(null);
  const [membersOrderFile, setMembersOrderFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLodgementDate(detail.lodgementDate?.slice(0, 10) ?? '');
    setHearingDate(detail.hearingDate?.slice(0, 10) ?? '');
    setHearingNoticeFile(null);
    setMembersOrderFile(null);
  }, [open, detail]);

  const existingNoticeName = detail.hearingNoticeName ?? null;
  const existingOrderName = detail.membersOrderName ?? null;

  const save = async () => {
    setSaving(true);
    try {
      const next = await updateAgentTribunalRentChasing(caseId, {
        evictionRequired: true,
        ...(lodgementDate ? { lodgementDate } : {}),
        ...(hearingDate ? { hearingDate } : {}),
        ...(hearingNoticeFile
          ? { hearingNotice: await toUploadPayload(hearingNoticeFile) }
          : {}),
        ...(membersOrderFile
          ? { membersOrder: await toUploadPayload(membersOrderFile) }
          : {}),
      });
      onSaved(next);
      onOpenChange(false);
      toast.success(
        detail.evictionRequired
          ? 'Eviction details saved'
          : 'Eviction marked as required',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save eviction details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Eviction is required</DialogTitle>
          <DialogDescription>
            Add lodgement and hearing details. All fields are optional — you can save
            just a lodgement date and fill the rest later.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="eviction-lodgement-date" className="text-xs">
              Lodgement date
            </Label>
            <Input
              id="eviction-lodgement-date"
              type="date"
              value={lodgementDate}
              onChange={(e) => setLodgementDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eviction-hearing-date" className="text-xs">
              Hearing date
            </Label>
            <Input
              id="eviction-hearing-date"
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eviction-hearing-notice" className="text-xs">
              Hearing notice
            </Label>
            <Input
              id="eviction-hearing-notice"
              type="file"
              accept=".pdf,image/*,application/pdf"
              onChange={(e) => setHearingNoticeFile(e.target.files?.[0] ?? null)}
            />
            {hearingNoticeFile ? (
              <p className="text-muted-foreground text-xs">{hearingNoticeFile.name}</p>
            ) : existingNoticeName ? (
              <p className="text-muted-foreground text-xs">
                Current file: {existingNoticeName}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eviction-members-order" className="text-xs">
              Member&apos;s order
            </Label>
            <Input
              id="eviction-members-order"
              type="file"
              accept=".pdf,image/*,application/pdf"
              onChange={(e) => setMembersOrderFile(e.target.files?.[0] ?? null)}
            />
            {membersOrderFile ? (
              <p className="text-muted-foreground text-xs">{membersOrderFile.name}</p>
            ) : existingOrderName ? (
              <p className="text-muted-foreground text-xs">
                Current file: {existingOrderName}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
