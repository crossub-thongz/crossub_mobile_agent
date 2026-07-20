'use client';

import { useEffect } from 'react';

import { clearChunkReloadGuard, isChunkLoadError, reloadOnceForStaleChunks } from '@/lib/chunk-reload';

/** Auto-reload once when a stale Next.js chunk 404s after deployment. */
export function ChunkReloadGuard() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (!isChunkLoadError(event.error ?? event.message)) return;
      reloadOnceForStaleChunks();
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (!isChunkLoadError(event.reason)) return;
      reloadOnceForStaleChunks();
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);

    const timer = window.setTimeout(clearChunkReloadGuard, 5000);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      window.clearTimeout(timer);
    };
  }, []);

  return null;
}
