'use client';

import { ImagePlus, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Label } from '@/components/ui/label';
import { uploadMaintenancePhoto } from '@/lib/crossub-api/agent-workflow-client';
import { fileToBase64 } from '@/lib/file-upload';
import { cn } from '@/lib/utils';

const MAX_FILES = 5;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILE_LABEL = '25 MB';

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

export function MaintenanceMediaUploadField({
  propertyId,
  photos,
  onPhotosChange,
  disabled = false,
}: {
  propertyId: string;
  photos: string[];
  onPhotosChange: (urls: string[]) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_FILES - photos.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} photos or videos`);
      return;
    }

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files).slice(0, remaining)) {
        const mime = file.type || 'image/jpeg';
        if (!mime.startsWith('image/') && !mime.startsWith('video/')) {
          toast.error(`${file.name} must be a photo or video`);
          continue;
        }
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`${file.name} exceeds the ${MAX_FILE_LABEL} limit`);
          continue;
        }
        const contentBase64 = await fileToBase64(file);
        const { url } = await uploadMaintenancePhoto(propertyId, {
          fileName: file.name,
          mimeType: mime,
          sizeBytes: file.size,
          contentBase64,
        });
        urls.push(url);
      }
      if (urls.length) {
        onPhotosChange([...photos, ...urls]);
        toast.success(
          `${urls.length} file${urls.length === 1 ? '' : 's'} uploaded`,
        );
      }
    } catch {
      toast.error('Upload failed — try again');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (url: string) => {
    onPhotosChange(photos.filter((item) => item !== url));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">Photos & videos</Label>
        <span className="text-muted-foreground text-[10px] tabular-nums">
          {photos.length}/{MAX_FILES}
        </span>
      </div>
      <p className="text-muted-foreground text-[11px]">
        Upload evidence before logging the job (photos or short clips, up to {MAX_FILE_LABEL} each).
      </p>

      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((url) => (
            <li key={url} className="group relative aspect-square overflow-hidden rounded-lg border">
              {isVideoUrl(url) ? (
                <video src={url} className="size-full object-cover" muted playsInline />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="size-full object-cover" />
              )}
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => removePhoto(url)}
                className="bg-background/90 absolute top-1 right-1 rounded-full p-0.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
                aria-label="Remove file"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label
        className={cn(
          'flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-4 text-xs font-medium transition-colors',
          disabled || uploading || photos.length >= MAX_FILES
            ? 'text-muted-foreground cursor-not-allowed opacity-60'
            : 'text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary',
        )}
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImagePlus className="size-4" />
        )}
        {uploading ? 'Uploading…' : 'Add photos or videos'}
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          disabled={disabled || uploading || photos.length >= MAX_FILES}
          onChange={(e) => {
            void uploadFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}
