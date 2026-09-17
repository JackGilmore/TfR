# Transport for Rory

> [!WARNING]  
> Parts of this project are heavily ✨vibe coded✨ from when I first started playing around with GitHub Copilot. As a result, some parts of the code may be unconventional or experimental, and is definitely not up to professional standards.

Transport for Rory (TfR) is a lightweight dashboard for London public transport. It displays live line status and station arrivals using data from the TfL Unified API.

The application is a Cloudflare Worker with a static frontend. User preferences, including selected lines, configured stations, line filters, and compact mode, are stored in the browser's local storage.

## Features

- Live status for London Underground, Overground and tram lines.
- Support for Tube, Overground, Elizabeth line, DLR, and Tram services in the line selector.
- Live arrivals for configured stations.
- Station search and station-specific line filters.
- Timetable fallback when real-time arrival data is unavailable.
- Short-lived response caching for frequently requested TfL data.

## Technology

- TypeScript
- Cloudflare Workers and Wrangler
- TfL Unified API

## Requirements

- Node.js and npm
- A TfL API key (to avoid rate limiting)
- A Cloudflare account (for deployment)

## Local development

Install dependencies:

```sh
npm install
```

Create a `.env` file containing the TfL API key:

```sh
TFL_API_KEY=your_tfl_api_key
```

You can sign up for your TfL API key at [https://api-portal.tfl.gov.uk/](https://api-portal.tfl.gov.uk/).

The key is read by the Worker through the `TFL_API_KEY` environment variable. Do not commit real API keys to the repository.

Start the local Worker:

```sh
npm run dev
```

Wrangler will provide a local URL. Open that URL in a browser to use the dashboard.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local Wrangler development server. |
| `npm start` | Alias for `npm run dev`. |
| `npm run deploy` | Deploy the Worker and static assets with Wrangler. |
| `npm run cf-typegen` | Regenerate Cloudflare Worker type definitions. |

## API

The Worker exposes the following JSON endpoints:

| Endpoint | Description |
| --- | --- |
| `GET /api/status` | Return status for all Tube lines. |
| `GET /api/status?lines=northern,central` | Return status for selected lines. |
| `GET /api/lines` | Return available Tube and rail lines. |
| `GET /api/stations` | Return a list of popular stations. |
| `GET /api/stations?query=euston` | Search for stations by name. |
| `GET /api/station-info/{stopPointId}` | Return station details and the lines serving it. |
| `GET /api/arrivals/{stopPointId}` | Return arrivals for a station. |
| `GET /api/disruptions/{stopPointId}` | Return disruption information for a station. (WIP) |

Responses include cache headers tuned to the type of data being returned. Arrivals are cached for a shorter period than relatively stable data such as line and station lists.

## Project structure

```text
public/
  index.html          Dashboard markup
  scripts.js          Main dashboard behavior
  station-config.js   Station search and configuration behavior
  styles.css          Dashboard styles

src/
  index.ts            Worker entry point and API routing
  types.ts            Shared TypeScript types
  api/routes.ts       API request handlers
  tfl/client.ts       TfL API client and timetable fallback
  tfl/parser.ts       TfL response parsing
  utils/cache.ts      Cache-control helpers
  utils/cors.ts       JSON, error, and CORS response helpers

wrangler.jsonc        Cloudflare Worker and asset configuration
```

## Configuration and deployment

The Worker is configured in `wrangler.jsonc`. Static files are served from `public/`, and the configured custom domain is `tfr.jackgilmore.me`.

Set the API key as a Cloudflare Worker secret before deploying:

```sh
npx wrangler secret put TFL_API_KEY
```

Wrangler will prompt for the value. Deploy the Worker with:

```sh
npm run deploy
```

For local development, use a local `.env` file or Wrangler's local variable configuration. Keep environment files containing credentials out of version control.

## TfL API usage

The backend calls the TfL Unified API for line status, station searches, station details, arrivals, disruptions, and timetable data. The API key remains on the Worker and is not exposed to the browser. The frontend only calls the relative `/api/*` endpoints provided by this project.

When a station represents a transport hub, the Worker checks its child stop points and combines arrivals from supported rail modes. If no real-time arrivals are returned, it requests timetable data instead.
