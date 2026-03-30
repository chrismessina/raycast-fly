# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Raycast extension for viewing and managing Fly.io applications. Uses Fly.io's GraphQL API for reading app data and the Machines REST API for actions like restarting machines. Authentication is via a Fly.io token stored in Raycast extension preferences.

## Commands

```bash
npm run dev       # Start Raycast development server
npm run build     # Build extension to dist/
npm run lint      # Run ESLint via ray CLI
npm run fix-lint  # Auto-fix lint issues
```

## Architecture

Two source files in `src/`:

- **`fly.ts`** — API layer. `useGraphQL()` wraps `useFetch` from `@raycast/utils` for GraphQL queries against `api.fly.io/graphql`. `restartMachine()` uses `node-fetch` for REST calls to `api.machines.dev`. Exports the `Application` type, `useApplications()` hook, `restartMachine()`, and `isAuthenticationError()`.
- **`index.tsx`** — Single Raycast command ("View Fly.io Applications"). Renders a `List` with detail panel showing app metadata (state, org, hostname, machines, regions, volumes, release info). Actions include opening dashboard/monitoring/metrics URLs, copying hostnames/IPs, and restarting machines.

## Key Patterns

- Uses `@raycast/api` components (`List`, `Detail`, `ActionPanel`, `Action`) and `@raycast/utils` hooks (`useFetch`)
- Auth token accessed via `getPreferenceValues()` — defined in `package.json` under `preferences`
- `uniqolor` generates deterministic colors from strings for status/region tags
