/**
 * API route handlers
 */

import { getLineStatus, getAllTubeStatus, getStationArrivals, getAllLines, searchStations, getPopularStations, getStationInfo, getStationDisruptions } from '../tfl/client';
import { parseLineStatuses, parseStationArrivals } from '../tfl/parser';
import { jsonResponse, errorResponse } from '../utils/cors';
import { addCacheHeaders } from '../utils/cache';

/**
 * Handles requests for tube line status.
 * GET /api/status - Get all tube line statuses
 * GET /api/status?lines=northern,central - Get specific line statuses
 */
export async function handleLineStatus(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const linesParam = url.searchParams.get('lines');

    let lineStatuses;
    if (linesParam) {
      const lines = linesParam.split(',').map((l) => l.trim().toLowerCase());
      lineStatuses = await getLineStatus(lines);
    } else {
      lineStatuses = await getAllTubeStatus();
    }

    const simplifiedStatuses = parseLineStatuses(lineStatuses);
    const response = jsonResponse(simplifiedStatuses);
    return addCacheHeaders(response, 30);
  } catch (error) {
    console.error('Error fetching line status:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch line status',
      500
    );
  }
}

/**
 * Handles requests for all available lines.
 * GET /api/lines - Get all tube, overground, DLR, tram, and Elizabeth line data
 */
export async function handleGetLines(): Promise<Response> {
  try {
    const lines = await getAllLines();

    // Transform to a simpler format with just id and name
    const simplifiedLines = lines.map((line) => ({
      id: line.id,
      name: line.name,
      modeName: line.modeName,
    }));

    // Sort alphabetically by name
    simplifiedLines.sort((a, b) => a.name.localeCompare(b.name));

    const response = jsonResponse(simplifiedLines);
    return addCacheHeaders(response, 3600); // Cache for 1 hour as lines don't change often
  } catch (error) {
    console.error('Error fetching lines:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch lines',
      500
    );
  }
}

/**
 * Handles requests for stations.
 * GET /api/stations - Get popular stations (for initial load)
 * GET /api/stations?query=euston - Search for stations
 */
export async function handleGetStations(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');

    let stations;

    if (query && query.trim().length > 0) {
      // Search for stations using the query
      const searchResults = await searchStations(query.trim());
      stations = searchResults;
    } else {
      // Return popular stations for initial load
      stations = getPopularStations();
    }

    // Transform to a simpler format
    const simplifiedStations = stations
      .filter((station) =>
        station.id &&
        station.name
      )
      .map((station) => ({
        id: station.id,
        name: station.name,
        lat: station.lat,
        lon: station.lon,
      }))
      .slice(0, 100); // Limit to 100 stations

    // Sort alphabetically by name
    simplifiedStations.sort((a, b) => a.name.localeCompare(b.name));

    const response = jsonResponse(simplifiedStations);

    // Cache popular stations longer, search results shorter
    const cacheDuration = query ? 300 : 3600;
    return addCacheHeaders(response, cacheDuration);
  } catch (error) {
    console.error('Error fetching stations:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch stations',
      500
    );
  }
}

/**
 * Handles requests for station arrivals.
 * GET /api/arrivals/{stopPointId} - Get arrivals at a station
 */
export async function handleStationArrivals(
  stopPointId: string
): Promise<Response> {
  console.log(`[API Route] Handling arrivals request for station: ${stopPointId}`);

  try {
    if (!stopPointId) {
      console.error('[API Route] No stop point ID provided');
      return errorResponse('Stop point ID is required', 400);
    }

    console.log(`[API Route] Fetching arrivals for: ${stopPointId}`);
    const arrivals = await getStationArrivals(stopPointId);
    console.log(`[API Route] Received ${arrivals.length} arrivals from TfL client`);

    console.log(`[API Route] Parsing arrivals...`);
    const parsedArrivals = parseStationArrivals(arrivals);
    console.log(`[API Route] Parsed arrivals:`, parsedArrivals);

    const response = jsonResponse(parsedArrivals);
    return addCacheHeaders(response, 20); // Shorter cache for live arrivals
  } catch (error) {
    console.error('[API Route] Error fetching arrivals:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch arrivals',
      500
    );
  }
}

/**
 * Handles requests for station information including lines.
 * GET /api/station-info/{stopPointId} - Get station details and lines
 */
export async function handleStationInfo(
  stopPointId: string
): Promise<Response> {
  try {
    if (!stopPointId) {
      return errorResponse('Stop point ID is required', 400);
    }

    const stationInfo = await getStationInfo(stopPointId);

    // Extract line information
    const lines = stationInfo.lines || [];
    const simplifiedLines = lines.map((line: any) => ({
      id: line.id,
      name: line.name,
      modeName: line.modeName,
    }));

    const response = jsonResponse({
      id: stationInfo.id,
      name: stationInfo.commonName || stationInfo.name,
      lines: simplifiedLines,
    });

    return addCacheHeaders(response, 3600); // Cache for 1 hour
  } catch (error) {
    console.error('Error fetching station info:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch station info',
      500
    );
  }
}

/**
 * Handles requests for station disruption data.
 * GET /api/disruptions/{stopPointId} - Get disruptions at a station
 */
export async function handleStationDisruptions(
  stopPointId: string
): Promise<Response> {
  console.log(`[API Route] Handling disruptions request for station: ${stopPointId}`);

  try {
    if (!stopPointId) {
      return errorResponse('Stop point ID is required', 400);
    }

    const disruptions = await getStationDisruptions(stopPointId);
    console.log(`[API Route] Received ${disruptions.length} disruptions for ${stopPointId}`);

    const response = jsonResponse(disruptions);
    return addCacheHeaders(response, 60); // Cache for 60 seconds
  } catch (error) {
    console.error('[API Route] Error fetching disruptions:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to fetch disruptions',
      500
    );
  }
}
