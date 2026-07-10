'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, FileText, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { DocumentUploadProgress } from '@/components/agent/document-upload-progress';
import { PropertyDocumentFilesDialog } from '@/components/agent/property-document-files-dialog';
import { PropertyDocumentPreviewDialog } from '@/components/agent/property-document-preview-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  buildDocumentChecklistByGroup,
  CREATE_PROPERTY_DOCUMENT_GROUP_LABELS,
  ensureGroupDocumentTitle,
  PROPERTY_DETAIL_DOCUMENT_GROUP_ORDER,
  type CreatePropertyDocumentGroup,
  type DocumentChecklistFile,
  type DocumentChecklistRow,
} from '@/lib/property-create-document-groups';
import {
  filterUploadableFiles,
  MAX_UPLOAD_LABEL,
} from '@/lib/file-upload';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import { propertyRegistryApi } from '@/lib/property-registry-api';
import type { AgentDocument, Property } from '@/lib/types';
import { formatDate, formatPropertyFullAddress } from '@/lib/utils';

type DisplayDoc = {
  id: string;
  title: string;
  uploadedAt: string;
  href?: string | null;
};

type ExtraDraftRow = {
  id: string;
  title: string;
};

type PendingUpload =
  | { kind: 'slot'; title: string; slotId: string }
  | { kind: 'extra'; title: string; draftId: string };

function LandlordInsuranceExpiryField({
  value,
  displayValue,
  editable,
  saving,
  onChange,
  onSave,
}: {
  value: string;
  displayValue: string;
  editable: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <li className="border-b px-3 py-2.5">
      <p className="text-sm font-medium leading-snug">Landlord insurance expiry</p>
      {!editable ? (
        <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">{displayValue}</p>
      ) : (
        <div className="mt-1.5 flex items-center gap-2">
          <Label htmlFor="landlord-insurance-expiry" className="sr-only">
            Landlord insurance expiry date
          </Label>
          <Input
            id="landlord-insurance-expiry"
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={() => void onSave()}
            disabled={saving}
            className="h-8 max-w-[11rem] text-xs"
          />
          {saving ? <Loader2 className="text-muted-foreground size-3.5 animate-spin" /> : null}
        </div>
      )}
    </li>
  );
}

