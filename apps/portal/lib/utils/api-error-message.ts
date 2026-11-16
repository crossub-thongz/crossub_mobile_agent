import { ApiError } from '@/lib/api';

export function apiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof ApiError) {
    const body = err.body;
    if (typeof body === 'string' && body.trim()) return body;
    if (body && typeof body === 'object') {
      const message = (body as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
      if (Array.isArray(message) && typeof message[0] === 'string' && message[0].trim()) {
        return message[0];
      }
    }
    if (err.status === 403) {
      return 'You do not have permission to perform this action';
    }
    if (err.message.trim() && err.message !== `API ${err.status}`) return err.message;
    return `Request failed (${err.status})`;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === 'string' && err.trim()) return err;
  return fallback;
}

/** The machine-readable `code` an API error body carries, when it has one. */
export function apiErrorCode(err: unknown): string | null {
  if (!(err instanceof ApiError)) return null;
  const body = err.body;
  if (!body || typeof body !== 'object') return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === 'string' && code.trim() ? code : null;
}

/** One failed rule in an API validation failure (`errors: [...]`). */
export interface ApiValidationIssue {
  field: string;
  message: string;
}

/**
 * The list of what failed, when the API sent one (a 422 with `errors`). Null for any other
 * error, so the caller falls back to the single message.
 */
export function apiValidationIssues(err: unknown): ApiValidationIssue[] | null {
  if (!(err instanceof ApiError)) return null;
  const body = err.body;
  if (!body || typeof body !== 'object') return null;
  const errors = (body as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return null;
  return errors.flatMap((item): ApiValidationIssue[] => {
    if (!item || typeof item !== 'object') return [];
    const { field, message } = item as { field?: unknown; message?: unknown };
    return typeof field === 'string' && typeof message === 'string' ? [{ field, message }] : [];
  });
}
