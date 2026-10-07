import { whatsAppChatUrl, whatsAppGreeting } from '../whatsapp';

describe('whatsAppChatUrl', () => {
  test('builds a wa.me URL from a valid US number', () => {
    const url = whatsAppChatUrl('+1 609-555-0101', 'Hi Alex');
    expect(url).toBe(`https://wa.me/16095550101?text=${encodeURIComponent('Hi Alex')}`);
  });

  test('returns null for an unroutable number', () => {
    expect(whatsAppChatUrl('123', 'Hi')).toBeNull();
    expect(whatsAppChatUrl('', 'Hi')).toBeNull();
  });
});

describe('whatsAppGreeting', () => {
  test('names the destination', () => {
    expect(whatsAppGreeting('Alex', 'MarketFair Mall')).toMatch(/MarketFair Mall/);
  });
});
