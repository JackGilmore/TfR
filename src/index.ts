/**
 * Transport for Rory - Cloudflare Worker
 * Main entry point for the TfR API and static site
 */

import { handleLineStatus, handleStationArrivals, handleGetLines, handleGetStations, handleStationInfo } from './api/routes';
import { corsPreflightResponse } from './utils/cors';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return corsPreflightResponse();
		}

		// API routes
		if (url.pathname.startsWith('/api/')) {
			// GET /api/status - Line status endpoint
			if (url.pathname === '/api/status') {
				return handleLineStatus(request);
			}

			// GET /api/lines - All available lines endpoint
			if (url.pathname === '/api/lines') {
				return handleGetLines();
			}

			// GET /api/stations - Stations endpoint
			if (url.pathname === '/api/stations') {
				return handleGetStations(request);
			}

			// GET /api/station-info/{stopPointId} - Station info endpoint
			const stationInfoMatch = url.pathname.match(/^\/api\/station-info\/([^/]+)$/);
			if (stationInfoMatch) {
				const stopPointId = stationInfoMatch[1];
				return handleStationInfo(stopPointId);
			}

			// GET /api/arrivals/{stopPointId} - Station arrivals endpoint
			const arrivalsMatch = url.pathname.match(/^\/api\/arrivals\/([^/]+)$/);
			if (arrivalsMatch) {
				const stopPointId = arrivalsMatch[1];
				return handleStationArrivals(stopPointId);
			}

			// API route not found
			return new Response(JSON.stringify({ error: 'API endpoint not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Static assets are handled automatically by Cloudflare Workers
		// If we reach here and it's not an API route, return 404
		// (the static assets middleware will intercept before this)
		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;
