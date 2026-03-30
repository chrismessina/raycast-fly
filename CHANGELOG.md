# Changelog

## 2.0.0

### Added
- **Search Machines** command with detail panel and lifecycle actions (start/stop/restart/destroy)
- **App Detail** view: machines, volumes, secrets, IP addresses, recent releases
- **Machine Detail** view: overview, resources, services, mounts, health checks
- **Inline onboarding**: CLI detection, Homebrew extension integration, token generation
- **AI Tools**: get-apps, get-machines, get-volumes, get-secrets, restart-machine, start-machine, stop-machine, destroy-machine
- **Fly MCP integration**: install Fly MCP for Claude action
- Organization filter for apps list
- App filter for machines list
- Structured logging with `@chrismessina/raycast-logger`
- Custom Fly CLI path preference
- Verbose logging preference
- Keyboard shortcuts using `Keyboard.Shortcut.Common` conventions

### Changed
- Renamed "View Fly.io Applications" to "Search Apps"
- Split API layer into GraphQL (`api/graphql.ts`) and REST (`api/machines.ts`) modules
- Enhanced apps list with state icons, region tags, machine counts, and deploy timestamps
- Auth errors now show onboarding guide instead of static error page

### Removed
- Single-file `fly.ts` API (replaced by `api/` modules)
- Single-file `index.tsx` command (replaced by `search-apps.tsx`)

## 1.0.0 — 2024-02-15

- Add command to list Fly.io applications
- Add actions to open common application dashboard pages
- Add actions to copy basic values from an application
- Add action to restart all application machines
