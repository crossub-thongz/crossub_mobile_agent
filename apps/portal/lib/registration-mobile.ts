/**
 * Same rules as the API `registration-mobile.util`: the typed number stays as
 * entered, and a valid mobile for the selected calling code becomes E.164.
 * The agency region does not have to match this calling code.
 */

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/mobile';

export const REGISTRATION_COUNTRIES = ['AU', 'NZ'] as const;
export type RegistrationCountry = (typeof REGISTRATION_COUNTRIES)[number];

export function normalizeRegistrationMobile(
  raw: string | null | undefined,
  country: RegistrationCountry,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, '');
  const input = trimmed.startsWith('+')
    ? trimmed
    : digits.startsWith('00')
      ? `+${digits.slice(2)}`
      : trimmed;

  const parsed = parsePhoneNumberFromString(input, country as CountryCode);
  if (!parsed?.isValid()) return null;
  if (parsed.country !== country) return null;
  const type = parsed.getType();
  if (type !== 'MOBILE' && type !== 'FIXED_LINE_OR_MOBILE') return null;
  return parsed.number;
}

export function registrationMobileMessage(
  raw: string,
  country: RegistrationCountry,
): string | null {
  if (normalizeRegistrationMobile(raw, country)) return null;
  return country === 'NZ'
    ? 'Enter a valid New Zealand mobile number. A leading 0 is fine.'
    : 'Enter a valid Australian mobile number. A leading 0 is fine.';
}
