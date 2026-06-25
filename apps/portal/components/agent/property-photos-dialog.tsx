'use client';

import { useState } from 'react';
import { ImageIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

const PLACEHOLDER_PHOTOS = [
  { id: '1', label: 'Front exterior', url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80' },
  { id: '2', label: 'Living area', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80' },
  { id: '3', label: 'Kitchen', url: 'https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800&q=80' },
];

export function PropertyPhotosButton({
  photos,
  propertyAddress,
}: {
  photos?: { id: string; label: string; url: string }[];
  propertyAddress: string;
}) {
  const [open, setOpen] = useState(false);
  const items = photos?.length ? photos : PLACEHOLDER_PHOTOS;

  return (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <ImageIcon className="size-4" />
        View property photos
      </Button>
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
          </div>
        </div>
      )}
    </>
  );
}
