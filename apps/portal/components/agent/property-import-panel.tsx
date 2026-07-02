'use client';

import { useRef, useState } from 'react';
import { FolderArchive, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  parsePmsPackage,
  pmsSourceLabel,
  type PropertyImportResult,
} from '@/lib/property-import';

interface PropertyImportPanelProps {
  onImport: (result: PropertyImportResult, files: File[]) => void;
}

export function PropertyImportPanel({ onImport }: PropertyImportPanelProps) {
  const folderRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PropertyImportResult | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    setLoading(true);
    try {
      const result = await parsePmsPackage(files);
      setPreview(result);
      setPendingFiles(files);
      toast.success(
        `Detected ${pmsSourceLabel(result.source)} — ${Object.keys(result.matchedDocuments).length} document types matched`,
      );
    } catch {
      toast.error('Could not parse import package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <Package className="text-primary mt-0.5 size-5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">One-click import</p>
          <p className="text-muted-foreground text-xs">
            Upload a PropertyMe or PropertyTree export folder (or multi-select files). Include{' '}
            <code className="text-[10px]">manifest.json</code> when available. Documents auto-map
            to the checklist and fields pre-fill.
          </p>
        </div>
      </div>

      <input
        ref={folderRef}
        type="file"
        className="hidden"
        // @ts-expect-error webkitdirectory is supported in Chromium/Safari
        webkitdirectory=""
        multiple
        onChange={(e) => void processFiles(Array.from(e.target.files ?? []))}
      />
      <input
        ref={fileRef}
        type="file"
        className="hidden"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.json,.csv,.zip"
        onChange={(e) => void processFiles(Array.from(e.target.files ?? []))}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => folderRef.current?.click()}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <FolderArchive className="size-4" />}
          <span className="ml-1">Import folder</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading}
          onClick={() => fileRef.current?.click()}
        >
          Select files
        </Button>
        {preview && (
          <Button
            type="button"
            size="sm"
            onClick={() => onImport(preview, pendingFiles)}
          >
            Apply import
          </Button>
        )}
      </div>

      {preview && (
        <div className="text-muted-foreground space-y-1 text-xs">
          <p>
            Source: <span className="text-foreground font-medium">{pmsSourceLabel(preview.source)}</span>
          </p>
          {preview.prefill.address && (
            <p>
              Address: {preview.prefill.address}
              {preview.prefill.suburb ? `, ${preview.prefill.suburb}` : ''}
            </p>
          )}
          <p>
            Matched {Object.keys(preview.matchedDocuments).length} checklist types ·{' '}
            {preview.unmatchedFiles.length} unmatched files
          </p>
        </div>
      )}
    </div>
  );
}
