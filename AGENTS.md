# TFR (Transport for Rory)

## Project Overview

**Transport for Rory (TFR)** is a Cloudflare Workers project written in **TypeScript**.
It provides a lightweight dashboard showing:

- The **status** of selected London Underground lines.
- The **next train times** at specific stations for those lines.

Data is sourced in real time from the **Transport for London (TfL) Unified API**.

The goal is to create a clean, responsive, and efficient dashboard that can be deployed easily on Cloudflare’s global edge network.

---

## Repository Structure

```
.
├── public/               # Static site directory
│   ├── index.html        # Dashboard HTML entry point
│   ├── styles.css        # Dashboard styling
│   ├── scripts.js        # Optional frontend JS
│   └── assets/           # Icons, images, etc.
│
├── src/                  # Worker source code
│   ├── index.ts          # Main Worker entry point
│   ├── api/              # API route handlers and utilities
│   ├── tfl/              # TfL API integration (fetchers, parsers, types)
│   ├── utils/            # Reusable utilities and helpers
│   └── types.ts          # Shared TypeScript types
│
├── wrangler.jsonc         # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── agents.md             # Instructions for GitHub Copilot Agents
```

---

## Goals for GitHub Copilot

When assisting in this project, **GitHub Copilot** should:

1. **Generate TypeScript-first code**, following Cloudflare Workers conventions (e.g. `fetch` handler).
2. **Avoid Node.js-specific APIs** — this project runs in a Cloudflare Workers runtime.
3. **Use Fetch API** and modern web standards (`Response`, `Request`, `URL`, etc.).
4. **Handle all TfL API interactions** using clean, typed helper functions.
5. **Keep the Worker lean** — heavy logic should live in modules, not inline in `index.ts`.
6. **Optimise for readability and maintainability** — use descriptive variable names and clear separation of concerns.
7. **Ensure CORS headers** are correctly set for static site API calls.
8. **Avoid external dependencies** unless strictly necessary (prefer native APIs).

---

## TfL API Notes

- Base URL: `https://api.tfl.gov.uk/`
- Common endpoints:
  - `/Line/Mode/tube/Status`
  - `/Line/{id}/Arrivals/{stopPointId}`
- Authentication:
  - Supports app key via query parameters (`?app_id=...&app_key=...`)
- Responses are typically JSON and can be cached for short durations.

---

## Static Site Guidance

- The **public/** directory contains the dashboard frontend.
- Frontend should be static (no build tools like React/Vue unless explicitly added later).
- The dashboard fetches data from the Worker endpoints via relative URLs.
- Style should be minimal and responsive, focusing on clarity and legibility.
- Use bootstrap or simple CSS for layout if needed, but avoid heavy frameworks.
- Make the UI similar to Transport for London's own status pages for familiarity.

---

## Coding Style

- Use **ES modules** (`import`/`export`).
- Use **async/await** for asynchronous code.
- Follow **TypeScript strict mode**.
- Prefer **const** over **let** when possible.
- Use **template literals** for strings where appropriate.
- Include **JSDoc comments** for exported functions.
- Use **camelCase** for variables and functions, **PascalCase** for types and classes.

Example function template:

```ts
/**
 * Fetches the current status of specific tube lines.
 * @param lines - Array of line IDs to fetch (e.g. ['northern', 'central'])
 * @returns An array of line status objects from the TfL API.
 */
export async function getLineStatus(lines: string[]): Promise<LineStatus[]> {
  const response = await fetch(`https://api.tfl.gov.uk/Line/${lines.join(',')}/Status`);
  if (!response.ok) throw new Error(`Failed to fetch line status: ${response.status}`);
  return response.json();
}
```

---

## Future Plans (for Copilot context)

- Add live station departure boards.
- Include line icons and colours matching TfL branding.
- Add local caching (e.g. `Cache API`) to reduce API calls.
- Potentially expose a JSON API endpoint for use by other apps.

---

## Copilot Tone & Behaviour

When generating or refactoring code:
- Write **clear, modular, well-commented** TypeScript.
- Avoid framework assumptions (this is not a Node or React project).
- Suggest **lightweight and edge-compatible** solutions.
- Maintain **strict typing** throughout.
- Be concise in doc comments and function naming.
- Assume the code will be open-source.

---
