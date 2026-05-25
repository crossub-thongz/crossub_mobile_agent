export const ROUTES = {
  DASHBOARD: '/dashboard',
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  MAINTENANCE: '/maintenance',
  KEYS: '/keys',
  VIEWINGS: '/viewings',
} as const;

export const PUBLIC_ROUTE_PATTERNS = [
  /^\/login\/?$/,
  /^\/forgot-password\/?$/,
  /^\/reset-password(\/|$)/,
];

export const isPublicRoute = (pathname: string): boolean =>
  PUBLIC_ROUTE_PATTERNS.some((rx) => rx.test(pathname));
