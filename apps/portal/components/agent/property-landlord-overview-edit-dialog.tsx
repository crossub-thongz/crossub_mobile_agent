'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Upload, UserPlus } from 'lucide-react';
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
import { DocumentUploadProgress } from '@/components/agent/document-upload-progress';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  isBlockedDocumentFile,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_LABEL,
} from '@/lib/file-upload';
import {
  MANAGEMENT_AGREEMENT_DOC_SLOT,
} from '@/components/agent/property-management-details-section';
import { propertyRegistryApi } from '@/lib/property-registry-api';
import { formatPropertyFullAddress } from '@/lib/utils';

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

type LandlordForm = {
  landlordName: string;
  landlordEmail: string;
  landlordPhone: string;
  managementRatePercent: string;
  managementRateGst: '' | 'include' | 'exclude';
};

export function PropertyLandlordOverviewEditDialog({
  open,
  onOpenChange,
  propertyId,
  property,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  property: import('@/lib/types').Property;
  initial: LandlordForm;
  onSaved?: () => void;
}) {
  const { apiConnected, uploadDocument } = useAgentData();
  const [form, setForm] = useState<LandlordForm>(initial);
  const [replacingLandlord, setReplacingLandlord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const agreementInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(initial);
    setReplacingLandlord(false);
    // Only re-seed when the dialog opens. Parent `initial` churns every live poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [open]);

  const startNewLandlord = () => {
    setReplacingLandlord(true);
    setForm((prev) => ({
      ...prev,
      landlordName: '',
      landlordEmail: '',
      landlordPhone: '',
    }));
  };

  const set = <K extends keyof LandlordForm>(key: K, value: LandlordForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onAgreementSelected = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!apiConnected) {
      toast.error('Connect to the API to upload documents');
      return;
    }
    if (isBlockedDocumentFile(file)) {
      toast.error(`${file.name} is not supported (videos and GIFs are not allowed)`);
      if (agreementInputRef.current) agreementInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`${file.name} exceeds the ${MAX_UPLOAD_LABEL} limit`);
      if (agreementInputRef.current) agreementInputRef.current.value = '';
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const propertyAddress = formatPropertyFullAddress(property);
      await uploadDocument(file, 'lease', propertyAddress, {
        title: MANAGEMENT_AGREEMENT_DOC_SLOT.label,
        propertyId,
        onProgress: setUploadProgress,
      });
      toast.success('Management agreement uploaded');
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (agreementInputRef.current) agreementInputRef.current.value = '';
    }
  };

  const submit = async () => {
    if (!form.landlordName.trim()) {
      toast.error('Landlord name is required');
      return;
    }
    const rate = form.managementRatePercent.trim()
      ? Number(form.managementRatePercent.replace(/,/g, ''))
      : undefined;
    if (rate != null && (Number.isNaN(rate) || rate < 0 || rate > 100)) {
      toast.error('Enter a valid management rate');
      return;
    }

    setSaving(true);
    try {
      await propertyRegistryApi.update(propertyId, {
        landlordName: form.landlordName.trim(),
        landlordEmail: form.landlordEmail.trim() || undefined,
        landlordPhone: form.landlordPhone.trim() || undefined,
        managementRatePercent: rate,
        managementRateGst: form.managementRateGst || undefined,
        replaceLandlord: replacingLandlord || undefined,
      });
      toast.success(
        replacingLandlord ? 'New landlord saved' : 'Management details updated',
      );
      if (replacingLandlord) {
        toast.message(
          'Previous landlord saved on this property Archive tab (Landlord archive)',
        );
      }
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update management details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit management details</DialogTitle>
          <DialogDescription>
            Landlord contact, management rate, and property management agreement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Landlord</p>
              {initial.landlordName.trim() ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 px-2 text-[11px]"
                  onClick={startNewLandlord}
                  disabled={replacingLandlord}
                >
                  <UserPlus className="size-3.5" />
                  New landlord
                </Button>
              ) : null}
            </div>
            {replacingLandlord ? (
              <p className="text-muted-foreground text-[11px]">
                Enter the new landlord below. The current landlord will be saved on this
                property Archive tab (Landlord archive) when you save. Editing the fields
                without this button updates the Owner / Landlord and Management tabs instead.
              </p>
            ) : null}
            <div className="grid gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="landlord-name">Name</Label>
                <Input
                  id="landlord-name"
                  inputKind="person_name"
                  value={form.landlordName}
                  onChange={(e) => set('landlordName', e.target.value)}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="landlord-email">Email</Label>
                  <Input
                    id="landlord-email"
                    type="email"
                    value={form.landlordEmail}
                    onChange={(e) => set('landlordEmail', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="landlord-phone">Mobile</Label>
                  <Input
                    id="landlord-phone"
                    value={form.landlordPhone}
                    onChange={(e) => set('landlordPhone', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="management-rate">Management rate (%)</Label>
              <Input
                id="management-rate"
                inputMode="decimal"
                value={form.managementRatePercent}
                onChange={(e) => set('managementRatePercent', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="management-gst">Management GST</Label>
              <select
                id="management-gst"
                value={form.managementRateGst}
                onChange={(e) =>
                  set('managementRateGst', e.target.value as LandlordForm['managementRateGst'])
                }
                className={selectClass}
              >
                <option value="">Not set</option>
                <option value="include">Include GST</option>
                <option value="exclude">Exclude GST</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold">Management agreement</p>
            <p className="text-muted-foreground text-[11px]">
              Landlord insurance and other property documents are managed on the Documents tab.
            </p>
            <input
              ref={agreementInputRef}
              type="file"
              className="hidden"
              onChange={(e) => void onAgreementSelected(e.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => agreementInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Upload className="size-3.5" />
              )}
              Upload management agreement
            </Button>
            {uploading && uploadProgress != null ? (
              <DocumentUploadProgress percent={uploadProgress} className="max-w-xs" />
            ) : null}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || uploading} onClick={() => void submit()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
