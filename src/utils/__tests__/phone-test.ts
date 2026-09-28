import {
  isValidPhone,
  phoneValidationMessage,
  toDisplayPhone,
  toWhatsAppDigits,
  validatePhone,
} from '../phone';

describe('toWhatsAppDigits', () => {
  test('accepts a US number with or without country code and formatting', () => {
    expect(toWhatsAppDigits('6095550101')).toBe('16095550101');
    expect(toWhatsAppDigits('(609) 555-0101')).toBe('16095550101');
    expect(toWhatsAppDigits('1 609 555 0101')).toBe('16095550101');
    expect(toWhatsAppDigits('+1 609-555-0101')).toBe('16095550101');
  });

  test('accepts valid international numbers with an explicit + prefix', () => {
    expect(toWhatsAppDigits('+44 7911 123456')).toBe('447911123456');
    expect(toWhatsAppDigits('+91 98765 43210')).toBe('919876543210');
  });

  test('rejects numbers with an invalid length for their country', () => {
    expect(toWhatsAppDigits('609555')).toBe('');
    expect(toWhatsAppDigits('60955501011')).toBe('');
    expect(toWhatsAppDigits('+1 609 555 010')).toBe('');
    expect(toWhatsAppDigits('+1 609 555 01011')).toBe('');
  });

  test('rejects digit strings that are not routable numbers', () => {
    expect(toWhatsAppDigits('0000000000')).toBe('');
    expect(toWhatsAppDigits('+1234')).toBe('');
    expect(toWhatsAppDigits('+999 12345678')).toBe('');
  });

  test('rejects empty and non-numeric input', () => {
    expect(toWhatsAppDigits('')).toBe('');
    expect(toWhatsAppDigits('   ')).toBe('');
    expect(toWhatsAppDigits('+1')).toBe('');
    expect(toWhatsAppDigits('call me')).toBe('');
  });

  test('honours a different default country for national numbers', () => {
    expect(toWhatsAppDigits('07911 123456', 'GB')).toBe('447911123456');
    expect(toWhatsAppDigits('07911 123456')).toBe('');
  });
});

describe('toDisplayPhone', () => {
  test('returns +E.164 for valid numbers and empty string otherwise', () => {
    expect(toDisplayPhone('609-555-0101')).toBe('+16095550101');
    expect(toDisplayPhone('16095550101')).toBe('+16095550101');
    expect(toDisplayPhone('12345')).toBe('');
  });

  test('is idempotent on its own output', () => {
    const once = toDisplayPhone('+1 (609) 555-0101');
    expect(toDisplayPhone(once)).toBe(once);
  });
});

describe('validatePhone', () => {
  test('classifies problems so the UI can explain them', () => {
    expect(validatePhone('')).toEqual({ ok: false, reason: 'empty' });
    expect(validatePhone('609555')).toEqual({ ok: false, reason: 'too-short' });
    expect(validatePhone('+1 609 555 0101 99')).toEqual({ ok: false, reason: 'too-long' });
    expect(validatePhone('0000000000')).toEqual({ ok: false, reason: 'invalid' });
    expect(validatePhone('+16095550101')).toEqual({ ok: true, e164: '+16095550101', digits: '16095550101' });
  });

  test('phoneValidationMessage stays silent for empty/valid and speaks otherwise', () => {
    expect(phoneValidationMessage(validatePhone(''))).toBeNull();
    expect(phoneValidationMessage(validatePhone('+16095550101'))).toBeNull();
    expect(phoneValidationMessage(validatePhone('609555'))).toMatch(/too short/i);
    expect(phoneValidationMessage(validatePhone('+1 609 555 0101 99'))).toMatch(/too many digits/i);
    expect(phoneValidationMessage(validatePhone('0000000000'))).toMatch(/real phone number/i);
  });

  test('isValidPhone mirrors validatePhone.ok', () => {
    expect(isValidPhone('+16095550101')).toBe(true);
    expect(isValidPhone('+1')).toBe(false);
  });
});
