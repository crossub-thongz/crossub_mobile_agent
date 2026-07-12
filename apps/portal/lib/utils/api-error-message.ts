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