function SlotUploadButton({
  busy,
  disabled,
  hasFiles,
  progress,
  onClick,
}: {
  busy: boolean;
  disabled?: boolean;
  hasFiles: boolean;
  progress?: number | null;
  onClick: () => void;
}) {
  if (busy && progress != null) {
    return (
      <div className="w-[6.5rem] shrink-0">
        <DocumentUploadProgress percent={progress} label="Uploading" />
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={hasFiles ? 'outline' : 'default'}
      className="h-7 shrink-0 px-2 text-[11px]"
      disabled={disabled || busy}
      onClick={onClick}
    >
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
      <span className="ml-1">{busy ? 'Uploading…' : hasFiles ? 'Add' : 'Upload'}</span>
    </Button>
  );
}

function DocumentColumn({
  group,
  fixedRows,
  extraRows,
  extraDrafts,
  onAddDraft,
  onUpdateDraft,
  onRemoveDraft,
  onOpenFiles,
  onUploadSlot,
  onUploadExtra,
  uploadingKey,
  uploadProgress,
  insuranceExpiry,
}: {
  group: CreatePropertyDocumentGroup;
  fixedRows: DocumentChecklistRow[];
  extraRows: DocumentChecklistRow[];
  extraDrafts: ExtraDraftRow[];
  onAddDraft: () => void;
  onUpdateDraft: (id: string, title: string) => void;
  onRemoveDraft: (id: string) => void;
  onOpenFiles: (row: DocumentChecklistRow) => void;
  onUploadSlot: (title: string, slotId: string) => void;
  onUploadExtra: (title: string, draftId: string) => void;
  uploadingKey: string | null;
  uploadProgress: number | null;
  insuranceExpiry?: {
    value: string;
    displayValue: string;
    editable: boolean;
    saving: boolean;
    onChange: (value: string) => void;
    onSave: () => void;
  };
}) {
  const allRows = [...fixedRows, ...extraRows];
  const uploadedFileCount = allRows.reduce((sum, row) => sum + row.files.length, 0);

  return (
    <div className="flex min-h-0 min-w-0 flex-col rounded-xl border bg-card shadow-sm">
      <div className="border-b px-3 py-3">
        <div className="flex items-start gap-2">
          <FileText className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">
              {CREATE_PROPERTY_DOCUMENT_GROUP_LABELS[group]}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px] tabular-nums">
              {uploadedFileCount > 0
                ? `${uploadedFileCount} document${uploadedFileCount === 1 ? '' : 's'} uploaded`
                : `${allRows.filter((r) => r.uploaded).length}/${fixedRows.length} types uploaded`}
            </p>
          </div>
        </div>
      </div>

      <ul className="divide-border/70 max-h-[min(70vh,640px)] flex-1 divide-y overflow-y-auto">
        {fixedRows.map((row) => {
          const busy = uploadingKey === `slot:${row.slotId ?? row.id}`;
          const rowProgress = busy ? uploadProgress : null;
          const showInsuranceExpiryAfter =
            group === 'landlord' &&
            row.slotId === 'management_agreement' &&
            insuranceExpiry != null;

          return (
            <div key={row.id}>
              <li className="px-3 py-2.5">
                <div className="flex w-full items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {row.uploaded ? (
                      <button
                        type="button"
                        onClick={() => onOpenFiles(row)}
                        className="group flex w-full items-start gap-1 text-left"
                      >
                        <ChevronRight className="text-primary mt-0.5 size-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                        <span className="min-w-0 flex-1">
                          <span className="text-foreground group-hover:text-primary block text-sm font-medium leading-snug">
                            {row.title}
                          </span>
                          <span className="text-primary mt-1 block text-[11px] font-semibold">
                            {row.files.length} document{row.files.length === 1 ? '' : 's'} uploaded
                          </span>
                        </span>
                      </button>
                    ) : (
                      <>
                        <p className="text-sm font-medium leading-snug">{row.title}</p>
                        <span className="text-muted-foreground mt-1 block text-[11px]">
                          Not uploaded
                        </span>
                      </>
                    )}
                  </div>

                  <SlotUploadButton
                    busy={busy}
                    disabled={uploadingKey != null}
                    hasFiles={row.files.length > 0}
                    progress={rowProgress}
                    onClick={() => onUploadSlot(row.title, row.slotId ?? row.id)}
                  />
                </div>
              </li>

              {showInsuranceExpiryAfter ? (
                <LandlordInsuranceExpiryField {...insuranceExpiry} />
              ) : null}
            </div>
          );
        })}

        {extraRows.map((row) => {
          const busy = uploadingKey === `slot:${row.id}`;
          const rowProgress = busy ? uploadProgress : null;
          return (
            <li key={row.id} className="px-3 py-2.5">
              <div className="flex w-full items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => onOpenFiles(row)}
                    className="group flex w-full items-start gap-1 text-left"
                  >
                    <ChevronRight className="text-primary mt-0.5 size-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                    <span className="min-w-0 flex-1">
                      <span className="text-foreground group-hover:text-primary block text-sm font-medium leading-snug">
                        {row.title}
                      </span>
                      <span className="text-primary mt-1 block text-[11px] font-semibold">
                        {row.files.length} document{row.files.length === 1 ? '' : 's'} uploaded
                      </span>
                    </span>
                  </button>
                </div>

                <SlotUploadButton
                  busy={busy}
                  disabled={uploadingKey != null}
                  hasFiles={row.files.length > 0}
                  progress={rowProgress}
                  onClick={() => onUploadSlot(row.title, row.id)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t px-3 py-3 space-y-2">
        {extraDrafts.map((draft) => {
          const busy = uploadingKey === `draft:${draft.id}`;
          const rowProgress = busy ? uploadProgress : null;
          return (
            <div
              key={draft.id}
              className="space-y-2 rounded-lg border border-primary/15 bg-primary/[0.02] px-3 py-2"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Document title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={draft.title}
                    onChange={(e) => onUpdateDraft(draft.id, e.target.value)}
                    placeholder="e.g. Special condition addendum"
                    className="h-8 text-xs"
                    disabled={busy || uploadingKey != null}
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive mt-5 size-8 shrink-0"
                  disabled={busy || uploadingKey != null}
                  onClick={() => onRemoveDraft(draft.id)}
                  aria-label="Remove document"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <div className="flex justify-end">
                <SlotUploadButton
                  busy={busy}
                  disabled={uploadingKey != null}
                  hasFiles={false}
                  progress={rowProgress}
                  onClick={() => onUploadExtra(draft.title, draft.id)}
                />
              </div>
            </div>
          );
        })}

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-primary/10 h-8 w-full text-xs font-medium"
          disabled={uploadingKey != null}
          onClick={onAddDraft}
        >
          <Plus className="size-3.5" />
          Add document
        </Button>
      </div>
    </div>
  );
}

const EMPTY_DRAFTS: Record<CreatePropertyDocumentGroup, ExtraDraftRow[]> = {
  tenancy: [],
  landlord: [],
  tenant_application: [],
};

export function PropertyDocumentsTab({
  property,
  propertyId,
  fallbackDocuments = [],
}: {
  property: Property;
  propertyId: string;
  fallbackDocuments?: AgentDocument[];
}) {
  const { apiConnected, uploadDocument } = useAgentData();
  const { detail, refresh } = usePropertyPortalDetail(propertyId, apiConnected);
  const portalDocuments = detail?.documents ?? [];

  const [insuranceExpiry, setInsuranceExpiry] = useState(
    property.landlordInsuranceExpiry?.slice(0, 10) ?? '',
  );
  const [savingInsuranceExpiry, setSavingInsuranceExpiry] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [extraDrafts, setExtraDrafts] =
    useState<Record<CreatePropertyDocumentGroup, ExtraDraftRow[]>>(EMPTY_DRAFTS);
  const [filesRow, setFilesRow] = useState<DocumentChecklistRow | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    uploadedAt?: string;
    href: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{
    upload: PendingUpload;
    group: CreatePropertyDocumentGroup;
  } | null>(null);

  const fullAddress = formatPropertyFullAddress(property);

  useEffect(() => {
    if (!apiConnected) return;
    void propertyRegistryApi
      .get(propertyId)
      .then((record) => {
        setInsuranceExpiry(record.landlordInsuranceExpiry?.slice(0, 10) ?? '');
      })
      .catch(() => {
        setInsuranceExpiry(property.landlordInsuranceExpiry?.slice(0, 10) ?? '');
      });
  }, [apiConnected, propertyId, property.landlordInsuranceExpiry, detail?.overview?.landlordInsuranceExpiry]);

  const insuranceExpiryDisplay =
    insuranceExpiry.trim().length > 0 ? formatDate(insuranceExpiry) : 'Not set';

  const saveInsuranceExpiry = async () => {
    if (!apiConnected) return;
    setSavingInsuranceExpiry(true);
    try {
      await propertyRegistryApi.update(propertyId, {
        landlordInsuranceExpiry: insuranceExpiry || undefined,
      });
      toast.success('Insurance expiry updated');
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update insurance expiry');
    } finally {
      setSavingInsuranceExpiry(false);
    }
  };

  const displayDocs = useMemo<DisplayDoc[]>(() => {
    const byId = new Map<string, DisplayDoc>();

    for (const doc of portalDocuments) {
      byId.set(doc.id, {
        id: doc.id,
        title: doc.title,
        uploadedAt: doc.uploadedAt,
        href: doc.url,
      });
    }

    for (const doc of fallbackDocuments) {
      if (byId.has(doc.id)) continue;
      byId.set(doc.id, {
        id: doc.id,
        title: doc.title,
        uploadedAt: doc.uploadedAt,
        href: doc.downloadUrl ?? doc.href,
      });
    }

    return [...byId.values()];
  }, [portalDocuments, fallbackDocuments]);

  const checklist = useMemo(
    () => buildDocumentChecklistByGroup(displayDocs),
    [displayDocs],
  );

  const startUpload = (
    group: CreatePropertyDocumentGroup,
    upload: PendingUpload,
  ) => {
    if (upload.kind === 'extra' && !upload.title.trim()) {
      toast.error('Enter a document title before uploading');
      return;
    }
    pendingUploadRef.current = { upload, group };
    fileInputRef.current?.click();
  };

  const onUploadSlot = (group: CreatePropertyDocumentGroup, title: string, slotId: string) => {
    startUpload(group, { kind: 'slot', title: title.trim(), slotId });
  };

  const onUploadExtra = (group: CreatePropertyDocumentGroup, title: string, draftId: string) => {
    startUpload(group, { kind: 'extra', title: title.trim(), draftId });
  };

  const addDraft = (group: CreatePropertyDocumentGroup) => {
    setExtraDrafts((prev) => ({
      ...prev,
      [group]: [...prev[group], { id: `draft-${Date.now()}`, title: '' }],
    }));
  };

  const updateDraft = (group: CreatePropertyDocumentGroup, id: string, title: string) => {
    setExtraDrafts((prev) => ({
      ...prev,
      [group]: prev[group].map((row) => (row.id === id ? { ...row, title } : row)),
    }));
  };

  const removeDraft = (group: CreatePropertyDocumentGroup, id: string) => {
    setExtraDrafts((prev) => ({
      ...prev,
      [group]: prev[group].filter((row) => row.id !== id),
    }));
  };

  const onPreview = (file: DocumentChecklistFile, typeTitle: string) => {
    if (!file.href) return;
    setPreview({
      title: file.fileName || typeTitle,
      uploadedAt: file.uploadedAt,
      href: file.href,
    });
  };

  const onFileSelected = async (fileList: FileList | null) => {
    const pending = pendingUploadRef.current;
    if (!fileList?.length || !pending) return;

    const { ok, oversized, blocked } = filterUploadableFiles(Array.from(fileList));
    if (blocked.length > 0) {
      toast.error(
        blocked.length === 1
          ? `${blocked[0].name} is not supported (videos and GIFs are not allowed)`
          : `${blocked.length} files are not supported (videos and GIFs are not allowed)`,
      );
    }
    if (oversized.length > 0) {
      toast.error(
        oversized.length === 1
          ? `${oversized[0].name} exceeds the ${MAX_UPLOAD_LABEL} limit`
          : `${oversized.length} files exceed the ${MAX_UPLOAD_LABEL} limit`,
      );
    }
    if (ok.length === 0) {
      pendingUploadRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const { upload, group } = pending;
    const uploadKey =
      upload.kind === 'slot'
        ? `slot:${upload.slotId}`
        : `draft:${upload.draftId}`;

    setUploadingKey(uploadKey);
    setUploadProgress(0);
    try {
      const baseTitle =
        upload.kind === 'extra'
          ? ensureGroupDocumentTitle(group, upload.title)
          : upload.title;

      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < ok.length; i++) {
        const file = ok[i]!;
        try {
          await uploadDocument(file, 'lease', fullAddress, {
            title: `${baseTitle} — ${file.name}`,
            propertyId,
            onProgress: (pct) => {
              const overall = Math.round(((i + pct / 100) / ok.length) * 100);
              setUploadProgress(overall);
            },
          });
          succeeded += 1;
        } catch {
          failed += 1;
        }
      }

      await refresh();

      if (failed > 0 && succeeded === 0) {
        toast.error('Upload failed');
      } else if (failed > 0) {
        toast.warning(`Uploaded ${succeeded} file${succeeded === 1 ? '' : 's'}, ${failed} failed`);
      } else {
        toast.success(
          succeeded === 1 ? `Uploaded ${ok[0]!.name}` : `Uploaded ${succeeded} files`,
        );
        if (upload.kind === 'extra') {
          removeDraft(group, upload.draftId);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingKey(null);
      setUploadProgress(null);
      pendingUploadRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Document types for {fullAddress}. Upload any file type except videos and GIFs (max{' '}
        {MAX_UPLOAD_LABEL} per file), then click a type to see all uploaded files and preview them.
        Use Add document at the bottom of each section for other documents.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => void onFileSelected(e.target.files)}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-start">
        {PROPERTY_DETAIL_DOCUMENT_GROUP_ORDER.map((g) => {
          const rows = checklist[g];
          const fixedRows = rows.filter((row) => !row.isExtra);
          const extraRows = rows.filter((row) => row.isExtra);

          return (
            <DocumentColumn
              key={g}
              group={g}
              fixedRows={fixedRows}
              extraRows={extraRows}
              extraDrafts={extraDrafts[g]}
              onAddDraft={() => addDraft(g)}
              onUpdateDraft={(id, title) => updateDraft(g, id, title)}
              onRemoveDraft={(id) => removeDraft(g, id)}
              onOpenFiles={setFilesRow}
              onUploadSlot={(title, slotId) => onUploadSlot(g, title, slotId)}
              onUploadExtra={(title, draftId) => onUploadExtra(g, title, draftId)}
              uploadingKey={uploadingKey}
              uploadProgress={uploadProgress}
              insuranceExpiry={
                g === 'landlord'
                  ? {
                      value: insuranceExpiry,
                      displayValue: insuranceExpiryDisplay,
                      editable: apiConnected,
                      saving: savingInsuranceExpiry,
                      onChange: setInsuranceExpiry,
                      onSave: saveInsuranceExpiry,
                    }
                  : undefined
              }
            />
          );
        })}
      </div>

      <PropertyDocumentFilesDialog
        row={filesRow}
        propertyAddress={fullAddress}
        open={filesRow != null}
        onClose={() => setFilesRow(null)}
        onPreview={onPreview}
      />

      <PropertyDocumentPreviewDialog
        doc={preview}
        propertyAddress={fullAddress}
        open={preview != null}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
