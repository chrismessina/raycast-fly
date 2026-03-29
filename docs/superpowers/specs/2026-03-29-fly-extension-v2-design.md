# Fly.io Raycast Extension v2.0 Design

## Overview

Redesign of the Fly.io Raycast extension with inline onboarding, expanded app/machine management, AI tools, and Fly MCP integration support. Moves from a single-command extension to a multi-command, multi-tool experience modeled after the Vercast (Vercel) extension.

## File Structure

```
src/
  # Commands (manifest entries)
  search-apps.tsx
  search-machines.tsx

  # Push-to pages
  pages/
    with-valid-token.tsx        # HOC: validates token, shows setup if missing
    setup-guide.tsx             # CLI detection, install options, token generation
    lists/
      apps-list.tsx
      machines-list.tsx
    details/
      app-detail.tsx            # List view: machines, volumes, secrets, IPs, releases
      machine-detail.tsx        # List view: config, services, mounts, checks

  # AI Tools
  tools/
    get-apps.ts
    get-machines.ts
    get-volumes.ts
    get-secrets.ts
    restart-machine.ts
    start-machine.ts
    stop-machine.ts
    destroy-machine.ts

  # API layer
  api/
    graphql.ts                  # GraphQL client + queries
    machines.ts                 # Machines REST API client
    types.ts                    # All Fly.io types
    paths.ts                    # CLI binary detection

  # Utilities
  utils/
    cli.ts                      # exec flyctl commands, token generation
    icons.ts                    # State -> icon/color mappings
    time.ts                     # Relative time formatting

# Evals
ai.yaml
```

## Onboarding & Token Setup

### `with-valid-token.tsx` (HOC)

Wraps every command. On load:
1. Checks if `authToken` preference is set
2. If set, makes a lightweight GraphQL query to validate
3. If missing or invalid, renders `<SetupGuide />` instead of children

### `setup-guide.tsx` (Detail view with actions)

Detects flyctl and branches:

**CLI found + authenticated:**
- Show confirmation: "Found flyctl at [path]. Generate API token and save to preferences?"
- Action: "Generate Token" runs `fly tokens create`, saves to preferences
- Action: "Set Token Manually" opens extension preferences

**CLI found + NOT authenticated:**
- Detail markdown explaining they need to sign in once
- Action: "Copy Login Command" copies `fly auth login`
- Action: "Open Terminal" launches Terminal.app
- Action: "Set Token Manually" opens extension preferences

**CLI not found:**
- Detail markdown modeled on fly.io/docs/flyctl/install/:
  - "If you have Homebrew..." section
  - "If not, use the install script..." section
- Action: "Install via Homebrew Extension" uses `launchCommand()` to open brew extension search for "flyctl". Catches error and falls back to opening Raycast Store page for the brew extension.
- Action: "Copy Install Script" copies `curl -L https://fly.io/install.sh | sh`
- Action: "Open Install Docs" opens https://fly.io/docs/flyctl/install/
- Action: "Set Token Manually" opens extension preferences

### Binary detection (`paths.ts`)

Priority order:
1. User preference `flyBinaryPath` (if set)
2. `which fly` via `execSync`
3. Common paths: `/opt/homebrew/bin/fly`, `/usr/local/bin/fly`, `~/.fly/bin/fly`

## Preferences

```json
{
  "name": "authToken",
  "type": "password",
  "title": "Authentication Token",
  "description": "Fly.io authentication token",
  "required": true
},
{
  "name": "flyBinaryPath",
  "type": "textfield",
  "title": "Fly CLI Path",
  "description": "Custom path to the fly binary (leave empty for auto-detection)",
  "placeholder": "Auto-detect",
  "required": false
}
```

## Commands

### Search Apps (main command)

**List view with detail panel:**

- List items: app name, state icon (colored dot), org as subtitle
- Accessories: region codes, machine count, relative deploy time
- Detail panel metadata: state, org, hostname, machine count, machine size, volumes count, regions, IP count, certificates count, autoscaling config (if enabled), current release (date, status, image)
- SearchBarAccessory: filter by organization

**Actions:**
- `Action.Push` to App Detail
- Open Dashboard / Monitoring / Metrics / Logs (browser)
- Open Hostname
- Copy Hostname / IPs / Release Image
- Restart Application (destructive)
- Destroy Application (destructive)
- Install Fly MCP for Claude (runs `fly mcp add`)

### Search Machines

**List view with detail panel:**

- List items: machine ID, app name, state icon, region
- Accessories: CPU/memory spec, relative time
- Detail panel metadata: full machine config, image, volumes, services
- SearchBarAccessory: filter by app name

