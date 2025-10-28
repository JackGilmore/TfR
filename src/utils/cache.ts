/**
 * Cache utilities for API responses
 */

/**
 * Default cache duration in seconds
 */
const DEFAULT_CACHE_TTL = 30; // 30 seconds for live data

/**
 * Adds cache headers to a response.
 * @param response - Response to add cache headers to
 * @param ttl - Time to live in seconds (default: 30)
 * @returns Response with cache headers added
 */
export function addCacheHeaders(
  response: Response,
  ttl: number = DEFAULT_CACHE_TTL
): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', `public, max-age=${ttl}`);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
