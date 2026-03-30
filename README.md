# Fly.io for Raycast

Search, view, and manage your Fly.io applications and machines directly from Raycast.

## Features

### Search Apps
Browse all your Fly.io applications with a detail panel showing state, organization, hostname, machine count, regions, volumes, IPs, certificates, autoscaling config, and current release info. Filter by organization.

### Search Machines
Browse machines across your apps with CPU/memory specs, services, and mounts. Filter by app name.

### App Detail
Drill into any app to see its machines (with lifecycle actions), volumes, secrets (names only), IP addresses, and recent releases.

### Machine Detail
Drill into any machine to see its full configuration: resources, services, mounts, and health checks.

### Machine Lifecycle
Start, stop, restart, and destroy machines from any view.

### AI Tools
8 AI tools for use with Raycast AI:
- **Get Apps** — list all apps with state, org, regions
- **Get Machines** — list machines for an app
- **Get Volumes** — list volumes for an app
- **Get Secrets** — list secret names (values never exposed)
- **Start/Stop/Restart/Destroy Machine** — lifecycle actions with confirmation

### Fly MCP Integration
Install the Fly MCP server for Claude directly from the extension. Complex operations like creating apps, deploying, and configuring networking are best handled via the Fly MCP in a full AI client.

## Setup

The extension includes **inline onboarding** that guides you through setup:

1. **If flyctl is installed and authenticated** — Generate an API token automatically and save it to preferences
2. **If flyctl is installed but not authenticated** — Guides you to run `fly auth login` in your terminal
3. **If flyctl is not found** — Offers to install via the Homebrew Raycast extension or provides the curl install script

You can also set your API token manually in extension preferences at any time using `fly tokens create`.

### Preferences

| Preference | Description |
|---|---|
| Authentication Token | Your Fly.io API token (required) |
| Fly CLI Path | Custom path to the `fly` binary (auto-detected by default) |
| Verbose Logging | Enable detailed logging for debugging |

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| View detail | Enter |
| Open in browser | Cmd+O |
| Open secondary URL | Cmd+Shift+O |
| Copy primary value | Cmd+Shift+C |
| Copy secondary value | Cmd+Shift+, |
| Refresh | Cmd+R |
| Delete/Destroy | Ctrl+X |
