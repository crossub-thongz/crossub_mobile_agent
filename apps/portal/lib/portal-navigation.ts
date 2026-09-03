import { propertyDetail, ROUTES } from '@/constants/routes';

const CURRENT_KEY = 'crossub.portal.nav.current';
const PREVIOUS_KEY = 'crossub.portal.nav.previous';

/** Primary destinations — Back here would jump to an unrelated hub (e.g. Tasks → Dashboard). */
const TOP_LEVEL_PATHS = new Set<string>([
  ROUTES.DASHBOARD,
  ROUTES.PROPERTIES,
  ROUTES.TASKS,
]);

export function portalLocation(pathname: string, search: string): string {
  const query = search.startsWith('?') ? search.slice(1) : search;
  return query ? `${pathname}?${query}` : pathname;
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export function peekPortalPreviousPath(currentPath: string): string | null {
  const storedCurrent = readStorage(CURRENT_KEY);
  if (storedCurrent && storedCurrent !== currentPath) return storedCurrent;
  const storedPrevious = readStorage(PREVIOUS_KEY);
  if (storedPrevious && storedPrevious !== currentPath) return storedPrevious;
  return null;
}

export function recordPortalPath(path: string) {
  const storedCurrent = readStorage(CURRENT_KEY);
  if (storedCurrent && storedCurrent !== path) {
    writeStorage(PREVIOUS_KEY, storedCurrent);
  }
  writeStorage(CURRENT_KEY, path);
}

export function isTopLevelPortalPath(
  pathname: string,
  searchParams: Pick<URLSearchParams, 'get'>,
): boolean {
  if (!TOP_LEVEL_PATHS.has(pathname)) return false;
  if (pathname === ROUTES.TASKS && searchParams.get('property')) return false;
  return true;
}

export function labelForPortalPath(href: string): string {
  const pathname = href.split('?')[0] ?? href;
  if (pathname === ROUTES.DASHBOARD) return 'Dashboard';
  if (pathname === ROUTES.TASKS) return 'Tasks';
  if (pathname === ROUTES.PROPERTIES) return 'Properties';
  if (pathname === ROUTES.ARCHIVE) return 'History';
  if (pathname === ROUTES.MORE) return 'More';
  if (pathname === ROUTES.BILL) return 'Invoice';
  if (pathname === ROUTES.MESSAGES) return 'Messages';
  if (pathname === ROUTES.PROFILE) return 'Profile';
  if (pathname === ROUTES.SEARCH) return 'Search';
  if (pathname === ROUTES.SUPPORT) return 'Support';
  if (pathname.startsWith('/properties/')) return 'Property';
  if (pathname.startsWith('/inspections')) return 'Inspection';
  if (pathname.startsWith('/maintenance')) return 'Maintenance';
  if (pathname.startsWith('/rent-review')) return 'Rent review';
  if (pathname.startsWith('/leasing')) return 'Leasing';
  if (pathname.startsWith('/vacating')) return 'End leasing';
  if (pathname.startsWith('/tribunal')) return 'Tribunal';
  return 'Back';
}

function isInternalPortalPath(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  if (href.startsWith('/login') || href.startsWith('/register')) return false;
  return true;
}

export function resolvePortalBackTarget(input: {
  pathname: string;
  searchParams: Pick<URLSearchParams, 'get' | 'toString'>;
  previousPath: string | null;
  fallbackHref?: string;
  fallbackLabel?: string;
  fromHref?: string | null;
  fromLabel?: string | null;
}): { href: string; label: string } | null {
  if (isTopLevelPortalPath(input.pathname, input.searchParams)) {
    return null;
  }

  const previous = input.previousPath?.trim() || null;
  if (previous && isInternalPortalPath(previous)) {
    const current = portalLocation(input.pathname, input.searchParams.toString());
    if (previous !== current) {
      return { href: previous, label: labelForPortalPath(previous) };
    }
  }

  if (input.fromHref) {
    return { href: input.fromHref, label: input.fromLabel || labelForPortalPath(input.fromHref) };
  }

  const propertyId = input.searchParams.get('property');
  if (input.pathname === ROUTES.TASKS && propertyId) {
    return { href: propertyDetail(propertyId), label: 'Property' };
  }

  if (input.fallbackHref) {
    return {
      href: input.fallbackHref,
      label: input.fallbackLabel || labelForPortalPath(input.fallbackHref),
    };
  }

  return null;
}
