'use client';

import { useRef, useState } from 'react';
import { ImageIcon, ImagePlus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

export interface PropertyPhoto {
  id: string;
  label: string;
  url: string;
}

export function PropertyPhotosButton({
  photos: photosProp,
  propertyAddress,
}: {
  photos?: PropertyPhoto[];
  propertyAddress: string;
}) {
  const [open, setOpen] = useState(false);
  const [localPhotos, setLocalPhotos] = useState<PropertyPhoto[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = [...(photosProp ?? []), ...localPhotos];

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const added = Array.from(files).map((file, index) => ({
      id: `local-${Date.now()}-${index}`,
      label: file.name.replace(/\.[^.]+$/, ''),
      url: URL.createObjectURL(file),
    }));
    setLocalPhotos((prev) => [...prev, ...added]);
  };

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setOpen(true)}
        >
          <ImageIcon className="size-4" />
          View property photos
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          Add property photos
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="sr-only"
          onChange={(e) => {
            addPhotos(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-background flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Property photos</h2>
                <p className="text-muted-foreground truncate text-xs">{propertyAddress}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground flex size-8 items-center justify-center rounded-lg hover:bg-secondary"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            {items.length === 0 ? (
              <div className="text-muted-foreground p-8 text-center text-sm">
                No photos yet. Use Add property photos on the overview tab.
              </div>
            ) : (
              <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
                {items.map((photo) => (
                  <figure key={photo.id} className="overflow-hidden rounded-xl border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.label}
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <figcaption className="px-3 py-2 text-xs font-medium">{photo.label}</figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
