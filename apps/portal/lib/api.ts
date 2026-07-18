import { ROUTES } from '@/constants/routes';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

function extractApiErrorMessage(status: number, body: unknown): string {
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (body && typeof body === 'object') {
    const message = (body as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message.trim();
    if (Array.isArray(message) && typeof message[0] === 'string') {
      return message[0].trim();
    }
  }
  return `API ${status}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(extractApiErrorMessage(status, body));
  }
}

/**
 * Auth routes that must not trigger a refresh-retry loop.
 * Authenticated `/auth/*` routes (e.g. change-password, me, system-access-agreement)
 * still refresh on 401 like the rest of the app.
 */
const AUTH_NO_REFRESH_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/register-agent',
  '/auth/register-inspector',
];

const shouldSkipAuthRefresh = (path: string): boolean => {
  const bare = path.split('?')[0] ?? path;
  return AUTH_NO_REFRESH_PATHS.some((p) => bare === p || bare.startsWith(`${p}/`));
};

let refreshInFlight: Promise<boolean> | null = null;

/** One refresh at a time — parallel 401s must not rotate the same refresh token twice. */
const tryRefreshSession = (): Promise<boolean> => {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
};

/** Clears stale httpOnly cookies so route middleware does not bounce /login away. */
const clearSessionAndRedirectToLogin = async (): Promise<never> => {
  if (typeof window === 'undefined') {
    throw new ApiError(401, 'Session expired');
  }

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    // Best effort — ?session=expired lets middleware allow /login with a stale cookie.
  }

  const dest = `${ROUTES.LOGIN}?session=expired`;
  if (
    window.location.pathname !== ROUTES.LOGIN ||
    !window.location.search.includes('session=expired')
  ) {
    window.location.replace(dest);
  }
  throw new ApiError(401, 'Session expired');
};

const buildHeaders = (init?: RequestInit): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(init?.headers ?? {}),
});

const doFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${API_URL}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: buildHeaders(init),
  });

const parseBody = async (res: Response): Promise<unknown> => {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await doFetch(path, init);

  if (
    res.status === 401 &&
    typeof window !== 'undefined' &&
    !shouldSkipAuthRefresh(path)
  ) {
    if (await tryRefreshSession()) {
      res = await doFetch(path, init);
    } else {
      return clearSessionAndRedirectToLogin();
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseBody(res));
  }
  return (await parseBody(res)) as T;
}

async function requestBlob(path: string, init?: RequestInit): Promise<Blob> {
  let res = await doFetch(path, init);

  if (
    res.status === 401 &&
    typeof window !== 'undefined' &&
    !shouldSkipAuthRefresh(path)
  ) {
    if (await tryRefreshSession()) {
      res = await doFetch(path, init);
    } else {
      return clearSessionAndRedirectToLogin();
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseBody(res));
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  getBlob: (path: string) => requestBlob(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/** Versioned mobile facades (`/api/v1/*`) with the same cookie session + 401 refresh as `api`. */
export const apiV1 = {
  get: <T>(path: string) => request<T>(`/v1${path.startsWith('/') ? path : `/${path}`}`),
  post: <T>(path: string, body?: unknown) =>
    request<T>(`/v1${path.startsWith('/') ? path : `/${path}`}`, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(`/v1${path.startsWith('/') ? path : `/${path}`}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: <T>(path: string) =>
    request<T>(`/v1${path.startsWith('/') ? path : `/${path}`}`, { method: 'DELETE' }),
};
