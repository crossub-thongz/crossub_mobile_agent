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
  resolvePendingUploadDisplayLabel,
  resolvePendingUploadTitle,
  type CreatePropertyDocumentGroup,
  type DocumentChecklistFile,
  type DocumentChecklistRow,
} from '@/lib/property-create-document-groups';
import {
  peekPropertyPendingUploads,
  removePendingUploadRecord,
  type PendingPropertyUploadRecord,
} from '@/lib/property-create-pending-uploads';
import {
  filterUploadableFiles,
  MAX_UPLOAD_LABEL,
} from '@/lib/file-upload';
import {
  inspectionReportDisplayName,
  inspectionReportDownloadType,
} from '@/lib/property-portal-documents';
import { dedupePropertyDocumentsForChecklist } from '@/lib/property-document-merge';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import type { AgentDocument, Property } from '@/lib/types';
import { formatPropertyFullAddress } from '@/lib/utils';

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
  readOnly = false,
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
  readOnly?: boolean;
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
              {readOnly ? (
                <span className="text-muted-foreground ml-1.5 text-[10px] font-medium uppercase">
                  Archived
                </span>
              ) : null}
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

          return (
            <li key={row.id} className="px-3 py-2.5">
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

                {!readOnly ? (
                  <SlotUploadButton
                    busy={busy}
                    disabled={uploadingKey != null}
                    hasFiles={row.files.length > 0}
                    progress={rowProgress}
                    onClick={() => onUploadSlot(row.title, row.slotId ?? row.id)}
                  />
                ) : null}
              </div>
            </li>
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

                {!readOnly ? (
                  <SlotUploadButton
                    busy={busy}
                    disabled={uploadingKey != null}
                    hasFiles={row.files.length > 0}
                    progress={rowProgress}
                    onClick={() => onUploadSlot(row.title, row.id)}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {!readOnly ? (
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
      ) : null}
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
  readOnlyGroups = [],
  readOnlyHint,
}: {
  property: Property;
  propertyId: string;
  fallbackDocuments?: AgentDocument[];
  readOnlyGroups?: CreatePropertyDocumentGroup[];
  readOnlyHint?: string;
}) {
  const { apiConnected, uploadDocument, deleteDocument, inspections } = useAgentData();
  const { detail, refresh } = usePropertyPortalDetail(propertyId, apiConnected);
  const portalDocuments = detail?.documents ?? [];
  const propertyInspections = useMemo(
    () => inspections.filter((row) => row.propertyId === propertyId),
    [inspections, propertyId],
  );

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [queuedUpload, setQueuedUpload] = useState<PendingPropertyUploadRecord | null>(null);
  const [queuedRemaining, setQueuedRemaining] = useState(0);
  const [queuePhase, setQueuePhase] = useState<'uploading' | 'saving' | null>(null);
  const inflightQueueRef = useRef<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [extraDrafts, setExtraDrafts] =
    useState<Record<CreatePropertyDocumentGroup, ExtraDraftRow[]>>(EMPTY_DRAFTS);
  const [filesRow, setFilesRow] = useState<DocumentChecklistRow | null>(null);
  const [filesRowGroup, setFilesRowGroup] = useState<CreatePropertyDocumentGroup | null>(null);
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
  const uploadDocumentRef = useRef(uploadDocument);
  uploadDocumentRef.current = uploadDocument;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const fullAddressRef = useRef(fullAddress);
  fullAddressRef.current = fullAddress;

  useEffect(() => {
    if (!apiConnected) return;
    if (inflightQueueRef.current === propertyId) return;

    let cancelled = false;
    void (async () => {
      const queued = await peekPropertyPendingUploads(propertyId);
      if (cancelled || queued.length === 0) return;

      inflightQueueRef.current = propertyId;

      let succeeded = 0;
      let failed = 0;
      const total = queued.length;
      const fileShare = 100 / total;

      for (let i = 0; i < queued.length; i++) {
        if (cancelled) break;
        const record = queued[i]!;
        setQueuedUpload(record);
        setQueuedRemaining(total - i);
        setQueuePhase('uploading');
        setUploadProgress(Math.round(i * fileShare));

        try {
          const file = new File([record.blob], record.fileName, { type: record.mimeType });
          await uploadDocumentRef.current(file, 'lease', fullAddressRef.current, {
            title: resolvePendingUploadTitle(record),
            propertyId,
            skipRefresh: true,
            onProgress: (pct) => {
              const overall = Math.round(i * fileShare + (pct / 100) * fileShare);
              setUploadProgress(overall);
              setQueuePhase(pct >= 95 ? 'saving' : 'uploading');
            },
          });
          await removePendingUploadRecord(propertyId, record.id);
          succeeded += 1;
        } catch (err) {
          failed += 1;
          toast.error(
            err instanceof Error ? err.message : `Failed to upload ${record.fileName}`,
          );
        }
      }

      if (cancelled) return;

      setQueuedUpload(null);
      setQueuedRemaining(0);
      setQueuePhase(null);
      setUploadProgress(null);
      await refreshRef.current();

      if (succeeded === 0 && failed === 0) return;

      if (failed === 0) {
        toast.success(
          succeeded === 1
            ? 'Property document uploaded'
            : `${succeeded} property documents uploaded`,
        );
      } else if (succeeded > 0) {
        toast.warning(
          `Uploaded ${succeeded} document${succeeded === 1 ? '' : 's'}, ${failed} failed — refresh to retry the rest.`,
        );
      } else {
        toast.error('Document uploads failed — refresh this tab to retry.');
      }
    })().finally(() => {
      if (inflightQueueRef.current === propertyId) {
        inflightQueueRef.current = null;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [apiConnected, propertyId]);

  const displayDocs = useMemo<DisplayDoc[]>(() => {
    const mapPortalDoc = (doc: (typeof portalDocuments)[number]): DisplayDoc => {
      let title = doc.title;
      if (doc.category === 'inspection_report') {
        const displayName = inspectionReportDisplayName(
          property,
          propertyInspections,
          doc,
        );
        const category = inspectionReportDownloadType(propertyInspections, doc);
        if (category === 'ingoing') {
          title = `Ingoing Inspection report — ${displayName}`;
        } else if (category === 'outgoing') {
          title = `Outgoing Inspection report — ${displayName}`;
        } else if (category === 'routine') {
          title = `Routine Inspection report — ${displayName}`;
        } else {
          title = `Open Inspection report — ${displayName}`;
        }
      }
      return {
        id: doc.id,
        title,
        uploadedAt: doc.uploadedAt,
        href: doc.url,
      };
    };

    const portalMapped = portalDocuments.map(mapPortalDoc);

    // Portal detail is the source of truth when loaded — fallback `/agent/documents`
    // re-introduces aggregated `inspection:*` rows the portal API already deduped.
    if (apiConnected && detail) {
      return dedupePropertyDocumentsForChecklist(portalMapped);
    }

    const fallbackMapped = fallbackDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      uploadedAt: doc.uploadedAt,
      href: doc.downloadUrl ?? doc.href,
    }));

    return dedupePropertyDocumentsForChecklist([...portalMapped, ...fallbackMapped]);
  }, [
    portalDocuments,
    fallbackDocuments,
    property,
    propertyInspections,
    apiConnected,
    detail,
  ]);

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

  const onDeleteFile = async (file: DocumentChecklistFile) => {
    if (!file.deletable) return;
    setDeletingId(file.id);
    try {
      await deleteDocument(file.id);
      await refresh();
      setFilesRow((current) => {
        if (!current) return null;
        const files = current.files.filter((f) => f.id !== file.id);
        if (files.length === 0) return null;
        return {
          ...current,
          files,
          uploaded: true,
          uploadedAt: files[0]?.uploadedAt,
          href: files[0]?.href,
        };
      });
      toast.success('Document deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
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
      {readOnlyHint ? (
        <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {readOnlyHint}
        </p>
      ) : null}
      {queuedUpload ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-3">
          <DocumentUploadProgress
            percent={uploadProgress ?? 0}
            label={
              queuePhase === 'saving'
                ? `Saving ${resolvePendingUploadDisplayLabel(queuedUpload)}${
                    queuedRemaining > 1 ? ` (${queuedRemaining} left)` : ''
                  }`
                : `Uploading ${resolvePendingUploadDisplayLabel(queuedUpload)}${
                    queuedRemaining > 1 ? ` (${queuedRemaining} left)` : ''
                  }`
            }
          />
          <p className="text-muted-foreground mt-2 text-xs">
            Large files can take a few minutes — keep this tab open until uploads finish.
          </p>
        </div>
      ) : null}
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
              onOpenFiles={(row) => {
                setFilesRow(row);
                setFilesRowGroup(g);
              }}
              onUploadSlot={(title, slotId) => onUploadSlot(g, title, slotId)}
              onUploadExtra={(title, draftId) => onUploadExtra(g, title, draftId)}
              uploadingKey={uploadingKey}
              uploadProgress={uploadProgress}
              readOnly={readOnlyGroups.includes(g)}
            />
          );
        })}
      </div>

      <PropertyDocumentFilesDialog
        row={filesRow}
        propertyAddress={fullAddress}
        open={filesRow != null}
        onClose={() => {
          setFilesRow(null);
          setFilesRowGroup(null);
        }}
        onPreview={onPreview}
        onDelete={
          apiConnected &&
          filesRowGroup != null &&
          !readOnlyGroups.includes(filesRowGroup)
            ? onDeleteFile
            : undefined
        }
        deletingId={deletingId}
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
