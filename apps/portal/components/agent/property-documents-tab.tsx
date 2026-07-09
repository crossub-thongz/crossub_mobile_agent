'use client';

import { useMemo, useRef, useState } from 'react';
import { Download, Eye, FileText, Loader2, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { InfoPanel } from '@/components/agent/info-panel';
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
import { useAgentData } from '@/components/providers/agent-data-provider';
import {
  buildDocumentChecklistByGroup,
  CREATE_PROPERTY_DOCUMENT_GROUP_LABELS,
  CREATE_PROPERTY_DOCUMENT_GROUP_ORDER,
  ensureGroupDocumentTitle,
  EXPECTED_PROPERTY_DOCUMENT_SLOTS,
  type CreatePropertyDocumentGroup,
  type DocumentChecklistFile,
  type DocumentChecklistRow,
} from '@/lib/property-create-document-groups';
import {
  documentPreviewKind,
  isViewableDocumentUrl,
} from '@/lib/document-preview';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import type { AgentDocument, Property } from '@/lib/types';
import { cn, formatDateTime } from '@/lib/utils';

type DisplayDoc = {
  id: string;
  title: string;
  uploadedAt: string;
  href?: string | null;
};

type PreviewDoc = {
  title: string;
  uploadedAt?: string;
  href: string;
};

const selectClass =
  'border-input h-9 w-full rounded-md border bg-transparent px-3 text-sm outline-none dark:bg-input/30';

/** Hide Chrome/Edge PDF sidebar thumbnails; keep scrollable page content. */
function pdfPreviewSrc(url: string): string {
  const base = url.split('#')[0] ?? url;
  return `${base}#navpanes=0&scrollbar=1&view=FitH`;
}

function DocumentPreviewDialog({
  doc,
  propertyAddress,
  open,
  onClose,
}: {
  doc: PreviewDoc | null;
  propertyAddress: string;
  open: boolean;
  onClose: () => void;
}) {
  const url = doc && isViewableDocumentUrl(doc.href) ? doc.href : undefined;
  const previewKind = url ? documentPreviewKind(url) : 'none';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent
        className="flex h-[92vh] max-h-[92vh] w-[min(96vw,56rem)] flex-col gap-3 overflow-hidden p-4 sm:max-w-4xl"
        aria-describedby={undefined}
      >
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle className="truncate text-base">{doc?.title ?? 'Document preview'}</DialogTitle>
          <DialogDescription className="truncate text-xs">
            {propertyAddress}
            {doc?.uploadedAt ? ` · Uploaded ${formatDateTime(doc.uploadedAt)}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-secondary/40 min-h-0 flex-1 overflow-hidden rounded-lg border">
          {!url ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-6 text-center">
              <FileText className="text-muted-foreground mb-2 size-10" />
              <p className="text-muted-foreground text-sm">No preview available</p>
            </div>
          ) : previewKind === 'image' ? (
            <div className="flex h-full items-start justify-center overflow-auto bg-black/5 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={doc?.title ?? 'Document'}
                className="h-auto w-full max-w-full object-contain"
              />
            </div>
          ) : previewKind === 'pdf' ? (
            <iframe
              title={doc?.title ?? 'Document'}
              src={pdfPreviewSrc(url)}
              className="h-full min-h-0 w-full border-0 bg-background"
            />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-6 text-center">
              <FileText className="text-muted-foreground mb-2 size-10" />
              <p className="text-muted-foreground text-sm">
                Preview not supported for this file type
              </p>
              <p className="text-muted-foreground mt-1 text-xs">Use Download below.</p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:justify-between">
          {url ? (
            <Button asChild className="gap-1.5">
              <a href={url} download={doc?.title ?? 'document'} target="_blank" rel="noopener noreferrer">
                <Download className="size-3.5" />
                Download
              </a>
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocumentColumn({
  group,
  rows,
  onPreview,
  onAddNew,
  uploadingSlotId,
}: {
  group: CreatePropertyDocumentGroup;
  rows: DocumentChecklistRow[];
  onPreview: (file: DocumentChecklistFile, typeTitle: string) => void;
  onAddNew: (title: string, slotId?: string) => void;
  uploadingSlotId: string | null;
}) {
  const uploadedCount = rows.filter((r) => r.uploaded).length;

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
              {uploadedCount}/{rows.length} types uploaded
            </p>
          </div>
        </div>
      </div>

      <ul className="divide-border/70 max-h-[min(70vh,640px)] flex-1 divide-y overflow-y-auto">
        {rows.map((row) => {
          const busy = uploadingSlotId != null && uploadingSlotId === (row.slotId ?? row.id);
          const single = row.files.length === 1 ? row.files[0] : null;
          const singlePreview = single && isViewableDocumentUrl(single.href);

          return (
            <li key={row.id} className="px-3 py-2.5">
              <div className="flex w-full items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {singlePreview ? (
                    <button
                      type="button"
                      onClick={() => onPreview(single, row.title)}
                      className="group flex w-full items-start gap-1.5 text-left"
                    >
                      <Eye className="text-primary mt-0.5 size-3.5 shrink-0 opacity-80 group-hover:opacity-100" />
                      <span className="text-foreground group-hover:text-primary text-sm font-medium leading-snug">
                        {row.title}
                      </span>
                    </button>
                  ) : (
                    <p className="text-sm font-medium leading-snug">{row.title}</p>
                  )}

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {!row.uploaded ? (
                      <span className="text-muted-foreground text-[11px]">Not uploaded</span>
                    ) : row.files.length > 1 ? (
                      <span className="text-primary text-[11px] font-semibold">
                        {row.files.length} files uploaded
                      </span>
                    ) : (
                      <>
                        <span className="text-primary text-[11px] font-semibold">Uploaded</span>
                        {single?.uploadedAt ? (
                          <span className="text-muted-foreground text-[11px] tabular-nums">
                            {formatDateTime(single.uploadedAt)}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy || uploadingSlotId != null}
                  onClick={() => onAddNew(row.title, row.slotId)}
                  className="text-primary hover:bg-primary/10 inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                  {busy ? 'Uploading…' : 'Add new'}
                </button>
              </div>

              {row.files.length > 1 ? (
                <ul className="mt-2 w-full space-y-1">
                  {row.files.map((file, index) => {
                    const canPreview = isViewableDocumentUrl(file.href);
                    return (
                      <li key={file.id} className="w-full">
                        {canPreview ? (
                          <button
                            type="button"
                            onClick={() => onPreview(file, row.title)}
                            className="group hover:bg-muted/50 flex w-full items-center gap-2 rounded-md px-0 py-1.5 text-left"
                          >
                            <Eye className="text-primary size-3.5 shrink-0 opacity-80 group-hover:opacity-100" />
                            <span className="text-muted-foreground min-w-0 flex-1 truncate text-[11px] font-medium">
                              {file.fileName}
                              {index === 0 ? (
                                <span className="text-primary ml-1.5 text-[10px] font-semibold">
                                  Latest
                                </span>
                              ) : null}
                            </span>
                            <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                              {formatDateTime(file.uploadedAt)}
                            </span>
                          </button>
                        ) : (
                          <div className="flex w-full items-center gap-2 py-1.5">
                            <span className="text-muted-foreground min-w-0 flex-1 truncate text-[11px] font-medium">
                              {file.fileName}
                            </span>
                            <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                              {formatDateTime(file.uploadedAt)}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

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

  const [customGroup, setCustomGroup] = useState<CreatePropertyDocumentGroup>('tenancy');
  const [customTitle, setCustomTitle] = useState('');
  const [uploadingSlotId, setUploadingSlotId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ title: string; slotId: string } | null>(null);

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

  const slotOptions = useMemo(
    () => EXPECTED_PROPERTY_DOCUMENT_SLOTS.filter((s) => s.group === customGroup),
    [customGroup],
  );

  const startUpload = (title: string, slotId?: string) => {
    pendingUploadRef.current = {
      title: title.trim(),
      slotId: slotId ?? `custom-${Date.now()}`,
    };
    fileInputRef.current?.click();
  };

  const onAddNew = (title: string, slotId?: string) => {
    const slot = slotId
      ? EXPECTED_PROPERTY_DOCUMENT_SLOTS.find((s) => s.id === slotId)
      : undefined;
    startUpload(slot?.label ?? title, slotId);
  };

  const onPreview = (file: DocumentChecklistFile, typeTitle: string) => {
    if (!isViewableDocumentUrl(file.href)) return;
    const isGenericLabel =
      file.fileName === 'Document' || /^File \d+$/.test(file.fileName);
    setPreview({
      title: isGenericLabel ? typeTitle : file.fileName || typeTitle,
      uploadedAt: file.uploadedAt,
      href: file.href,
    });
  };

  const onPickCustomFile = () => {
    if (!customTitle.trim()) {
      toast.error('Enter a document title before uploading');
      return;
    }
    const title = ensureGroupDocumentTitle(customGroup, customTitle.trim());
    startUpload(title, `custom-${customGroup}`);
  };

  const onFileSelected = async (fileList: FileList | null) => {
    const pending = pendingUploadRef.current;
    if (!fileList?.length || !pending) return;
    const files = Array.from(fileList);

    setUploadingSlotId(pending.slotId);
    try {
      const propertyAddress = `${property.address}, ${property.suburb}`;
      const results = await Promise.allSettled(
        files.map((file) =>
          uploadDocument(file, 'lease', propertyAddress, {
            title: pending.title,
            propertyId,
          }),
        ),
      );
      await refresh();
      const failed = results.filter((r) => r.status === 'rejected').length;
      const ok = results.length - failed;
      if (failed > 0 && ok === 0) {
        toast.error('Upload failed');
      } else if (failed > 0) {
        toast.warning(`Uploaded ${ok} file${ok === 1 ? '' : 's'}, ${failed} failed`);
      } else {
        toast.success(
          ok === 1 ? `Uploaded ${files[0].name}` : `Uploaded ${ok} files`,
        );
      }
      setCustomTitle('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingSlotId(null);
      pendingUploadRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Document types for {property.address}. You can upload multiple files per type. Click a file
        to preview and download.
      </p>

            <InfoPanel title="Add other document" icon={Plus}>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Group
              </Label>
              <select
                value={customGroup}
                onChange={(e) => {
                  setCustomGroup(e.target.value as CreatePropertyDocumentGroup);
                  setCustomTitle('');
                }}
                className={selectClass}
                disabled={uploadingSlotId != null}
              >
                {CREATE_PROPERTY_DOCUMENT_GROUP_ORDER.map((g) => (
                  <option key={g} value={g}>
                    {CREATE_PROPERTY_DOCUMENT_GROUP_LABELS[g]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Document title
              </Label>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                list={`doc-titles-${customGroup}`}
                placeholder="Type or pick a document type"
                disabled={uploadingSlotId != null}
              />
              <datalist id={`doc-titles-${customGroup}`}>
                {slotOptions.map((s) => (
                  <option key={s.id} value={s.label} />
                ))}
              </datalist>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            className={cn('gap-1.5')}
            disabled={uploadingSlotId != null}
            onClick={onPickCustomFile}
          >
            {uploadingSlotId?.startsWith('custom-') ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {uploadingSlotId?.startsWith('custom-') ? 'Uploading…' : 'Upload document'}
          </Button>
        </div>
      </InfoPanel>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv"
        onChange={(e) => void onFileSelected(e.target.files)}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:items-start">
        {CREATE_PROPERTY_DOCUMENT_GROUP_ORDER.map((g) => (
          <DocumentColumn
            key={g}
            group={g}
            rows={checklist[g]}
            onPreview={onPreview}
            onAddNew={onAddNew}
            uploadingSlotId={uploadingSlotId}
          />
        ))}
      </div>



      <DocumentPreviewDialog
        doc={preview}
        propertyAddress={property.address}
        open={preview != null}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
