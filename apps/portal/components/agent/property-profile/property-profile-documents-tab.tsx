'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Download,
  Eye,
  Loader2,
  MoreVertical,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { PropertyDocumentPreviewDialog } from '@/components/agent/property-document-preview-dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAgentData } from '@/components/providers/agent-data-provider';
import { agentDocumentPreviewHref } from '@/lib/document-preview';
import {
  filterUploadableFiles,
  MAX_UPLOAD_LABEL,
} from '@/lib/file-upload';
import type { CreatePropertyDocumentGroup } from '@/lib/property-create-document-groups';
import {
  buildPropertyProfileDocuments,
  filterPropertyProfileDocuments,
  PROPERTY_PROFILE_DOCUMENT_CATEGORY_FILTERS,
  PROPERTY_PROFILE_DOCUMENT_UPLOAD_CATEGORIES,
  type PropertyProfileDocumentCategoryFilter,
  type PropertyProfileDocumentRow,
  type PropertyProfileDocumentUploadCategory,
} from '@/lib/property-profile-documents';
import { usePropertyPortalDetail } from '@/lib/use-property-portal-detail';
import type { AgentDocument, Property } from '@/lib/types';
import { cn, formatPropertyFullAddress } from '@/lib/utils';

import '@/components/agent/property-profile/property-profile-v2.css';

const VISIBLE_LIMIT = 6;

function TruncatedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span title={text} className={cn('block min-w-0 truncate', className)}>
      {text}
    </span>
  );
}

