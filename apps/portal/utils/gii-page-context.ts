import {
  GII_PAGE_LABEL_MAX_LENGTH,
  GII_PAGE_LABEL_SEPARATOR,
  GII_PAGE_NON_RECORD_SEGMENTS,
  GII_PAGE_ROUTES,
  type GiiPageModule,
  type GiiPageRoute,
} from '@/constants/gii-page-context';

export type GiiPageContext = {
  pageModule: GiiPageModule;
  pageLabel: string;
};

function matchRoute(pathname: string): { page: GiiPageRoute; rest: string[] } | null {
  for (const page of GII_PAGE_ROUTES) {
    if (pathname === page.route || pathname.startsWith(`${page.route}/`)) {
      const rest = pathname.slice(page.route.length).split('/').filter(Boolean);
      return { page, rest };
    }
  }
  return null;
}

/**
 * The screen the agent is on, as Cros's `pageModule` and `pageLabel`. A record opened under
 * a module (`/maintenance/[id]`) reads as its detail label; the property on screen, when
 * there is one, is appended so the label alone names the subject.
 *
 * Null on a route Cros has no name for (auth, legal) — the turn then carries no screen.
 */
export function giiPageContextFor(args: {
  pathname: string;
  propertyLabel?: string | null;
}): GiiPageContext | null {
  const match = matchRoute(args.pathname);
  if (!match) return null;
  const { page, rest } = match;
  const onRecord = rest.length > 0 && !GII_PAGE_NON_RECORD_SEGMENTS.has(rest[0]);
  const screen = onRecord ? (page.detailLabel ?? page.label) : page.label;
  const property = args.propertyLabel?.trim();
  const label = property ? `${screen}${GII_PAGE_LABEL_SEPARATOR}${property}` : screen;
  return { pageModule: page.module, pageLabel: label.slice(0, GII_PAGE_LABEL_MAX_LENGTH) };
}

/**
 * True when the property this turn is about differs from the one the previous turn was
 * about — the agent navigated mid-conversation. The server then treats earlier messages
 * as history rather than the subject. False on the first turn and when either side has
 * no property.
 */
export function giiPropertyChanged(
  previousPropertyId: string | null | undefined,
  currentPropertyId: string | null | undefined,
): boolean {
  return Boolean(previousPropertyId && currentPropertyId && previousPropertyId !== currentPropertyId);
}
