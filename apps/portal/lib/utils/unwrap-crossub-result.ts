import { ApiError } from '@/lib/api';

/**
 * openapi-fetch resolves rather than throws — but the app's callers expect a thrown `ApiError`
 * carrying the server's message (read back with `apiErrorMessage`). Re-raise so try/catch and
 * message parsing work the same as on the hand-written `api` helpers.
 */
export function unwrapCrossubResult<T>(
  result: { data?: T; error?: unknown; response: Response },
  fallback: string,
): T {
  if (result.error !== undefined || result.data === undefined) {
    throw new ApiError(result.response?.status ?? 500, result.error ?? fallback);
  }
  return result.data;
}
