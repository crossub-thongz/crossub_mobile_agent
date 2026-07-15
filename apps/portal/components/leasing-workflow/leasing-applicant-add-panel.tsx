'use client';

import { useRef, useState } from 'react';
import { FileUp, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  readFileUploadPayload,
  resolveCreatedApplicationId,
} from '@/lib/leasing-applicant-upload.util';
import { LEASING_UI } from '@/lib/leasing/constants';
import { useLeasingWorkflowStore } from '@/lib/leasing/store';
import { leasingOpsApi } from '@/lib/leasing-ops-api';
import { cn } from '@/lib/utils';

export function LeasingApplicantAddPanel({
  propertyId,
  className,
}: {
  propertyId: string;
  className?: string;
}) {
  const { leasingCycles, apiConnected } = useAgentData();
  const applyCycleView = useLeasingWorkflowStore((s) => s.applyCycleView);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const cycle = leasingCycles.find((c) => c.propertyId === propertyId);
  const cycleId = cycle?.id;

  const addFiles = (next: FileList | null) => {
    if (!next?.length) return;
    setFiles((prev) => {
      const keys = new Set(prev.map((f) => `${f.name}:${f.size}`));
      const merged = [...prev];
      for (const file of Array.from(next)) {
        const key = `${file.name}:${file.size}`;
        if (keys.has(key)) continue;
        keys.add(key);
        merged.push(file);
      }
      return merged;
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const reset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      toast.error('Enter the applicant name');
      return;
    }

    setSaving(true);
    try {
      if (!apiConnected || !cycleId) {
        toast.error('Leasing cycle not available — refresh and try again');
        return;
      }
      let view = await leasingOpsApi.createManualApplicant(cycleId, {
        name: trimmedName,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
      });
      const applicationId = resolveCreatedApplicationId(view, trimmedName);
      if (!applicationId) {
        throw new Error('Applicant was created but could not be resolved');
      }
      for (const file of files) {
        const payload = await readFileUploadPayload(file);
        view = await leasingOpsApi.uploadApplicantDocument(cycleId, applicationId, payload);
      }
      applyCycleView(propertyId, view);
      reset();
      toast.success(
        files.length > 0
          ? `Applicant added with ${files.length} document${files.length === 1 ? '' : 's'}`
          : 'Applicant added',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add applicant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('bg-card space-y-3 rounded-xl border px-4 py-4', className)}>
      <div>
        <p className="text-sm font-medium">Add applicant manually</p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">
          Optional — enter contact details when you already know them. For document-only intake, use
          the drag-and-drop area above.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="h-9 text-xs"
          disabled={saving}
        />
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
          className="h-9 text-xs"
          disabled={saving}
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className="h-9 text-xs"
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          disabled={saving}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          Upload documents
        </Button>
        {files.length > 0 && (
          <ul className="space-y-1">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${file.size}-${index}`}
                className="bg-muted/30 flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-[11px]"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <FileUp className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="truncate">{file.name}</span>
                </span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => removeFile(index)}
                  disabled={saving}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        className={cn('gap-1.5', LEASING_UI.btnSecondary)}
        disabled={saving}
        onClick={() => void submit()}
      >
        <Plus className="size-3.5" />
        {saving ? 'Adding…' : 'Add applicant'}
      </Button>
    </div>
  );
}
