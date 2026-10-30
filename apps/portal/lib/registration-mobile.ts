/**
 * Same rules as the API `registration-mobile.util`: the typed number stays as
 * entered, and a valid mobile for the selected calling code becomes E.164.
 * The agency region does not have to match this calling code.
 */

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/mobile';

/** Agency region. The calling code can be a wider set. */
export const REGISTRATION_COUNTRIES = ['AU', 'NZ'] as const;
export type RegistrationCountry = (typeof REGISTRATION_COUNTRIES)[number];

export const PHONE_COUNTRIES = [
  { code: 'AU', name: 'Australia', dial: '+61', placeholder: '0412 345 678', adjective: 'Australian' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', placeholder: '021 123 4567', adjective: 'New Zealand' },
] as const;

export type PhoneCountry = (typeof PHONE_COUNTRIES)[number]['code'];

export function isPhoneCountry(value: string): value is PhoneCountry {
  return PHONE_COUNTRIES.some((country) => country.code === value);
}

export function phoneCountryMeta(code: string) {
  return PHONE_COUNTRIES.find((country) => country.code === code) ?? PHONE_COUNTRIES[0];
}

/** Regional-indicator flag, e.g. AU → 🇦🇺. Display only; it is never submitted. */
export function flagEmoji(code: string): string {
  return [...code.toUpperCase()].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join('');
}

export function normalizeRegistrationMobile(
  raw: string | null | undefined,
  country: PhoneCountry,
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
  country: PhoneCountry,
): string | null {
  if (normalizeRegistrationMobile(raw, country)) return null;
  const meta = phoneCountryMeta(country);
  return `Enter a valid ${meta.adjective} mobile number. A leading 0 is fine.`;
}
