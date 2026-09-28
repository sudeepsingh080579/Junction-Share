/** Normalize a phone number for WhatsApp's wa.me URL (digits only, E.164). */
export function toWhatsAppDigits(raw: string, defaultCountry = '1'): string {
  const input = (raw || '').trim();
  if (!input) return '';

  // Keep an explicit international prefix; otherwise apply the configured default
  // only to a North American 10-digit number.
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (input.startsWith('+')) {
    return digits.length >= 8 && digits.length <= 15 && !digits.startsWith('0') ? digits : '';
  }
  if (digits.length === 10 && defaultCountry === '1') return `1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return '';
}

export function toDisplayPhone(raw: string): string {
  const digits = toWhatsAppDigits(raw);
  return digits ? `+${digits}` : '';
}
