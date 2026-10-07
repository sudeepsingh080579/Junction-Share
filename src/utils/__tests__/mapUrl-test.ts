import { isAllowedMapUrl } from '../mapUrl';

describe('isAllowedMapUrl', () => {
  test('allows the Google Maps page, embed, and tile hosts', () => {
    expect(isAllowedMapUrl('about:blank')).toBe(true);
    expect(isAllowedMapUrl('https://www.google.com/maps/search/?api=1&query=park')).toBe(true);
    expect(isAllowedMapUrl('https://www.google.com/maps/embed/v1/place?q=park')).toBe(true);
    expect(isAllowedMapUrl('https://maps.googleapis.com/maps/api/js')).toBe(true);
    expect(isAllowedMapUrl('https://maps.gstatic.com/mapfiles/api-3/images/spotlight.png')).toBe(true);
  });

  test('rejects other sites and non-map Google pages', () => {
    expect(isAllowedMapUrl('http://www.google.com/maps')).toBe(false);
    expect(isAllowedMapUrl('https://example.com/maps')).toBe(false);
    expect(isAllowedMapUrl('https://accounts.google.com/signin')).toBe(false);
    expect(isAllowedMapUrl('javascript:alert(1)')).toBe(false);
  });
});