function DocumentRowActions({
  row,
  onPreview,
  onDelete,
  deleting,
  readOnly,
}: {
  row: PropertyProfileDocumentRow;
  onPreview: (row: PropertyProfileDocumentRow) => void;
  onDelete: (row: PropertyProfileDocumentRow) => void;
  deleting: boolean;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const href = agentDocumentPreviewHref(row.id, row.href);

  const download = () => {
    if (!href) {
      toast.error('Download is not available for this document');
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = row.title;
    anchor.rel = 'noopener noreferrer';
    anchor.target = '_blank';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={download}
        disabled={!href || deleting}
        className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-lg transition disabled:opacity-40"
        aria-label={`Download ${row.title}`}
      >
        <Download className="size-4" />
      </button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={deleting}
            className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-lg transition disabled:opacity-40"
            aria-label={`Actions for ${row.title}`}
          >
            <MoreVertical className="size-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-40 p-1">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onPreview(row);
            }}
            disabled={!href}
            className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm disabled:opacity-40"
          >
            <Eye className="size-4" />
            Preview
          </button>
          {row.deletable && !readOnly ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete(row);
              }}
              className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function PropertyProfileDocumentsTab({
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

  const [categoryFilter, setCategoryFilter] =
    useState<PropertyProfileDocumentCategoryFilter>('all');
  const [showAll, setShowAll] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] =
    useState<PropertyProfileDocumentUploadCategory>('tenancy');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    fileName?: string;
    uploadedAt?: string;
    href: string;
  } | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);

  const fullAddress = formatPropertyFullAddress(property);
  const tenancyReadOnly =
    readOnlyGroups.includes('tenancy') || readOnlyGroups.includes('tenant_application');

  const allDocuments = useMemo(
    () =>
      buildPropertyProfileDocuments({
        portalDocuments,
        fallbackDocuments,
        property,
        propertyInspections,
        apiConnected,
        portalLoaded: Boolean(detail),
      }),
    [
      portalDocuments,
      fallbackDocuments,
      property,
      propertyInspections,
      apiConnected,
      detail,
    ],
  );

  const filteredDocuments = useMemo(
    () => filterPropertyProfileDocuments(allDocuments, categoryFilter),
    [allDocuments, categoryFilter],
  );

  const visibleDocuments = showAll
    ? filteredDocuments
    : filteredDocuments.slice(0, VISIBLE_LIMIT);
  const hasMore = filteredDocuments.length > VISIBLE_LIMIT && !showAll;

  const uploadCategories = useMemo(
    () =>
      PROPERTY_PROFILE_DOCUMENT_UPLOAD_CATEGORIES.filter((option) => {
        if (option.id === 'tenancy' && tenancyReadOnly) return false;
        return true;
      }),
    [tenancyReadOnly],
  );

  useEffect(() => {
    if (!uploadCategories.some((option) => option.id === uploadCategory)) {
      setUploadCategory(uploadCategories[0]?.id ?? 'property');
    }
  }, [uploadCategories, uploadCategory]);

  const openPreview = (row: PropertyProfileDocumentRow) => {
    const href = agentDocumentPreviewHref(row.id, row.href);
    if (!href) {
      toast.error('Preview is not available for this document');
      return;
    }
    setPreview({
      title: row.title,
      fileName: row.title,
      uploadedAt: row.uploadedAt,
      href,
    });
  };

  const deleteRow = async (row: PropertyProfileDocumentRow) => {
    if (!row.deletable) return;
    setDeletingId(row.id);
    try {
      await deleteDocument(row.id);
      await refresh();
      toast.success('Document deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const resetUploadForm = () => {
    setUploadTitle('');
    pendingFileRef.current = null;
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  };

  const submitUpload = async () => {
    const file = pendingFileRef.current;
    const title = uploadTitle.trim();
    if (!title) {
      toast.error('Enter a document title before uploading');
      return;
    }
    if (!file) {
      toast.error('Choose a file to upload');
      return;
    }

    const uploadMeta = uploadCategories.find((option) => option.id === uploadCategory);
    if (!uploadMeta) {
      toast.error('Choose a document category');
      return;
    }

    const { ok, oversized, blocked } = filterUploadableFiles([file]);
    if (blocked.length > 0) {
      toast.error(`${blocked[0]!.name} is not supported (videos and GIFs are not allowed)`);
      return;
    }
    if (oversized.length > 0) {
      toast.error(`${oversized[0]!.name} exceeds the ${MAX_UPLOAD_LABEL} limit`);
      return;
    }
    if (ok.length === 0) return;

    setUploading(true);
    try {
      await uploadDocument(file, uploadMeta.apiCategory, fullAddress, {
        title: `${title} — ${file.name}`,
        propertyId,
      });
      await refresh();
      toast.success('Document uploaded');
      setUploadOpen(false);
      resetUploadForm();
    } catch (err) {
      if (uploadMeta.apiCategory === 'management_agreement') {
        try {
          await uploadDocument(file, 'lease', fullAddress, {
            title: `${title} — ${file.name}`,
            propertyId,
          });
          await refresh();
          toast.success('Document uploaded');
          setUploadOpen(false);
          resetUploadForm();
          return;
        } catch {
          /* fall through */
        }
      }
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {readOnlyHint ? (
        <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {readOnlyHint}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold">Document categories</h3>
        <Button
          type="button"
          variant="outline"
          className="border-primary/30 text-primary rounded-xl"
          onClick={() => {
            resetUploadForm();
            setUploadOpen(true);
          }}
        >
          <Upload className="size-4" />
          Upload document
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PROPERTY_PROFILE_DOCUMENT_CATEGORY_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => {
              setCategoryFilter(filter.id);
              setShowAll(false);
            }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
              categoryFilter === filter.id
                ? 'border-primary/30 bg-primary/12 text-primary'
                : 'text-muted-foreground hover:bg-muted/50',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {visibleDocuments.length === 0 ? (
        <div className="v2-dashboard__card rounded-2xl border px-4 py-8 text-center">
          <p className="text-sm font-medium">No Documents Yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload a document or complete property workflows to populate this list.
          </p>
          <button
            type="button"
            onClick={() => {
              resetUploadForm();
              setUploadOpen(true);
            }}
            className="text-primary mt-4 inline-flex items-center gap-1 text-sm font-semibold"
          >
            Upload document
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full min-w-[40rem] table-fixed text-sm">
            <colgroup>
              <col className="w-[36%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
              <col className="w-[20%]" />
            </colgroup>
            <thead className="bg-muted/30 text-muted-foreground text-left text-[11px]">
              <tr>
                <th className="px-4 py-3 font-semibold">Document</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Uploaded</th>
                <th className="px-4 py-3 font-semibold">Uploaded By</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleDocuments.map((row) => {
                const rowReadOnly =
                  tenancyReadOnly && (row.category === 'tenancy' || row.category === 'reports');
                return (
                  <tr key={row.id} className="border-t border-border/50">
                    <td className="max-w-0 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openPreview(row)}
                          className="min-w-0 flex-1 overflow-hidden text-left hover:underline"
                        >
                          <TruncatedText text={row.title} className="font-medium" />
                        </button>
                        <span className="bg-muted text-muted-foreground shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                          {row.fileTypeLabel}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-0 px-4 py-3">
                      <TruncatedText text={row.categoryLabel} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">{row.uploadedAt}</td>
                    <td className="max-w-0 px-4 py-3">
                      <TruncatedText text={row.uploadedBy} />
                    </td>
                    <td className="px-4 py-3">
                      <DocumentRowActions
                        row={row}
                        onPreview={openPreview}
                        onDelete={deleteRow}
                        deleting={deletingId === row.id}
                        readOnly={rowReadOnly}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="text-primary inline-flex items-center gap-1 text-sm font-semibold"
          >
            View All Documents
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : null}

      <Dialog
        open={uploadOpen}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) resetUploadForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
            <DialogDescription>
              Add a document for {fullAddress}. Max {MAX_UPLOAD_LABEL} per file.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="document-upload-category">Category</Label>
              <select
                id="document-upload-category"
                value={uploadCategory}
                onChange={(event) =>
                  setUploadCategory(event.target.value as PropertyProfileDocumentUploadCategory)
                }
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                disabled={uploading}
              >
                {uploadCategories.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-upload-title">
                Document Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="document-upload-title"
                value={uploadTitle}
                onChange={(event) => setUploadTitle(event.target.value)}
                placeholder="e.g. Lease agreement"
                disabled={uploading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="document-upload-file">File</Label>
              <Input
                id="document-upload-file"
                ref={uploadInputRef}
                type="file"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  pendingFileRef.current = file;
                }}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void submitUpload()} disabled={uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PropertyDocumentPreviewDialog
        doc={preview}
        propertyAddress={fullAddress}
        open={preview != null}
        onClose={() => setPreview(null)}
      />
    </div>
  );
}
