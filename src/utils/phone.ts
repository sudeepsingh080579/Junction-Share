import { CountryCode, parsePhoneNumberFromString, validatePhoneNumberLength } from 'libphonenumber-js';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'US';

export type PhoneValidation =
  | { ok: true; e164: string; digits: string }
  | { ok: false; reason: 'empty' | 'too-short' | 'too-long' | 'invalid' };

/**
 * Validate a user-entered phone number against real numbering plans so that a
 * wa.me link is only ever built for a number WhatsApp can actually route to.
 * Numbers without an explicit `+` prefix are interpreted in `defaultCountry`.
 */
export function validatePhone(raw: string, defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY): PhoneValidation {
  const input = (raw || '').trim();
  if (!input || !/\d/.test(input)) return { ok: false, reason: 'empty' };

  const parsed = parsePhoneNumberFromString(input, defaultCountry);
  if (parsed?.isValid()) {
    return { ok: true, e164: parsed.number, digits: parsed.number.slice(1) };
  }

  const lengthProblem = validatePhoneNumberLength(input, defaultCountry);
  if (lengthProblem === 'TOO_SHORT') return { ok: false, reason: 'too-short' };
  if (lengthProblem === 'TOO_LONG') return { ok: false, reason: 'too-long' };
  return { ok: false, reason: 'invalid' };
}

export function isValidPhone(raw: string, defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY): boolean {
  return validatePhone(raw, defaultCountry).ok;
}

/** Digits-only E.164 form for WhatsApp's wa.me URL, or '' when the number is not valid. */
export function toWhatsAppDigits(raw: string, defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY): string {
  const v = validatePhone(raw, defaultCountry);
  return v.ok ? v.digits : '';
}

/** `+<E.164>` form for display/storage, or '' when the number is not valid. */
export function toDisplayPhone(raw: string, defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY): string {
  const v = validatePhone(raw, defaultCountry);
  return v.ok ? v.e164 : '';
}

export function phoneValidationMessage(v: PhoneValidation): string | null {
  if (v.ok) return null;
  switch (v.reason) {
    case 'empty':
      return null;
    case 'too-short':
      return 'That number looks too short — include the area code (and +country code outside the US).';
    case 'too-long':
      return 'That number has too many digits — check the country code.';
    default:
      return 'That does not look like a real phone number. Use +country code then the number.';
  }
}
