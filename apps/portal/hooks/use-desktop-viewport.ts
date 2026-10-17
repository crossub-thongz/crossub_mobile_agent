'use client';

import { useEffect, useState } from 'react';

/** Tailwind `lg` — where the module pages switch from list-only to split pane. */
const DESKTOP_VIEWPORT_QUERY = '(min-width: 1024px)';

/** True at `lg` and up. False on the server and first paint, so mobile never mounts desktop-only panes. */
export function useDesktopViewport(): boolean {
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_VIEWPORT_QUERY);
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return desktop;
}
