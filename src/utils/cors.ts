/**
 * CORS utilities for API responses
 */

/**
 * Standard CORS headers for API responses
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

/**
 * Creates a JSON response with CORS headers.
 * @param data - Data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @returns Response object with CORS headers
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS,
  });
}

/**
 * Creates an error response with CORS headers.
 * @param message - Error message
 * @param status - HTTP status code (default: 500)
 * @returns Response object with error and CORS headers
 */
export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: message }, status);
}

/**
 * Handles CORS preflight requests.
 * @returns Response for OPTIONS requests
 */
export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
