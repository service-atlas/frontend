# Service Atlas Frontend

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

Service Atlas is a Nuxt 4 application that helps you manage services and teams, and run operational reports — all in one place. It consumes a backend API (Service Atlas API) and provides a clean UI powered by Nuxt UI.

## Tech stack
- Nuxt 4 (Vue 3 + Vite)
- Nuxt UI v4 (Tailwind CSS design system)
- TypeScript
- ESLint (Nuxt config)

## Prerequisites
- Node.js 18.20+ (Node 20+ recommended)
- pnpm (the repo is configured with `packageManager: pnpm`)
- A running Service Atlas API or any API exposing the expected endpoints

## Configuration
The frontend talks to an HTTP API. Configure the base URL via `API_URL`.

- Development: requests to `/api/*` are proxied to `API_URL` to avoid CORS (see `nuxt.config.ts > nitro.devProxy`). Default is `http://localhost:8080`.
- Production: the app uses `public.apiUrl` (derived from `API_URL`). If not provided, it will still call `/api/*` assuming you terminate or rewrite paths at your edge/server.

Example `.env` (optional):
```
API_URL=http://localhost:8080
```

## Install
```bash
pnpm install
```

## Run (development)
```bash
pnpm dev
```
Open http://localhost:3000.

## Build (production)
```bash
pnpm build
```

## Preview (local production preview)
```bash
pnpm preview
```

## Scripts
- `pnpm dev` – start dev server
- `pnpm build` – build for production
- `pnpm preview` – preview the production build locally
- `pnpm lint` – run ESLint
- `pnpm typecheck` – run TypeScript type checks

## Pages and features
Top navigation exposes the main sections: Reports, Teams, and Services.

- `/services`
  - List all services with search-as-you-type
  - Create a new service (with optional type; with type suggestions from existing data)
  - Delete a service
  - Refresh list and view loading/error states

- `/service/:id`
  - View a single service’s details
  - Manage assigned teams (requires teams to be loaded)
  - Manage dependencies (add existing services as dependencies; prevent duplicates/self)
  - Manage releases (add a release with URL, version, and date; list releases)
  - View technical debt items for the service

- `/teams`
  - List teams
  - Create, rename, and delete teams

- `/reports`
  - Landing page linking to the available reports
  - `/reports/service-risk` – pick a service and compute a risk summary based on dependent services and technical debt
  - `/reports/services-by-team` – pick a team to list services owned by that team
  - `/reports/releases-in-range` – pick start/end dates to list releases in that range (with simple pagination)

## Project layout (high level)
- `app/` – application code (layouts, pages, components)
- `assets/` – global styles (Tailwind/Nuxt UI CSS entry)
- `public/` – static assets served at site root
- `nuxt.config.ts` – Nuxt configuration (modules, CSS, runtime config, dev proxy)

## Development notes
- Icons are rendered at runtime via `@nuxt/icon` and iconify icon sets (e.g., lucide, simple-icons)
- API base URL comes from `useRuntimeConfig().public.apiUrl` and falls back to `/api` in dev (proxied) and prod if not set

## Deployment
This is a standard Nuxt 4 app. Consult Nuxt’s deployment guide for your target platform:
https://nuxt.com/docs/getting-started/deployment

Ensure the backend API is reachable at the URL set in `API_URL` or that you provide an equivalent reverse proxy at `/api/*`.
