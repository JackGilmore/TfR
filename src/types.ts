/**
 * Shared TypeScript types for the TFR project
 */

/**
 * TfL API Line Status response structure
 */
export interface LineStatus {
  id: string;
  name: string;
  modeName: string;
  lineStatuses: Array<{
    statusSeverity: number;
    statusSeverityDescription: string;
    reason?: string;
    disruption?: {
      categoryDescription: string;
      description: string;
    };
  }>;
}

/**
 * TfL API Arrival prediction structure
 */
export interface Arrival {
  id: string;
  lineName: string;
  lineId: string;
  platformName: string;
  direction: string;
  destinationName: string;
  timeToStation: number;
  expectedArrival: string;
  stationName: string;
  towards: string;
}

/**
 * Simplified line status for frontend
 */
export interface SimpleLineStatus {
  id: string;
  name: string;
  status: string;
  statusSeverity: number;
  reason?: string;
}

/**
 * Simplified arrival for frontend
 */
export interface SimpleArrival {
  platform: string;
  destination: string;
  timeToStation: number;
  expectedArrival: string;
}

/**
 * Grouped arrivals by line
 */
export interface StationArrivals {
  stationName: string;
  lines: {
    [lineId: string]: {
      lineName: string;
      arrivals: SimpleArrival[];
    };
  };
}
