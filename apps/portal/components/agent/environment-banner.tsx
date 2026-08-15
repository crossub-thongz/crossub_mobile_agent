import { AlertTriangle } from 'lucide-react';

import {
  ENVIRONMENT_BANNER_HEIGHT,
  ENVIRONMENT_BANNER_HEIGHT_VAR,
  ENVIRONMENT_BANNER_COPY,
} from '@/constants/environment-banner';
import { resolveEnvironmentBanner } from '@/lib/environment-banner';

/**
 * A server component on purpose.
 *
 * Reading the environment on the server, in a layout already marked `force-dynamic`, means
 * the decision is made per request from the live process environment. The alternative —
 * `NEXT_PUBLIC_*` — is inlined at build time, so a service whose variable was set after its
 * last build would keep serving a bundle that says nothing, and the banner would be missing
 * exactly where it was just configured. It also renders with no client JavaScript, so it is
 * on screen in the first paint of the login page rather than after hydration.
 */
export function EnvironmentBanner() {
  const banner = resolveEnvironmentBanner({
    label: process.env.CROSSUB_ENVIRONMENT_LABEL,
    apiInternalUrl: process.env.API_INTERNAL_URL,
    productionUrl: process.env.CROSSUB_AGENT_PRODUCTION_URL,
  });

  if (!banner) return null;

  return (
    <>
      {/*
        The height is published as a CSS variable rather than hard-coded at each offset.
        Every fixed element downstream reads it with a `0px` default, so production — where
        this component returns null and the variable is never defined — resolves to exactly
        the offsets it uses today. The banner cannot shift a layout it is not rendered into.
      */}
      <style>{`:root{${ENVIRONMENT_BANNER_HEIGHT_VAR}:calc(${ENVIRONMENT_BANNER_HEIGHT} + env(safe-area-inset-top))}body{padding-top:var(${ENVIRONMENT_BANNER_HEIGHT_VAR})}`}</style>
      <div
        role="status"
        style={{ height: `var(${ENVIRONMENT_BANNER_HEIGHT_VAR})` }}
        className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 border-b border-amber-700/40 bg-amber-400 px-3 pt-[env(safe-area-inset-top)] text-amber-950"
      >
        <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
        <p className="truncate text-[11px] leading-none font-semibold tracking-wide">
          <span className="uppercase">{banner.label}</span>
          <span className="font-normal"> — {banner.detail}</span>
        </p>
        <a
          href={banner.productionUrl}
          className="shrink-0 text-[11px] leading-none font-semibold whitespace-nowrap underline underline-offset-2 hover:no-underline"
        >
          {ENVIRONMENT_BANNER_COPY.LINK}
        </a>
      </div>
    </>
  );
}
