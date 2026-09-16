/**
 * TfL API client for fetching transport data
 */

import { env } from "cloudflare:workers";
import type { LineStatus, Arrival, StationDisruption } from '../types';

const TFL_API_BASE = 'https://api.tfl.gov.uk';
const TFL_API_KEY = env.TFL_API_KEY;

/**
 * Fetches the current status of specific tube lines.
 * @param lines - Array of line IDs to fetch (e.g. ['northern', 'central'])
 * @returns An array of line status objects from the TfL API.
 */
export async function getLineStatus(lines: string[]): Promise<LineStatus[]> {
  const lineIds = lines.join(',');
  const response = await fetch(`${TFL_API_BASE}/Line/${lineIds}/Status`, {
    headers: {
      'Accept': 'application/json',
      'app_key': TFL_API_KEY
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch line status: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches all tube line statuses.
 * @returns An array of all tube line status objects from the TfL API.
 */
export async function getAllTubeStatus(): Promise<LineStatus[]> {
  const response = await fetch(`${TFL_API_BASE}/Line/Mode/tube/Status`, {
    headers: {
      'Accept': 'application/json',
      'app_key': TFL_API_KEY
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tube status: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches all available tube and rail lines.
 * @returns An array of all line objects from the TfL API.
 */
export async function getAllLines(): Promise<LineStatus[]> {
  const response = await fetch(`${TFL_API_BASE}/Line/Mode/tube,overground,elizabeth-line,dlr,tram/Status`, {
    headers: {
      'Accept': 'application/json',
      'app_key': TFL_API_KEY
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch lines: ${response.status}`);
  }

  return response.json();
}

/**
 * Searches for stations by name.
 * @param query - Search query for station name
 * @returns An array of station objects matching the query
 */
export async function searchStations(query: string): Promise<any[]> {
  const response = await fetch(
    `${TFL_API_BASE}/StopPoint/Search/${encodeURIComponent(query)}`,
    {
      headers: {
        'Accept': 'application/json',
        'app_key': TFL_API_KEY
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch stations: ${response.status}`);
  }

  const data: any = await response.json();

  // Return the matches from search results
  if (data.matches) {
    return data.matches;
  }

  return [];
}

/**
 * Gets a list of popular London stations (hardcoded for initial load)
 */
export function getPopularStations(): any[] {
  return [
    { id: '940GZZLUBST', name: 'Baker Street' },
    { id: '940GZZLUBNK', name: 'Bank' },
    { id: '940GZZLUBND', name: 'Bond Street' },
    { id: '940GZZLUCGN', name: 'Charing Cross' },
    { id: '940GZZLUEUS', name: 'Euston' },
    { id: '940GZZLUGPK', name: 'Green Park' },
    { id: '940GZZLUKSX', name: "King's Cross St. Pancras" },
    { id: '940GZZLULVT', name: 'Liverpool Street' },
    { id: '940GZZLULNB', name: 'London Bridge' },
    { id: '940GZZLUOXC', name: 'Oxford Circus' },
    { id: '940GZZLUPAD', name: 'Paddington' },
    { id: '940GZZLUPCC', name: 'Piccadilly Circus' },
    { id: '940GZZLUSKT', name: 'South Kensington' },
    { id: '940GZZLUTMP', name: 'Temple' },
    { id: '940GZZLUTOT', name: 'Tottenham Court Road' },
    { id: '940GZZLUVIC', name: 'Victoria' },
    { id: '940GZZLUWSM', name: 'Westminster' },
    { id: '940GZZLUWLO', name: 'Waterloo' },
  ];
}

/**
 * Fetches arrival predictions for a specific station and line.
 * @param lineId - The line ID (e.g. 'northern')
 * @param stopPointId - The station stop point ID (e.g. '940GZZLUEUS')
 * @returns An array of arrival predictions.
 */
export async function getArrivals(
  lineId: string,
  stopPointId: string
): Promise<Arrival[]> {
  const response = await fetch(
    `${TFL_API_BASE}/Line/${lineId}/Arrivals/${stopPointId}`,
    {
      headers: {
        'Accept': 'application/json',
        'app_key': TFL_API_KEY
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch arrivals: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches all arrivals at a specific station using both real-time arrivals and timetable.
 * Falls back to timetable if arrivals API returns no data.
 * @param stopPointId - The station stop point ID (e.g. '940GZZLUEUS')
 * @returns An array of arrival predictions for all lines at the station.
 */
export async function getStationArrivals(
  stopPointId: string
): Promise<Arrival[]> {
  console.log(`[TfL API] Fetching arrivals for station: ${stopPointId}`);

  // First, get station info to check if this is a hub with child stations
  let stationIds: string[] = [stopPointId];

  try {
    const stationInfo = await getStationInfo(stopPointId);

    // If this is a hub with children, get arrivals from all children (except bus)
    if (stationInfo.children && Array.isArray(stationInfo.children) && stationInfo.children.length > 0) {
      console.log(`[TfL API] Station is a hub with ${stationInfo.children.length} children`);
      stationIds = stationInfo.children
        .filter((child: any) => {
          const modes = child.modes || [];
          // Include tube, overground, dlr, tram, elizabeth-line - exclude bus
          return modes.some((mode: string) => ['tube', 'overground', 'dlr', 'tram', 'elizabeth-line'].includes(mode));
        })
        .map((child: any) => child.id);
      console.log(`[TfL API] Using child station IDs for arrivals:`, stationIds);
    }
  } catch (error) {
    console.warn(`[TfL API] Failed to get station info, using original ID: ${stopPointId}`, error);
  }

  // Fetch arrivals from all station IDs
  const allArrivals: Arrival[] = [];

  for (const stationId of stationIds) {
    try {
      // Try real-time arrivals with the station ID
      const url = `${TFL_API_BASE}/StopPoint/${stationId}/Arrivals`;
      console.log(`[TfL API] Calling arrivals endpoint: ${url}`);

      const arrivalsResponse = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'app_key': TFL_API_KEY
        },
      });

      console.log(`[TfL API] Arrivals response status for ${stationId}: ${arrivalsResponse.status}`);

      if (arrivalsResponse.ok) {
        const arrivals: Arrival[] = await arrivalsResponse.json();
        console.log(`[TfL API] Received ${arrivals.length} arrivals from ${stationId}`);
        allArrivals.push(...arrivals);
      } else {
        console.warn(`[TfL API] Arrivals API returned error status for ${stationId}: ${arrivalsResponse.status}`);
      }
    } catch (error) {
      console.error(`[TfL API] Arrivals API failed for ${stationId}:`, error);
    }
  }

  if (allArrivals.length > 0) {
    console.log(`[TfL API] Returning ${allArrivals.length} total real-time arrivals`);
    return allArrivals;
  }

  console.log(`[TfL API] No real-time arrivals available, falling back to timetable`);
  // Fallback to timetable for the first station ID
  return getStationTimetable(stationIds[0] || stopPointId);
}

/**
 * Fetches timetable data for a station.
 * @param stopPointId - The station stop point ID
 * @returns An array of scheduled departures formatted as arrival objects
 */
async function getStationTimetable(stopPointId: string): Promise<Arrival[]> {
  console.log(`[TfL API] Getting station info for timetable: ${stopPointId}`);

  // Get station info to find which lines serve it
  const stationInfo = await getStationInfo(stopPointId);
  const lines = stationInfo.lines || [];

  console.log(`[TfL API] Station ${stationInfo.commonName || stationInfo.name} has ${lines.length} lines`);

  if (lines.length === 0) {
    console.warn(`[TfL API] No lines found for station ${stopPointId}`);
    return [];
  }

  const now = new Date();
  const fromTime = now.toISOString().split('.')[0]; // Remove milliseconds

  console.log(`[TfL API] Fetching timetables from time: ${fromTime}`);

  // Fetch timetable for each line and combine results
  const timetablePromises = lines.map(async (line: any) => {
    try {
      const url = `${TFL_API_BASE}/Line/${line.id}/Timetable/${stopPointId}?fromTime=${encodeURIComponent(fromTime)}`;
      console.log(`[TfL API] Fetching timetable: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log(`[TfL API] Timetable response for ${line.name}: ${response.status}`);

      if (!response.ok) {
        console.warn(`[TfL API] Timetable API failed for line ${line.id}: ${response.status}`);
        return [];
      }

      const data = await response.json();
      console.log(`[TfL API] Timetable data received for ${line.name}:`, data);

      // Parse timetable data into arrival format
      const arrivals = parseTimetableToArrivals(data, line.id, line.name, stationInfo.commonName || stationInfo.name);
      console.log(`[TfL API] Parsed ${arrivals.length} timetable entries for ${line.name}`);

      return arrivals;
    } catch (error) {
      console.error(`[TfL API] Failed to fetch timetable for line ${line.id}:`, error);
      return [];
    }
  });

  const allTimetables = await Promise.all(timetablePromises);
  const flatResults = allTimetables.flat();

  console.log(`[TfL API] Total timetable arrivals across all lines: ${flatResults.length}`);

  return flatResults;
}

/**
 * Converts timetable data to arrival format.
 * @param timetableData - Raw timetable data from TfL API
 * @param lineId - The line ID
 * @param lineName - The line name
 * @param stationName - The station name
 * @returns Array of arrivals
 */
function parseTimetableToArrivals(
  timetableData: any,
  lineId: string,
  lineName: string,
  stationName: string
): Arrival[] {
  console.log(`[TfL Parser] Parsing timetable for ${lineName}`, {
    hasTimetable: !!timetableData.timetable,
    hasRoutes: !!timetableData.timetable?.routes,
    routeCount: timetableData.timetable?.routes?.length || 0
  });

  const arrivals: Arrival[] = [];

  if (!timetableData.timetable || !timetableData.timetable.routes) {
    console.warn(`[TfL Parser] No timetable or routes found for ${lineName}`);
    return arrivals;
  }

  const now = new Date();
  console.log(`[TfL Parser] Current time: ${now.toISOString()}`);

  // Process each route
  for (const route of timetableData.timetable.routes) {
    const destination = route.name || 'Unknown';
    console.log(`[TfL Parser] Processing route to ${destination}`, {
      hasStationIntervals: !!route.stationIntervals,
      intervalCount: route.stationIntervals?.length || 0
    });

    if (!route.stationIntervals || route.stationIntervals.length === 0) {
      console.warn(`[TfL Parser] No station intervals for route to ${destination}`);
      continue;
    }

    // Find intervals for our station
    for (const interval of route.stationIntervals) {
      if (!interval.intervals) {
        console.warn(`[TfL Parser] No intervals in station interval`);
        continue;
      }

      console.log(`[TfL Parser] Processing ${interval.intervals.length} intervals for station ${interval.stopId}`);

      for (const timeInterval of interval.intervals) {
        // Check various time fields
        const departureTimeStr = timeInterval.timeToArrival || timeInterval.arrivalTime || timeInterval.departureTime;

        if (!departureTimeStr) {
          console.warn(`[TfL Parser] No time information in interval:`, timeInterval);
          continue;
        }

        // Get departure time
        const departureTime = new Date(departureTimeStr);
        const timeToStation = Math.floor((departureTime.getTime() - now.getTime()) / 1000);

        console.log(`[TfL Parser] Found departure:`, {
          destination,
          departureTime: departureTime.toISOString(),
          timeToStation,
          timeToStationMins: Math.floor(timeToStation / 60),
          withinWindow: timeToStation > 0 && timeToStation < 1800
        });

        // Only include future departures within the next 30 minutes
        if (timeToStation > 0 && timeToStation < 1800) {
          arrivals.push({
            id: `${lineId}-${interval.stopId}-${departureTime.getTime()}`,
            lineName: lineName,
            lineId: lineId,
            platformName: interval.platform || 'Platform',
            direction: route.direction || '',
            destinationName: destination,
            timeToStation: timeToStation,
            expectedArrival: departureTime.toISOString(),
            stationName: stationName,
            towards: destination,
          });
          console.log(`[TfL Parser] ✅ Added arrival to ${destination} in ${Math.floor(timeToStation / 60)} mins`);
        } else {
          console.log(`[TfL Parser] ⏭️ Skipped arrival (outside time window or in past)`);
        }
      }
    }
  }

  console.log(`[TfL Parser] Total arrivals parsed for ${lineName}: ${arrivals.length}`);
  return arrivals;
}

/**
 * Fetches disruption data for a specific station.
 * @param stopPointId - The station stop point ID (e.g. '940GZZLUEUS')
 * @returns An array of disruption objects for the station.
 */
export async function getStationDisruptions(
  stopPointId: string
): Promise<StationDisruption[]> {
  const url = `${TFL_API_BASE}/StopPoint/${stopPointId}/Disruption`;
  console.log(`[TfL API] Fetching disruptions for station: ${stopPointId} — ${url}`);

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'app_key': TFL_API_KEY,
    },
  });

  console.log(`[TfL API] Disruptions response status for ${stopPointId}: ${response.status}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch disruptions for ${stopPointId}: ${response.status}`);
  }

  const data: StationDisruption[] = await response.json();
  console.log(`[TfL API] Disruptions for ${stopPointId} (${data.length} items):`, JSON.stringify(data, null, 2));

  return data;
}

/**
 * Fetches information about a specific station including which lines serve it.
 * @param stopPointId - The station stop point ID
 * @returns Station information including lines and arrival stop point ID
 */
export async function getStationInfo(stopPointId: string): Promise<any> {
  const url = `${TFL_API_BASE}/StopPoint/${stopPointId}`;
  console.log(`[TfL API] Fetching station info: ${url}`);

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'app_key': TFL_API_KEY,
    },
  });

  console.log(`[TfL API] Station info response status: ${response.status}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch station info: ${response.status}`);
  }

  const data: any = await response.json();

  // For arrivals, we should use the stop point ID as-is
  // The stationAtcoCode in lineGroup is the same as the stop point ID for tube stations
  const arrivalStopPointId = stopPointId;

  console.log(`[TfL API] Station info for ${data.commonName || data.name}:`, {
    id: data.id,
    name: data.commonName || data.name,
    arrivalStopPointId: arrivalStopPointId,
    hubNaptanCode: data.hubNaptanCode,
    stationNaptan: data.stationNaptan,
    lineCount: data.lines?.length || 0,
    lines: data.lines?.map((l: any) => l.name) || []
  });

  // Add the arrivalStopPointId to the data object
  data.arrivalStopPointId = arrivalStopPointId;

  return data;
}
