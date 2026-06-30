import { PASSWORD_MIN } from '@/constants/auth';

/** Generates a tenant-safe password that satisfies portal minimum length rules. */
export function generateTenantPassword(length = PASSWORD_MIN): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;

  const pick = (chars: string) =>
    chars[crypto.getRandomValues(new Uint32Array(1))[0]! % chars.length]!;

  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  const rest: string[] = [];
  while (required.length + rest.length < length) {
    rest.push(pick(all));
  }

  return [...required, ...rest]
    .sort(() => (crypto.getRandomValues(new Uint32Array(1))[0]! % 2 === 0 ? 1 : -1))
    .join('');
}
