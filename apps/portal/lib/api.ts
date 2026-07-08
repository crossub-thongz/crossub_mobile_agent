import { ROUTES, isPublicRoute } from '@/constants/routes';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API ${status}`);
  }
}

const isAuthPath = (path: string): boolean => path.startsWith('/auth/');

const onPublicPage = (): boolean => {
  if (typeof window === 'undefined') return false;
  return isPublicRoute(window.location.pathname);
};

const buildHeaders = (init?: RequestInit): HeadersInit => ({
  'Content-Type': 'application/json',
  ...(init?.headers ?? {}),
});

const doFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${API_URL}${path}`, {
    credentials: 'include',
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

const clearSessionAndRedirectToLogin = async (): Promise<void> => {
  if (typeof window === 'undefined' || onPublicPage()) return;

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Best-effort — stale cookies are cleared server-side when logout succeeds.
  }

  window.location.href = ROUTES.LOGIN;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res = await doFetch(path, init);

  if (
    res.status === 401 &&
    typeof window !== 'undefined' &&
    !isAuthPath(path)
  ) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      res = await doFetch(path, init);
    } else {
      await clearSessionAndRedirectToLogin();
      throw new ApiError(401, await parseBody(refreshed));
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
    !isAuthPath(path)
  ) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      res = await doFetch(path, init);
    } else {
      await clearSessionAndRedirectToLogin();
      throw new ApiError(401, await parseBody(refreshed));
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
