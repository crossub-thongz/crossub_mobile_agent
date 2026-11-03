import { ApiError, apiV1 } from '@/lib/api';

/** Same-origin `/api/v1` base; also builds link URLs (report PDFs) through the BFF proxy. */
export const CROSSUB_API_V1_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? '/api'}/v1`;

type QueryValue = string | number | boolean | null | undefined | QueryValue[];

type CallInit = {
  params?: {
    path?: Record<string, string | number>;
    query?: Record<string, QueryValue>;
  };
  body?: unknown;
  parseAs?: 'json' | 'blob' | 'text';
};

type CallResult = {
  data?: unknown;
  error?: unknown;
  response: { ok: boolean; status: number };
};

/**
 * The installed `@crossub-thongz/api-contract` client on this server does not perform HTTP.
 * Trust and the other typed callers use the openapi-fetch shape (`GET(path, { params, body })`),
 * so this sends those calls through the same cookie session as the rest of the portal.
 */
function fillPath(template: string, pathParams: Record<string, string | number> | undefined): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) =>
    encodeURIComponent(String(pathParams?.[key] ?? '')),
  );
}

function appendQuery(search: URLSearchParams, key: string, value: QueryValue): void {
  if (value === undefined || value === null || value === '') return;
  if (Array.isArray(value)) {
    for (const item of value) appendQuery(search, key, item);
    return;
  }
  search.append(key, String(value));
}

function buildPath(template: string, init?: CallInit): string {
  const path = fillPath(template, init?.params?.path);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(init?.params?.query ?? {})) {
    appendQuery(search, key, value);
  }
  const query = search.toString();
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return query ? `${withSlash}?${query}` : withSlash;
}

async function perform(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', path: string, init?: CallInit): Promise<unknown> {
  if (init?.parseAs === 'blob') return apiV1.getBlob(path);
  if (method === 'GET') return apiV1.get(path);
  if (method === 'POST') return apiV1.post(path, init?.body);
  if (method === 'PATCH') return apiV1.patch(path, init?.body ?? {});
  if (method === 'PUT') return apiV1.put(path, init?.body);
  return apiV1.delete(path, init?.body);
}

async function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', template: string, init?: CallInit): Promise<CallResult> {
  try {
    const data = await perform(method, buildPath(template, init), init);
    return { data: data === undefined ? null : data, error: undefined, response: { ok: true, status: 200 } };
  } catch (err) {
    if (err instanceof ApiError) {
      return { data: undefined, error: err.body, response: { ok: false, status: err.status } };
    }
    const message = err instanceof Error ? err.message : 'Request failed';
    return { data: undefined, error: message, response: { ok: false, status: 500 } };
  }
}

export const crossub = {
  GET: (template: string, init?: CallInit) => call('GET', template, init),
  POST: (template: string, init?: CallInit) => call('POST', template, init),
  PATCH: (template: string, init?: CallInit) => call('PATCH', template, init),
  PUT: (template: string, init?: CallInit) => call('PUT', template, init),
  DELETE: (template: string, init?: CallInit) => call('DELETE', template, init),
};
