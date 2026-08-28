'use client';

import { useRef, useState } from 'react';
import { Camera, Home, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { uploadPropertyImage } from '@/lib/crossub-api/agent-client';
import { fileToBase64 } from '@/lib/file-upload';
import { cn } from '@/lib/utils';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPT = 'image/jpeg,image/png,image/webp';

export function PropertyProfilePhoto({
  propertyId,
  imageUrl,
  onImageUpdated,
  className,
}: {
  propertyId: string;
  imageUrl?: string | null;
  onImageUpdated?: (url: string) => void;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayUrl = previewUrl ?? imageUrl ?? null;

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a JPEG, PNG, or WebP image');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('Image must be 25 MB or smaller');
      return;
    }

    setUploading(true);
    try {
      const contentBase64 = await fileToBase64(file);
      const { url } = await uploadPropertyImage(propertyId, {
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        contentBase64,
      });
      setPreviewUrl(url);
      onImageUpdated?.(url);
      toast.success('Property photo updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={cn('group relative size-20 shrink-0', className)}>
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="bg-muted/40 text-muted-foreground relative flex size-full items-center justify-center overflow-hidden rounded-xl border transition hover:border-primary/40"
        aria-label={displayUrl ? 'Change property photo' : 'Upload property photo'}
      >
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="size-full object-cover" />
        ) : (
          <Home className="size-8" aria-hidden />
        )}
        <span
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100',
            uploading && 'opacity-100',
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <Camera className="size-5" />
              <span className="text-[10px] font-semibold">Upload</span>
            </>
          )}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
          event.target.value = '';
        }}
      />
    </div>
  );
}
