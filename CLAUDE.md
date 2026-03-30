# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Raycast extension for viewing and managing Fly.io applications and machines. Two top-level commands (Search Apps, Search Machines) with push-to detail views. Uses Fly.io's GraphQL API for reads and the Machines REST API for lifecycle operations. Eight AI tools for Raycast AI integration. Authentication via Fly.io token stored in extension preferences, with inline onboarding flow.

## Commands

```bash
npm run dev       # Start Raycast development server
npm run build     # Build extension to dist/
npm run lint      # Run ESLint via ray CLI
npm run fix-lint  # Auto-fix lint issues
```

## Architecture

### API Layer (`src/api/`)
- **`types.ts`** — All Fly.io type definitions (Application, Machine, Volume, Secret, etc.)
- **`graphql.ts`** — GraphQL client against `api.fly.io/graphql`. Hook-based (`useApplications`, `useAppDetail`) for views, standalone async (`fetchApplications`, `fetchSecrets`) for AI tools. Also exports `isAuthenticationError()`.
- **`machines.ts`** — REST client for `api.machines.dev/v1/`. Functions: `listMachines`, `getMachine`, `startMachine`, `stopMachine`, `restartMachine`, `destroyMachine`, `listVolumes`. Uses `node-fetch`.
- **`paths.ts`** — Fly CLI binary detection: user preference → `which fly` → common paths.

### Utilities (`src/utils/`)
- **`logger.ts`** — Logger singleton via `@chrismessina/raycast-logger` with `[fly]` prefix.
- **`icons.ts`** — State-to-icon/color mappings for apps (DEPLOYED/SUSPENDED/DESTROYED) and machines (started/stopped/created/destroyed).
- **`time.ts`** — `timeAgo()` relative time formatting.
- **`cli.ts`** — `generateToken()` and `installFlyMcp()` via flyctl CLI.

### Commands (`src/`)
- **`search-apps.tsx`** — Main command, wraps `AppsList` in `WithValidToken`.
- **`search-machines.tsx`** — Wraps `MachinesList` in `WithValidToken`.

### Pages (`src/pages/`)
- **`with-valid-token.tsx`** — HOC that validates auth token, shows `SetupGuide` on failure.
- **`setup-guide.tsx`** — Inline onboarding: CLI detection → three states (authenticated, not-authenticated, not-found).
- **`lists/apps-list.tsx`** — Apps list with detail panel, org filter, all actions.
- **`lists/machines-list.tsx`** — Machines list with detail panel, app filter, lifecycle actions.
- **`details/app-detail.tsx`** — App drill-in: machines, volumes, secrets, IPs, releases.
- **`details/machine-detail.tsx`** — Machine drill-in: overview, resources, services, mounts, checks.

### AI Tools (`src/tools/`)
Read tools: `get-apps`, `get-machines`, `get-volumes`, `get-secrets`. Write tools with confirmation: `restart-machine`, `start-machine`, `stop-machine`, `destroy-machine`.

## Key Patterns

- `WithValidToken` HOC wraps all commands — validates token via lightweight GraphQL query
- Actions use `Keyboard.Shortcut.Common` mappings consistently
- Destructive actions use `Action.Style.Destructive`
- `Action.Push` for drill-in navigation between views
- AI tools: typed `Input`, default async export, `confirmation` export (async) for destructive tools
- `uniqolor` generates deterministic colors for status/region tags
- Auth token accessed via `getPreferenceValues()` — defined in `package.json` under `preferences`
