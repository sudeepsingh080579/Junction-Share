/** Normalize user/contact phone text toward digits WhatsApp wa.me expects (E.164 without +). */
export function toWhatsAppDigits(raw: string, defaultCountry = '1'): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return digits;
  return digits;
}

export function toDisplayPhone(raw: string): string {
  const digits = toWhatsAppDigits(raw);
  if (!digits) return '+1';
  return `+${digits}`;
}
