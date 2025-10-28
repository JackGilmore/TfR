/**
 * TfL API response parsers and transformers
 */

import type {
  LineStatus,
  Arrival,
  SimpleLineStatus,
  SimpleArrival,
  StationArrivals,
} from '../types';

/**
 * Transforms TfL line status to simplified format for frontend.
 * @param lineStatuses - Array of line status objects from TfL API
 * @returns Simplified array of line statuses
 */
export function parseLineStatuses(
  lineStatuses: LineStatus[]
): SimpleLineStatus[] {
  return lineStatuses.map((line) => {
    const status = line.lineStatuses[0];
    return {
      id: line.id,
      name: line.name,
      status: status.statusSeverityDescription,
      statusSeverity: status.statusSeverity,
      reason: status.reason || status.disruption?.description,
    };
  });
}

/**
 * Transforms TfL arrivals to simplified format and groups by line.
 * @param arrivals - Array of arrival objects from TfL API
 * @returns Grouped and simplified arrivals by line
 */
export function parseStationArrivals(arrivals: Arrival[]): StationArrivals {
  if (arrivals.length === 0) {
    return { stationName: '', lines: {} };
  }

  const stationName = arrivals[0].stationName;
  const lines: StationArrivals['lines'] = {};

  // Sort arrivals by time to station
  const sortedArrivals = [...arrivals].sort(
    (a, b) => a.timeToStation - b.timeToStation
  );

  for (const arrival of sortedArrivals) {
    if (!lines[arrival.lineId]) {
      lines[arrival.lineId] = {
        lineName: arrival.lineName,
        arrivals: [],
      };
    }

    lines[arrival.lineId].arrivals.push({
      platform: arrival.platformName,
      destination: arrival.destinationName || arrival.towards,
      timeToStation: arrival.timeToStation,
      expectedArrival: arrival.expectedArrival,
    });
  }

  return { stationName, lines };
}

/**
 * Formats seconds into a human-readable time string.
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g. "2 min", "Due")
 */
export function formatTimeToStation(seconds: number): string {
  if (seconds < 30) {
    return 'Due';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes === 1) {
    return '1 min';
  }

  return `${minutes} mins`;
}
