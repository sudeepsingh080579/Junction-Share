/**
 * Top-level WebView navigations allowed for the destination preview.
 * Subresource hosts Google Maps uses for tiles are included; other sites are not.
 */
export function isAllowedMapUrl(url: string): boolean {
  if (url === 'about:blank' || url.startsWith('about:blank')) return true;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  const host = parsed.hostname;
  if (host.endsWith('.gstatic.com') || host === 'maps.googleapis.com') return true;
  if (/^mt\d+\.google\.com$/.test(host) || host === 'kh.google.com' || host.endsWith('.googleusercontent.com')) {
    return true;
  }
  const mapsSite = host === 'www.google.com' || host === 'google.com' || host === 'maps.google.com';
  return mapsSite && (parsed.pathname === '/maps' || parsed.pathname.startsWith('/maps/'));
}
