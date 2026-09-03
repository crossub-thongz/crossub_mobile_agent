const STORAGE_KEY = 'crossub-agent-chunk-reload';

/** True when the browser is holding an old build that references removed Next.js chunks. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const name = error instanceof Error ? error.name : '';
  return (
    name === 'ChunkLoadError' ||
    /Failed to load chunk|Loading chunk [\d]+ failed|Importing a module script failed/i.test(
      message,
    )
  );
}

/** Fast Refresh cannot recover after a hooks-order crash; a full reload is required. */
export function isHooksOrderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /Rendered more hooks than during the previous render|change in the order of Hooks/i.test(
    message,
  );
}

export function isStaleClientRenderError(error: unknown): boolean {
  return isChunkLoadError(error) || isHooksOrderError(error);
}

/** Reload once per tab session so a post-deploy stale bundle can fetch the latest chunks. */
export function reloadOnceForStaleChunks(): boolean {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return false;
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore — still attempt one reload
  }
  window.location.reload();
  return true;
}

export function clearChunkReloadGuard(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
