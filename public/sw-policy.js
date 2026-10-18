/** Shared by the module Service Worker and its Node regression tests. */
export const PUBLIC_CACHE = 'idealmakoo-public-assets-v1';
export function allowedAsset(input, origin, method = 'GET') {
  if (method !== 'GET') return false;
  let url;
  try { url = new URL(input, origin); } catch { return false; }
  if (url.origin !== origin || url.search || url.username || url.password) return false;
  const path = url.pathname;
  if (/%2f|%5c|%2e/i.test(path)) return false;
  return /^\/media\/official\/[a-zA-Z0-9_./-]+\.(jpg|jpeg|png|webp|avif)$/i.test(path) || /^\/fonts\/[a-zA-Z0-9_./-]+\.(woff2?|ttf|otf)$/i.test(path);
}
export function cacheableResponse(response) {
  return response.ok && response.type !== 'opaque' && !response.redirected && response.headers.get('X-Public-Cache') === '1' && !/no-store|private/i.test(response.headers.get('Cache-Control') || '');
}