**Actions:**
- `Action.Push` to Machine Detail
- Start / Stop / Restart (state-aware visibility)
- Destroy (destructive)
- Open app dashboard
- Copy machine ID

### App Detail (push-to from Search Apps)

**List view with sections:**

- **Machines section:** machine items with state icon, region, ID. Actions: start/stop/restart/destroy, push to Machine Detail
- **Volumes section:** name, size (GB), region, state
- **Secrets section:** secret names only (values never exposed). Action: "Set Secret" (future)
- **IP Addresses section:** address, type (v4/v6/shared/dedicated), created date
- **Recent Releases section:** image ref, status, date

### Machine Detail (push-to from Search Machines or App Detail)

**List view with sections:**

- **Overview section:** state, machine ID, region, image ref, created date
- **Resources section:** CPU kind, CPU count, memory
- **Services section:** internal port, protocol, public ports, handlers, autostart/autostop
- **Mounts section:** volume name, path, size
- **Checks section:** name, type, interval, port (if configured)

**Actions:** Start / Stop / Restart / Destroy, Open Dashboard, Copy ID

## State Icons

Shared icon mapping (like Vercast's `StateIcon`):

| State | Icon | Color |
|-------|------|-------|
| `DEPLOYED` / `started` | Dot | Green |
| `SUSPENDED` / `stopped` / `suspended` | Dot | Yellow |
| `DESTROYED` / `destroyed` | Dot | Red |
| `created` | Dot | Blue |
| Unknown | QuestionMark | Secondary |

## AI Tools

All tools follow Vercast's pattern: typed `Input`, default async export, delegate to API functions.

### Read tools

**get-apps**
- Input: `{ orgName?: string }`
- Returns: app list with name, state, hostname, org, machine count, regions

**get-machines**
- Input: `{ appName: string }`
- Returns: machine list with ID, state, region, config summary

**get-volumes**
- Input: `{ appName: string }`
- Returns: volume list with name, size, region, state

**get-secrets**
- Input: `{ appName: string }`
- Returns: secret name list (never values)

### Write tools (with `confirmation` export)

**restart-machine**
- Input: `{ appName: string, machineId: string }`
- Confirmation: machine ID, app name, current state

**start-machine**
- Input: `{ appName: string, machineId: string }`
- Confirmation: machine ID, app name, region

**stop-machine**
- Input: `{ appName: string, machineId: string }`
- Confirmation: machine ID, app name, region

**destroy-machine**
- Input: `{ appName: string, machineId: string }`
- Confirmation: machine ID, app name, region, current state

### Evals (`ai.yaml`)

Test scenarios:
- "list my fly apps"
- "what machines are running for myapp"
- "restart the machine in iad for myapp"
- "what secrets does myapp have"
- "stop all machines for myapp"
- "show volumes for myapp"

## Fly MCP Integration

**Action: "Install Fly MCP for Claude"** available in Search Apps.
- Runs `fly mcp add` via `execSync` using detected CLI path
- Shows success/failure toast
- Requires flyctl to be installed and authenticated

Complex operations (create app, deploy, configure networking) are best handled via the Fly MCP in a full AI client. The README notes this.

## API Layer

### `api/graphql.ts`
- Extracted from current `fly.ts`
- `useGraphQL<T>(query)` hook wrapping `useFetch` with auth header
- `useApplications()` query (existing, enhanced with cert/IP type fields)
- `useAppDetail(appName)` query for drill-in views

### `api/machines.ts`
- REST client for `api.machines.dev/v1/`
- Functions: `listMachines`, `getMachine`, `startMachine`, `stopMachine`, `restartMachine`, `destroyMachine`
- All use `node-fetch` with bearer auth

### `api/types.ts`
- `Application` type (expanded from current)
- `Machine`, `Volume`, `Secret`, `IPAddress`, `Release`, `Service`, `Mount`, `Check` types

## Documentation Updates

### README.md
- Updated features list reflecting all new commands and capabilities
- Setup section updated with inline onboarding flow description
- Note about Fly MCP integration for complex operations via Claude
- Screenshots of new views

### CHANGELOG.md
- New file documenting v2.0 changes

## Out of Scope

- **Creating new apps/machines from scratch** — config is deeply nested (image, region, CPU, memory, services, mounts), doesn't fit Raycast forms well. Supported via Fly MCP in Claude.
- **Log streaming** — requires SSE/websocket, different architecture
- **Certificate management** — limited API surface, shown as count only
- **Secret values** — never exposed, by design. Only names listed.
