# Fly.io Raycast Extension v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Fly.io Raycast extension with multi-command navigation, inline onboarding, machine management, AI tools, and structured logging.

**Architecture:** Two top-level commands (Search Apps, Search Machines) wrapped in a token-validation HOC. Push-to detail views for apps and machines. API layer split into GraphQL (reads) and REST (machine lifecycle). AI tools delegate to the same API functions. Logger singleton drives verbose/quiet output.

**Tech Stack:** TypeScript, React (JSX), @raycast/api, @raycast/utils, node-fetch, @chrismessina/raycast-logger, uniqolor

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/api/types.ts` | All Fly.io type definitions |
| Create | `src/api/graphql.ts` | GraphQL client, `useApplications()`, `useAppDetail()` hooks |
| Create | `src/api/machines.ts` | Machines REST client (list, get, start, stop, restart, destroy) |
| Create | `src/api/paths.ts` | Fly CLI binary detection |
| Create | `src/utils/logger.ts` | Logger singleton via @chrismessina/raycast-logger |
| Create | `src/utils/icons.ts` | State-to-icon/color mappings |
| Create | `src/utils/time.ts` | Relative time formatting |
| Create | `src/utils/cli.ts` | exec flyctl commands, token generation |
| Create | `src/pages/with-valid-token.tsx` | HOC: validates token, renders setup guide if missing/invalid |
| Create | `src/pages/setup-guide.tsx` | CLI detection, install options, token generation |
| Create | `src/search-apps.tsx` | Command: Search Apps (main) |
| Create | `src/pages/lists/apps-list.tsx` | Apps list view with detail panel |
| Create | `src/pages/lists/machines-list.tsx` | Machines list view with detail panel |
| Create | `src/pages/details/app-detail.tsx` | App drill-in: machines, volumes, secrets, IPs, releases |
| Create | `src/pages/details/machine-detail.tsx` | Machine drill-in: config, services, mounts, checks |
| Create | `src/search-machines.tsx` | Command: Search Machines |
| Create | `src/tools/get-apps.ts` | AI tool: list apps |
| Create | `src/tools/get-machines.ts` | AI tool: list machines for app |
| Create | `src/tools/get-volumes.ts` | AI tool: list volumes for app |
| Create | `src/tools/get-secrets.ts` | AI tool: list secret names for app |
| Create | `src/tools/restart-machine.ts` | AI tool: restart machine (with confirmation) |
| Create | `src/tools/start-machine.ts` | AI tool: start machine (with confirmation) |
| Create | `src/tools/stop-machine.ts` | AI tool: stop machine (with confirmation) |
| Create | `src/tools/destroy-machine.ts` | AI tool: destroy machine (with confirmation) |
| Create | `ai.yaml` | AI eval scenarios |
| Modify | `package.json` | Commands, tools, preferences, ai section |
| Delete | `src/fly.ts` | Replaced by api/ modules |
| Delete | `src/index.tsx` | Replaced by search-apps.tsx |
| Modify | `README.md` | Updated features, setup, MCP section |
| Create | `CHANGELOG.md` | v2.0 changes |

---

### Task 1: Types and Logger Foundation

**Files:**
- Create: `src/api/types.ts`
- Create: `src/utils/logger.ts`

This task has no tests — these are pure type definitions and a logger singleton.

- [ ] **Step 1: Create `src/api/types.ts`**

```typescript
// Application types (from GraphQL)
export interface Application {
  id: string;
  name: string;
  state: "DEPLOYED" | "SUSPENDED" | "DESTROYED";
  hostname?: string;
  createdAt: string;
  currentRelease?: Release;
  vmSize: {
    name: string;
    memoryMb: number;
    memoryGb: number;
  };
  autoscaling?: {
    enabled: boolean;
    strategy: string;
    minCount: number;
    maxCount: number;
  };
  organization: {
    name: string;
    type?: string;
  };
  regions?: { code: string }[];
  machines?: {
    nodes: MachineSummary[];
  };
  ipAddresses?: {
    nodes: IPAddress[];
  };
  volumes?: {
    nodes: Volume[];
  };
  certificates?: {
    nodes: { hostname: string }[];
  };
}

export interface MachineSummary {
  id: string;
  state: string;
  region: string;
}

// Machine types (from REST API)
export interface Machine {
  id: string;
  name: string;
  state: string;
  region: string;
  instance_id: string;
  private_ip: string;
  config: MachineConfig;
  image_ref: {
    registry: string;
    repository: string;
    tag: string;
    digest: string;
    labels: Record<string, string> | null;
  };
  created_at: string;
  updated_at: string;
  events: MachineEvent[];
  checks?: Check[];
}

export interface MachineConfig {
  image: string;
  guest: {
    cpu_kind: string;
    cpus: number;
    memory_mb: number;
  };
  services?: Service[];
  mounts?: Mount[];
  env?: Record<string, string>;
  auto_destroy: boolean;
  restart: { policy: string };
}

export interface Service {
  internal_port: number;
  protocol: string;
  ports: {
    port: number;
    handlers: string[];
  }[];
  autostart: boolean;
  autostop: string | boolean;
}

export interface Mount {
  volume: string;
  path: string;
  size_gb?: number;
  name?: string;
}

export interface Check {
  name?: string;
  status: string;
  output?: string;
  updated_at?: string;
}

export interface MachineEvent {
  type: string;
  status: string;
  timestamp: number;
}

export interface Volume {
  id?: string;
  sizeGb: number;
  state: string;
  status: string;
  name: string;
  region: string;
}

export interface IPAddress {
  id?: string;
  type: string;
  address: string;
  createdAt?: string;
}

export interface Release {
  imageRef: string;
  createdAt: string;
  status: string;
}

export interface Secret {
  name: string;
  digest: string;
  createdAt: string;
}

// GraphQL response wrappers
export interface ApplicationsResponse {
  data: {
    apps: {
      nodes: Application[];
    };
  };
}

export interface AppDetailResponse {
  data: {
    app: Application & {
      secrets: Secret[];
    };
  };
}
```

- [ ] **Step 2: Create `src/utils/logger.ts`**

```typescript
import { createLogger } from "@chrismessina/raycast-logger";
import { getPreferenceValues } from "@raycast/api";

function isVerbose(): boolean {
  try {
    const { verboseLogging } = getPreferenceValues<{ verboseLogging?: boolean }>();
    return verboseLogging === true;
  } catch {
    return false;
  }
}

export const logger = createLogger({
  name: "fly",
  verbose: isVerbose(),
});
```

- [ ] **Step 3: Verify it compiles**

Run: `cd /Users/messina/Developer/GitHub/chrismessina/raycast-fly && npx tsc --noEmit --pretty 2>&1 | head -20`

Expected: No errors related to these two files (other files may have errors until later tasks).

- [ ] **Step 4: Commit**

```bash
git add src/api/types.ts src/utils/logger.ts
git commit -m "feat: add Fly.io type definitions and logger singleton"
```

---

### Task 2: Utility Modules (Icons, Time)

**Files:**
- Create: `src/utils/icons.ts`
- Create: `src/utils/time.ts`

- [ ] **Step 1: Create `src/utils/icons.ts`**

```typescript
import { Color, Icon } from "@raycast/api";

type StateIconResult = { source: Icon; tintColor: Color };

export function getAppStateIcon(state: string): StateIconResult {
  switch (state) {
    case "DEPLOYED":
      return { source: Icon.Dot, tintColor: Color.Green };
    case "SUSPENDED":
      return { source: Icon.Dot, tintColor: Color.Yellow };
    case "DESTROYED":
      return { source: Icon.Dot, tintColor: Color.Red };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  }
}

export function getMachineStateIcon(state: string): StateIconResult {
  switch (state) {
    case "started":
      return { source: Icon.Dot, tintColor: Color.Green };
    case "stopped":
    case "suspended":
      return { source: Icon.Dot, tintColor: Color.Yellow };
    case "destroyed":
      return { source: Icon.Dot, tintColor: Color.Red };
    case "created":
      return { source: Icon.Dot, tintColor: Color.Blue };
    default:
      return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
  }
}
```

- [ ] **Step 2: Create `src/utils/time.ts`**

```typescript
export function timeAgo(date: string | number): string {
  const now = Date.now();
  const then = typeof date === "number" ? date : new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/icons.ts src/utils/time.ts
git commit -m "feat: add state icon mappings and relative time formatting"
```

---

### Task 3: CLI Detection and Binary Paths

**Files:**
- Create: `src/api/paths.ts`
- Create: `src/utils/cli.ts`

- [ ] **Step 1: Create `src/api/paths.ts`**

```typescript
import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { logger } from "../utils/logger";

const COMMON_PATHS = [
  "/opt/homebrew/bin/fly",
  "/usr/local/bin/fly",
  `${process.env.HOME}/.fly/bin/fly`,
  "/opt/homebrew/bin/flyctl",
  "/usr/local/bin/flyctl",
  `${process.env.HOME}/.fly/bin/flyctl`,
];

export function findFlyBinary(): string | null {
  const cliLogger = logger.child("cli");

  // 1. User preference
  const { flyBinaryPath } = getPreferenceValues<{ flyBinaryPath?: string }>();
  if (flyBinaryPath && flyBinaryPath.trim()) {
    cliLogger.debug(`Using user-configured path: ${flyBinaryPath}`);
    if (existsSync(flyBinaryPath)) return flyBinaryPath;
    cliLogger.warn(`User-configured path not found: ${flyBinaryPath}`);
    return null;
  }

  // 2. which fly
  try {
    const result = execSync("which fly", { encoding: "utf-8", timeout: 5000 }).trim();
    if (result && existsSync(result)) {
      cliLogger.debug(`Found via which: ${result}`);
      return result;
    }
  } catch {
    cliLogger.debug("'which fly' failed");
  }

  // 3. Common paths
  for (const p of COMMON_PATHS) {
    if (existsSync(p)) {
      cliLogger.debug(`Found at common path: ${p}`);
      return p;
    }
  }

  cliLogger.debug("Fly CLI not found");
  return null;
}

export function isFlyAuthenticated(binaryPath: string): boolean {
  const cliLogger = logger.child("cli");
  try {
    execSync(`"${binaryPath}" auth whoami`, {
      encoding: "utf-8",
      timeout: 10000,
      env: { ...process.env, FLY_NO_UPDATE_CHECK: "1" },
    });
    cliLogger.debug("CLI is authenticated");
    return true;
  } catch {
    cliLogger.debug("CLI is not authenticated");
    return false;
  }
}
```

- [ ] **Step 2: Create `src/utils/cli.ts`**

```typescript
import { execSync } from "child_process";
import { logger } from "./logger";

export function generateToken(binaryPath: string): string {
  const cliLogger = logger.child("cli");
  cliLogger.info("Generating Fly.io API token...");

  const token = execSync(`"${binaryPath}" tokens create -x 999999h`, {
    encoding: "utf-8",
    timeout: 15000,
    env: { ...process.env, FLY_NO_UPDATE_CHECK: "1" },
  }).trim();

  cliLogger.info("Token generated successfully");
  return token;
}

export function installFlyMcp(binaryPath: string): void {
  const cliLogger = logger.child("cli");
  cliLogger.info("Installing Fly MCP for Claude...");

  execSync(`"${binaryPath}" mcp add`, {
    encoding: "utf-8",
    timeout: 30000,
    env: { ...process.env, FLY_NO_UPDATE_CHECK: "1" },
  });

  cliLogger.info("Fly MCP installed successfully");
}
```

- [ ] **Step 3: Commit**

```bash
git add src/api/paths.ts src/utils/cli.ts
git commit -m "feat: add CLI binary detection and token generation"
```

---

### Task 4: GraphQL API Layer

**Files:**
- Create: `src/api/graphql.ts`
- Delete: `src/fly.ts` (after verifying all exports are covered)

- [ ] **Step 1: Create `src/api/graphql.ts`**

```typescript
import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { logger } from "../utils/logger";
import type { Application, ApplicationsResponse, AppDetailResponse, Secret } from "./types";

const GRAPHQL_URL = "https://api.fly.io/graphql";

function useGraphQL<T>(query: string) {
  const { authToken } = getPreferenceValues<{ authToken: string }>();

  return useFetch<T>(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
}

export function useApplications() {
  const apiLogger = logger.child("api");
  apiLogger.debug("Fetching applications list");

  return useGraphQL<ApplicationsResponse>(`
    query {
      apps {
        nodes {
          id
          name
          state
          hostname
          createdAt
          vmSize {
            name
            memoryMb
            memoryGb
          }
          autoscaling {
            enabled
            strategy
            minCount
            maxCount
          }
          currentRelease {
            imageRef
            createdAt
            status
          }
          ipAddresses {
            nodes {
              address
              type
            }
          }
          machines(active: true) {
            nodes {
              id
              state
              region
            }
          }
          regions {
            code
          }
          volumes {
            nodes {
              sizeGb
              state
              status
              name
              region
            }
          }
          certificates {
            nodes {
              hostname
            }
          }
          organization {
            name
            type
          }
        }
      }
    }
  `);
}

export function useAppDetail(appName: string) {
  const apiLogger = logger.child("api");
  apiLogger.debug(`Fetching detail for app: ${appName}`);

  return useGraphQL<AppDetailResponse>(`
    query {
      app(name: "${appName}") {
        id
        name
        state
        hostname
        createdAt
        vmSize {
          name
          memoryMb
          memoryGb
        }
        autoscaling {
          enabled
          strategy
          minCount
          maxCount
        }
        currentRelease {
          imageRef
          createdAt
          status
        }
        ipAddresses {
          nodes {
            address
            type
          }
        }
        machines(active: true) {
          nodes {
            id
            state
            region
          }
        }
        regions {
          code
        }
        volumes {
          nodes {
            sizeGb
            state
            status
            name
            region
          }
        }
        certificates {
          nodes {
            hostname
          }
        }
        organization {
          name
          type
        }
        secrets {
          name
          digest
          createdAt
        }
      }
    }
  `);
}

export function isAuthenticationError(data: unknown): boolean {
  if (typeof data === "object" && data !== null && "errors" in data && Array.isArray((data as { errors: unknown[] }).errors)) {
    return (data as { errors: { extensions?: { code?: string } }[] }).errors.some(
      (error) => error?.extensions?.code === "UNAUTHORIZED"
    );
  }
  return false;
}

// Standalone fetch for AI tools (non-hook context)
export async function fetchApplications(): Promise<Application[]> {
  const { authToken } = getPreferenceValues<{ authToken: string }>();
  const apiLogger = logger.child("api");
  apiLogger.debug("Fetching applications (standalone)");

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query {
          apps {
            nodes {
              id name state hostname createdAt
              organization { name }
              machines(active: true) { nodes { id state region } }
              regions { code }
            }
          }
        }
      `,
    }),
  });

  const json = (await response.json()) as ApplicationsResponse;
  return json.data.apps.nodes;
}

export async function fetchSecrets(appName: string): Promise<Secret[]> {
  const { authToken } = getPreferenceValues<{ authToken: string }>();
  const apiLogger = logger.child("api");
  apiLogger.debug(`Fetching secrets for app: ${appName}`);

  const response = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `query { app(name: "${appName}") { secrets { name digest createdAt } } }`,
    }),
  });

  const json = (await response.json()) as AppDetailResponse;
  return json.data.app.secrets ?? [];
}
```

- [ ] **Step 2: Delete `src/fly.ts`**

Run: `rm src/fly.ts`

- [ ] **Step 3: Commit**

```bash
git add src/api/graphql.ts
git rm src/fly.ts
git commit -m "feat: add GraphQL API layer, replace fly.ts"
```

---

### Task 5: Machines REST API Layer

**Files:**
- Create: `src/api/machines.ts`

- [ ] **Step 1: Create `src/api/machines.ts`**

```typescript
import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { logger } from "../utils/logger";
import type { Machine, Volume } from "./types";

const MACHINES_API = "https://api.machines.dev/v1";

function headers(): Record<string, string> {
  const { authToken } = getPreferenceValues<{ authToken: string }>();
  return {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };
}

async function machinesRequest<T>(path: string, method = "GET"): Promise<T> {
  const apiLogger = logger.child("api");
  apiLogger.debug(`${method} ${path}`);

  const response = await fetch(`${MACHINES_API}${path}`, {
    method,
    headers: headers(),
  });

  if (!response.ok) {
    const text = await response.text();
    apiLogger.error(`API error ${response.status}: ${text}`);
    throw new Error(`Machines API error: ${response.status} ${response.statusText}`);
  }

  if (response.status === 200 && method === "GET") {
    return (await response.json()) as T;
  }

  return undefined as T;
}

export async function listMachines(appName: string): Promise<Machine[]> {
  return machinesRequest<Machine[]>(`/apps/${appName}/machines`);
}

export async function getMachine(appName: string, machineId: string): Promise<Machine> {
  return machinesRequest<Machine>(`/apps/${appName}/machines/${machineId}`);
}

export async function startMachine(appName: string, machineId: string): Promise<void> {
  await machinesRequest<void>(`/apps/${appName}/machines/${machineId}/start`, "POST");
  logger.info(`Machine ${machineId} started`);
}

export async function stopMachine(appName: string, machineId: string): Promise<void> {
  await machinesRequest<void>(`/apps/${appName}/machines/${machineId}/stop`, "POST");
  logger.info(`Machine ${machineId} stopped`);
}

export async function restartMachine(appName: string, machineId: string): Promise<void> {
  await machinesRequest<void>(`/apps/${appName}/machines/${machineId}/restart`, "POST");
  logger.info(`Machine ${machineId} restarted`);
}

export async function destroyMachine(appName: string, machineId: string, force = false): Promise<void> {
  const query = force ? "?force=true" : "";
  await machinesRequest<void>(`/apps/${appName}/machines/${machineId}${query}`, "DELETE");
  logger.info(`Machine ${machineId} destroyed`);
}

export async function listVolumes(appName: string): Promise<Volume[]> {
  const { authToken } = getPreferenceValues<{ authToken: string }>();
  const response = await fetch(`${MACHINES_API}/apps/${appName}/volumes`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!response.ok) throw new Error(`Failed to list volumes: ${response.status}`);
  return (await response.json()) as Volume[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/api/machines.ts
git commit -m "feat: add Machines REST API client"
```

---

### Task 6: Onboarding — Setup Guide and Token Validation HOC

**Files:**
- Create: `src/pages/setup-guide.tsx`
- Create: `src/pages/with-valid-token.tsx`

- [ ] **Step 1: Create `src/pages/setup-guide.tsx`**

```tsx
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { findFlyBinary, isFlyAuthenticated } from "../api/paths";
import { generateToken } from "../utils/cli";
import { logger } from "../utils/logger";

type CliState = "not-found" | "not-authenticated" | "authenticated";

function detectCliState(): { state: CliState; binaryPath: string | null } {
  const binaryPath = findFlyBinary();
  if (!binaryPath) return { state: "not-found", binaryPath: null };
  if (!isFlyAuthenticated(binaryPath)) return { state: "not-authenticated", binaryPath };
  return { state: "authenticated", binaryPath };
}

export function SetupGuide() {
  const { state, binaryPath } = detectCliState();
  logger.step(`Setup guide: CLI state is "${state}"`);

  if (state === "authenticated" && binaryPath) {
    return <AuthenticatedGuide binaryPath={binaryPath} />;
  }

  if (state === "not-authenticated" && binaryPath) {
    return <NotAuthenticatedGuide />;
  }

  return <NotFoundGuide />;
}

function AuthenticatedGuide({ binaryPath }: { binaryPath: string }) {
  const markdown = `# Fly.io Setup

Found \`flyctl\` at \`${binaryPath}\` and it's authenticated.

**Generate an API token** to connect this extension to your Fly.io account, or set one manually in preferences.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Generate Token"
            icon={Icon.Key}
            onAction={async () => {
              try {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Generating token..." });
                const token = generateToken(binaryPath);
                // Token is saved — user needs to paste it into preferences
                await showToast({
                  style: Toast.Style.Success,
                  title: "Token generated",
                  message: "Copied to clipboard. Paste into extension preferences.",
                });
                // Copy token to clipboard for the user to paste
                const { Clipboard } = await import("@raycast/api");
                await Clipboard.copy(token);
                openExtensionPreferences();
              } catch (error) {
                logger.error("Token generation failed", error);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to generate token",
                  message: error instanceof Error ? error.message : "Unknown error",
                });
              }
            }}
          />
          <Action title="Set Token Manually" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function NotAuthenticatedGuide() {
  const markdown = `# Fly.io Setup

Found \`flyctl\` but it's **not authenticated**. You need to sign in once via the terminal.

1. Open your terminal
2. Run \`fly auth login\`
3. Complete the sign-in in your browser
4. Come back here and try again`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Login Command" content="fly auth login" icon={Icon.Terminal} />
          <Action.Open title="Open Terminal" target="/System/Applications/Utilities/Terminal.app" icon={Icon.Terminal} />
          <Action title="Set Token Manually" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function NotFoundGuide() {
  const markdown = `# Fly.io Setup

The \`flyctl\` CLI was not found on your system. You need it to authenticate with Fly.io.

## Install via Homebrew

If you have Homebrew installed, run:
\`\`\`
brew install flyctl
\`\`\`

Or use the Homebrew Raycast extension to install it.

## Install via Script

If you don't have Homebrew:
\`\`\`
curl -L https://fly.io/install.sh | sh
\`\`\`

## Already have a token?

If you already have a Fly.io API token, you can set it directly in extension preferences.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Install via Homebrew Extension"
            icon={Icon.Download}
            onAction={async () => {
              try {
                await launchCommand({
                  ownerOrAuthorName: "nhojb",
                  extensionName: "brew",
                  name: "search",
                  type: LaunchType.UserInitiated,
                  context: { query: "flyctl" },
                });
              } catch {
                // Homebrew extension not installed — open its store page
                const { open } = await import("@raycast/api");
                await open("https://www.raycast.com/nhojb/brew");
              }
            }}
          />
          <Action.CopyToClipboard
            title="Copy Install Script"
            content="curl -L https://fly.io/install.sh | sh"
            icon={Icon.Terminal}
          />
          <Action.OpenInBrowser title="Open Install Docs" url="https://fly.io/docs/flyctl/install/" icon={Icon.Globe} />
          <Action title="Set Token Manually" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 2: Create `src/pages/with-valid-token.tsx`**

```tsx
import { List } from "@raycast/api";
import { useApplications, isAuthenticationError } from "../api/graphql";
import { SetupGuide } from "./setup-guide";
import { logger } from "../utils/logger";

interface Props {
  children: (args: { isLoading: boolean }) => React.ReactNode;
}

export function WithValidToken({ children }: Props) {
  const { data, isLoading } = useApplications();

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (isAuthenticationError(data)) {
    logger.warn("Authentication failed, showing setup guide");
    return <SetupGuide />;
  }

  return <>{children({ isLoading })}</>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/setup-guide.tsx src/pages/with-valid-token.tsx
git commit -m "feat: add onboarding flow with CLI detection and token validation HOC"
```

---

### Task 7: Apps List View

**Files:**
- Create: `src/pages/lists/apps-list.tsx`

- [ ] **Step 1: Create `src/pages/lists/apps-list.tsx`**

```tsx
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import uniqolor from "uniqolor";
import { useApplications } from "../../api/graphql";
import { restartMachine } from "../../api/machines";
import type { Application } from "../../api/types";
import { getAppStateIcon } from "../../utils/icons";
import { timeAgo } from "../../utils/time";
import { logger } from "../../utils/logger";
import { AppDetail } from "../details/app-detail";
import { findFlyBinary } from "../../api/paths";
import { installFlyMcp } from "../../utils/cli";

interface Props {
  isLoading: boolean;
}

export function AppsList({ isLoading: parentLoading }: Props) {
  const { data, isLoading, revalidate } = useApplications();
  const apps = data?.data?.apps?.nodes ?? [];
  const loading = parentLoading || isLoading;

  // Build org list for filter
  const orgs = [...new Set(apps.map((a) => a.organization.name))];

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchBarAccessory={
        orgs.length > 1 ? (
          <List.Dropdown tooltip="Filter by Organization" onChange={() => {}}>
            <List.Dropdown.Item title="All Organizations" value="" />
            {orgs.map((org) => (
              <List.Dropdown.Item key={org} title={org} value={org} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.Section title="Applications">
        {apps.map((app) => (
          <AppListItem key={app.name} app={app} revalidate={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}

function AppListItem({ app, revalidate }: { app: Application; revalidate: () => void }) {
  const icon = getAppStateIcon(app.state);
  const machineCount = app.machines?.nodes?.length ?? 0;
  const regions = app.regions?.map((r) => r.code).join(", ") ?? "";

  return (
    <List.Item
      title={app.name}
      subtitle={app.organization.name}
      icon={icon}
      accessories={[
        ...(regions ? [{ text: regions }] : []),
        { text: `${machineCount} machines` },
        ...(app.currentRelease ? [{ text: timeAgo(app.currentRelease.createdAt), tooltip: "Last deployed" }] : []),
      ]}
      detail={<AppListDetail app={app} />}
      actions={<AppListActions app={app} revalidate={revalidate} />}
    />
  );
}

function AppListDetail({ app }: { app: Application }) {
  const isMb = app.vmSize.memoryGb < 1;
  const hostname = app.hostname ? `https://${app.hostname}` : undefined;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="State">
            <List.Item.Detail.Metadata.TagList.Item text={app.state.toLowerCase()} color={uniqolor(app.state).color} />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Label title="Organization" text={app.organization.name} />

          {hostname && <List.Item.Detail.Metadata.Link title="Hostname" text={hostname} target={hostname} />}

          <List.Item.Detail.Metadata.Label title="Machine Count" text={String(app.machines?.nodes?.length ?? 0)} />

          <List.Item.Detail.Metadata.Label
            title="Machine Size"
            text={`${app.vmSize.name}@${isMb ? app.vmSize.memoryMb + "MB" : app.vmSize.memoryGb + "GB"}`}
          />

          <List.Item.Detail.Metadata.Label title="Volumes" text={String(app.volumes?.nodes?.length ?? 0)} />

          {app.regions ? (
            <List.Item.Detail.Metadata.TagList title="Regions">
              {app.regions.map((region) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={region.code}
                  text={region.code}
                  color={uniqolor(region.code, { lightness: [70, 100] }).color}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}

          <List.Item.Detail.Metadata.Label title="Public IPs" text={String(app.ipAddresses?.nodes?.length ?? 0)} />
          <List.Item.Detail.Metadata.Label
            title="Certificates"
            text={String(app.certificates?.nodes?.length ?? 0)}
          />

          {app.autoscaling?.enabled ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Autoscaling" />
              <List.Item.Detail.Metadata.Label title="Strategy" text={app.autoscaling.strategy} />
              <List.Item.Detail.Metadata.Label
                title="Range"
                text={`${app.autoscaling.minCount} - ${app.autoscaling.maxCount}`}
              />
            </>
          ) : null}

          {app.currentRelease ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Current Release" />
              <List.Item.Detail.Metadata.Label
                title="Date"
                text={app.currentRelease.createdAt.replace("T", " ").replace("Z", " UTC")}
              />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={app.currentRelease.status}
                  color={uniqolor(app.currentRelease.status, { lightness: [70, 100] }).color}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Image" text={app.currentRelease.imageRef} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function AppListActions({ app, revalidate }: { app: Application; revalidate: () => void }) {
  const ips = app.ipAddresses?.nodes?.map((ip) => ip.address) ?? [];

  return (
    <ActionPanel title={app.name}>
      <Action.Push title="View App Details" icon={Icon.Eye} target={<AppDetail appName={app.name} />} />

      <Action.OpenInBrowser
        title="Open Dashboard"
        url={`https://fly.io/apps/${app.name}`}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.OpenInBrowser
        title="Open Monitoring"
        url={`https://fly.io/apps/${app.name}/monitoring`}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />

      {app.hostname ? (
        <Action.OpenInBrowser title="Open Hostname" url={`https://${app.hostname}`} />
      ) : null}
      {app.hostname ? (
        <Action.CopyToClipboard
          title="Copy Hostname"
          content={app.hostname}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      ) : null}

      {ips.length === 1 ? (
        <Action.CopyToClipboard
          title="Copy IP"
          content={ips[0]}
          shortcut={Keyboard.Shortcut.Common.CopyPath}
        />
      ) : null}

      {app.currentRelease ? (
        <Action.CopyToClipboard title="Copy Release Image" content={app.currentRelease.imageRef} />
      ) : null}

      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />

      {app.state === "DEPLOYED" && (app.machines?.nodes?.length ?? 0) > 0 ? (
        <Action
          title="Restart Application"
          icon={Icon.RotateClockwise}
          style={Action.Style.Destructive}
          onAction={async () => {
            const machines = app.machines?.nodes ?? [];
            const toast = await showToast({
              title: app.name,
              message: "Preparing to restart...",
              style: Toast.Style.Animated,
            });
            try {
              for (let i = 0; i < machines.length; i++) {
                toast.message = `Restarting machine ${i + 1}/${machines.length}`;
                await restartMachine(app.name, machines[i].id);
              }
              toast.message = "All machines restarted";
              toast.style = Toast.Style.Success;
              revalidate();
            } catch (error) {
              logger.error("Restart failed", error);
              toast.message = "Failed to restart a machine";
              toast.style = Toast.Style.Failure;
            }
          }}
        />
      ) : null}

      <Action
        title="Install Fly MCP for Claude"
        icon={Icon.Plug}
        onAction={async () => {
          const binaryPath = findFlyBinary();
          if (!binaryPath) {
            await showToast({
              style: Toast.Style.Failure,
              title: "flyctl not found",
              message: "Install the Fly CLI first",
            });
            return;
          }
          try {
            installFlyMcp(binaryPath);
            await showToast({ style: Toast.Style.Success, title: "Fly MCP installed for Claude" });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to install MCP",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }}
      />
    </ActionPanel>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/lists/apps-list.tsx
git commit -m "feat: add apps list view with detail panel and actions"
```

---

### Task 8: App Detail View (Push-to)

**Files:**
- Create: `src/pages/details/app-detail.tsx`

- [ ] **Step 1: Create `src/pages/details/app-detail.tsx`**

```tsx
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useAppDetail } from "../../api/graphql";
import { restartMachine, startMachine, stopMachine, destroyMachine } from "../../api/machines";
import type { Application, IPAddress, MachineSummary, Release, Secret, Volume } from "../../api/types";
import { getMachineStateIcon, getAppStateIcon } from "../../utils/icons";
import { timeAgo } from "../../utils/time";
import { logger } from "../../utils/logger";
import { MachineDetail } from "./machine-detail";

export function AppDetail({ appName }: { appName: string }) {
  const { data, isLoading, revalidate } = useAppDetail(appName);
  const app = data?.data?.app;

  return (
    <List isLoading={isLoading} navigationTitle={appName}>
      {app ? (
        <>
          <List.Section title="Machines">
            {app.machines?.nodes?.map((machine) => (
              <MachineItem key={machine.id} machine={machine} appName={appName} revalidate={revalidate} />
            ))}
            {(!app.machines?.nodes || app.machines.nodes.length === 0) && (
              <List.Item title="No machines" icon={Icon.Minus} />
            )}
          </List.Section>

          <List.Section title="Volumes">
            {app.volumes?.nodes?.map((vol, i) => (
              <List.Item
                key={`vol-${i}`}
                title={vol.name}
                accessories={[
                  { text: `${vol.sizeGb} GB` },
                  { text: vol.region },
                  { text: vol.state },
                ]}
                icon={Icon.HardDrive}
              />
            ))}
            {(!app.volumes?.nodes || app.volumes.nodes.length === 0) && (
              <List.Item title="No volumes" icon={Icon.Minus} />
            )}
          </List.Section>

          <List.Section title="Secrets">
            {(app as Application & { secrets?: Secret[] }).secrets?.map((secret) => (
              <List.Item
                key={secret.name}
                title={secret.name}
                accessories={[{ text: timeAgo(secret.createdAt) }]}
                icon={Icon.Lock}
              />
            ))}
          </List.Section>

          <List.Section title="IP Addresses">
            {app.ipAddresses?.nodes?.map((ip, i) => (
              <List.Item
                key={`ip-${i}`}
                title={ip.address}
                accessories={[{ text: ip.type }]}
                icon={Icon.Globe}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy IP Address" content={ip.address} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section title="Recent Releases">
            {app.currentRelease ? (
              <List.Item
                title={app.currentRelease.imageRef}
                accessories={[
                  { text: app.currentRelease.status },
                  { text: timeAgo(app.currentRelease.createdAt) },
                ]}
                icon={Icon.Box}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Image Ref" content={app.currentRelease.imageRef} />
                  </ActionPanel>
                }
              />
            ) : (
              <List.Item title="No releases" icon={Icon.Minus} />
            )}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

function MachineItem({
  machine,
  appName,
  revalidate,
}: {
  machine: MachineSummary;
  appName: string;
  revalidate: () => void;
}) {
  const icon = getMachineStateIcon(machine.state);

  return (
    <List.Item
      title={machine.id}
      subtitle={machine.region}
      icon={icon}
      accessories={[{ text: machine.state }]}
      actions={
        <ActionPanel title={machine.id}>
          <Action.Push
            title="View Machine Details"
            icon={Icon.Eye}
            target={<MachineDetail appName={appName} machineId={machine.id} />}
          />

          {machine.state === "stopped" && (
            <Action
              title="Start Machine"
              icon={Icon.Play}
              onAction={async () => {
                try {
                  await startMachine(appName, machine.id);
                  await showToast({ style: Toast.Style.Success, title: "Machine started" });
                  revalidate();
                } catch (error) {
                  logger.error("Start failed", error);
                  await showToast({ style: Toast.Style.Failure, title: "Failed to start machine" });
                }
              }}
            />
          )}

          {machine.state === "started" && (
            <Action
              title="Stop Machine"
              icon={Icon.Stop}
              onAction={async () => {
                try {
                  await stopMachine(appName, machine.id);
                  await showToast({ style: Toast.Style.Success, title: "Machine stopped" });
                  revalidate();
                } catch (error) {
                  logger.error("Stop failed", error);
                  await showToast({ style: Toast.Style.Failure, title: "Failed to stop machine" });
                }
              }}
            />
          )}

          {machine.state === "started" && (
            <Action
              title="Restart Machine"
              icon={Icon.RotateClockwise}
              onAction={async () => {
                try {
                  await restartMachine(appName, machine.id);
                  await showToast({ style: Toast.Style.Success, title: "Machine restarted" });
                  revalidate();
                } catch (error) {
                  logger.error("Restart failed", error);
                  await showToast({ style: Toast.Style.Failure, title: "Failed to restart machine" });
                }
              }}
            />
          )}

          <Action
            title="Destroy Machine"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              try {
                await destroyMachine(appName, machine.id, true);
                await showToast({ style: Toast.Style.Success, title: "Machine destroyed" });
                revalidate();
              } catch (error) {
                logger.error("Destroy failed", error);
                await showToast({ style: Toast.Style.Failure, title: "Failed to destroy machine" });
              }
            }}
          />

          <Action.OpenInBrowser
            title="Open Dashboard"
            url={`https://fly.io/apps/${appName}`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />

          <Action.CopyToClipboard
            title="Copy Machine ID"
            content={machine.id}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />

          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/details/app-detail.tsx
git commit -m "feat: add app detail view with machines, volumes, secrets, IPs, releases"
```

---

### Task 9: Machine Detail View (Push-to)

**Files:**
- Create: `src/pages/details/machine-detail.tsx`

- [ ] **Step 1: Create `src/pages/details/machine-detail.tsx`**

```tsx
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getMachine,
  startMachine,
  stopMachine,
  restartMachine,
  destroyMachine,
} from "../../api/machines";
import type { Machine } from "../../api/types";
import { getMachineStateIcon } from "../../utils/icons";
import { timeAgo } from "../../utils/time";
import { logger } from "../../utils/logger";

export function MachineDetail({ appName, machineId }: { appName: string; machineId: string }) {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadMachine() {
    setIsLoading(true);
    try {
      const m = await getMachine(appName, machineId);
      setMachine(m);
    } catch (error) {
      logger.error("Failed to load machine", error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load machine details" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMachine();
  }, [appName, machineId]);

  const icon = machine ? getMachineStateIcon(machine.state) : undefined;

  return (
    <List isLoading={isLoading} navigationTitle={machineId}>
      {machine ? (
        <>
          <List.Section title="Overview">
            <List.Item
              title="State"
              icon={icon}
              accessories={[{ text: machine.state }]}
              actions={<MachineActions appName={appName} machine={machine} reload={loadMachine} />}
            />
            <List.Item title="Machine ID" accessories={[{ text: machine.id }]} icon={Icon.Fingerprint} />
            <List.Item title="Region" accessories={[{ text: machine.region }]} icon={Icon.Globe} />
            <List.Item
              title="Image"
              accessories={[{ text: machine.config.image }]}
              icon={Icon.Box}
            />
            <List.Item
              title="Created"
              accessories={[{ text: timeAgo(machine.created_at) }]}
              icon={Icon.Calendar}
            />
          </List.Section>

          <List.Section title="Resources">
            <List.Item
              title="CPU"
              accessories={[
                { text: `${machine.config.guest.cpu_kind} x${machine.config.guest.cpus}` },
              ]}
              icon={Icon.ComputerChip}
            />
            <List.Item
              title="Memory"
              accessories={[{ text: `${machine.config.guest.memory_mb} MB` }]}
              icon={Icon.MemoryChip}
            />
          </List.Section>

          {machine.config.services && machine.config.services.length > 0 ? (
            <List.Section title="Services">
              {machine.config.services.map((svc, i) => (
                <List.Item
                  key={`svc-${i}`}
                  title={`Port ${svc.internal_port}`}
                  subtitle={svc.protocol}
                  accessories={[
                    {
                      text: svc.ports.map((p) => `${p.port} (${p.handlers.join(", ")})`).join(", "),
                    },
                    ...(svc.autostart ? [{ text: "autostart" }] : []),
                    ...(svc.autostop ? [{ text: `autostop: ${svc.autostop}` }] : []),
                  ]}
                  icon={Icon.Network}
                />
              ))}
            </List.Section>
          ) : null}

          {machine.config.mounts && machine.config.mounts.length > 0 ? (
            <List.Section title="Mounts">
              {machine.config.mounts.map((mount, i) => (
                <List.Item
                  key={`mount-${i}`}
                  title={mount.volume || mount.name || "Volume"}
                  subtitle={mount.path}
                  accessories={mount.size_gb ? [{ text: `${mount.size_gb} GB` }] : []}
                  icon={Icon.HardDrive}
                />
              ))}
            </List.Section>
          ) : null}

          {machine.checks && machine.checks.length > 0 ? (
            <List.Section title="Checks">
              {machine.checks.map((check, i) => (
                <List.Item
                  key={`check-${i}`}
                  title={check.name || `Check ${i + 1}`}
                  accessories={[{ text: check.status }]}
                  icon={check.status === "passing" ? Icon.CheckCircle : Icon.XMarkCircle}
                />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : null}
    </List>
  );
}

function MachineActions({
  appName,
  machine,
  reload,
}: {
  appName: string;
  machine: Machine;
  reload: () => void;
}) {
  return (
    <ActionPanel title={machine.id}>
      {machine.state === "stopped" && (
        <Action
          title="Start Machine"
          icon={Icon.Play}
          onAction={async () => {
            try {
              await startMachine(appName, machine.id);
              await showToast({ style: Toast.Style.Success, title: "Machine started" });
              reload();
            } catch (error) {
              logger.error("Start failed", error);
              await showToast({ style: Toast.Style.Failure, title: "Failed to start" });
            }
          }}
        />
      )}
      {machine.state === "started" && (
        <Action
          title="Stop Machine"
          icon={Icon.Stop}
          onAction={async () => {
            try {
              await stopMachine(appName, machine.id);
              await showToast({ style: Toast.Style.Success, title: "Machine stopped" });
              reload();
            } catch (error) {
              logger.error("Stop failed", error);
              await showToast({ style: Toast.Style.Failure, title: "Failed to stop" });
            }
          }}
        />
      )}
      {machine.state === "started" && (
        <Action
          title="Restart Machine"
          icon={Icon.RotateClockwise}
          onAction={async () => {
            try {
              await restartMachine(appName, machine.id);
              await showToast({ style: Toast.Style.Success, title: "Machine restarted" });
              reload();
            } catch (error) {
              logger.error("Restart failed", error);
              await showToast({ style: Toast.Style.Failure, title: "Failed to restart" });
            }
          }}
        />
      )}
      <Action
        title="Destroy Machine"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.Remove}
        onAction={async () => {
          try {
            await destroyMachine(appName, machine.id, true);
            await showToast({ style: Toast.Style.Success, title: "Machine destroyed" });
          } catch (error) {
            logger.error("Destroy failed", error);
            await showToast({ style: Toast.Style.Failure, title: "Failed to destroy" });
          }
        }}
      />
      <Action.OpenInBrowser
        title="Open Dashboard"
        url={`https://fly.io/apps/${appName}`}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.CopyToClipboard
        title="Copy Machine ID"
        content={machine.id}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={reload}
      />
    </ActionPanel>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/details/machine-detail.tsx
git commit -m "feat: add machine detail view with resources, services, mounts, checks"
```

---

### Task 10: Machines List View

**Files:**
- Create: `src/pages/lists/machines-list.tsx`

- [ ] **Step 1: Create `src/pages/lists/machines-list.tsx`**

```tsx
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useApplications } from "../../api/graphql";
import { listMachines, startMachine, stopMachine, restartMachine, destroyMachine } from "../../api/machines";
import type { Application, Machine } from "../../api/types";
import { getMachineStateIcon } from "../../utils/icons";
import { timeAgo } from "../../utils/time";
import { logger } from "../../utils/logger";
import { MachineDetail } from "../details/machine-detail";

interface Props {
  isLoading: boolean;
}

export function MachinesList({ isLoading: parentLoading }: Props) {
  const { data, isLoading: appsLoading } = useApplications();
  const apps = data?.data?.apps?.nodes ?? [];
  const appNames = apps.map((a) => a.name);

  const [selectedApp, setSelectedApp] = useState<string>("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);

  async function loadMachines(appName: string) {
    if (!appName) {
      setMachines([]);
      return;
    }
    setMachinesLoading(true);
    try {
      const result = await listMachines(appName);
      setMachines(result);
    } catch (error) {
      logger.error("Failed to load machines", error);
      setMachines([]);
    } finally {
      setMachinesLoading(false);
    }
  }

  useEffect(() => {
    if (selectedApp) {
      loadMachines(selectedApp);
    } else if (appNames.length > 0 && !selectedApp) {
      // Auto-select first app
      setSelectedApp(appNames[0]);
    }
  }, [selectedApp, appNames.length]);

  const loading = parentLoading || appsLoading || machinesLoading;

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by App" value={selectedApp} onChange={setSelectedApp}>
          {appNames.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={`Machines${selectedApp ? ` — ${selectedApp}` : ""}`}>
        {machines.map((machine) => (
          <MachineListItem
            key={machine.id}
            machine={machine}
            appName={selectedApp}
            reload={() => loadMachines(selectedApp)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function MachineListItem({
  machine,
  appName,
  reload,
}: {
  machine: Machine;
  appName: string;
  reload: () => void;
}) {
  const icon = getMachineStateIcon(machine.state);
  const cpuSpec = `${machine.config.guest.cpu_kind} x${machine.config.guest.cpus}`;
  const memSpec = `${machine.config.guest.memory_mb}MB`;

  return (
    <List.Item
      title={machine.id}
      subtitle={machine.region}
      icon={icon}
      accessories={[
        { text: `${cpuSpec} / ${memSpec}` },
        { text: timeAgo(machine.updated_at) },
      ]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="State" text={machine.state} icon={icon} />
              <List.Item.Detail.Metadata.Label title="Region" text={machine.region} />
              <List.Item.Detail.Metadata.Label title="Image" text={machine.config.image} />
              <List.Item.Detail.Metadata.Label title="CPU" text={cpuSpec} />
              <List.Item.Detail.Metadata.Label title="Memory" text={memSpec} />
              <List.Item.Detail.Metadata.Label title="Created" text={timeAgo(machine.created_at)} />
              {machine.config.services?.map((svc, i) => (
                <List.Item.Detail.Metadata.Label
                  key={`svc-${i}`}
                  title={`Service ${svc.internal_port}`}
                  text={`${svc.protocol} → ${svc.ports.map((p) => p.port).join(", ")}`}
                />
              ))}
              {machine.config.mounts?.map((mount, i) => (
                <List.Item.Detail.Metadata.Label
                  key={`mount-${i}`}
                  title="Mount"
                  text={`${mount.volume || mount.name} → ${mount.path}`}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={machine.id}>
          <Action.Push
            title="View Machine Details"
            icon={Icon.Eye}
            target={<MachineDetail appName={appName} machineId={machine.id} />}
          />

          {machine.state === "stopped" && (
            <Action
              title="Start Machine"
              icon={Icon.Play}
              onAction={async () => {
                try {
                  await startMachine(appName, machine.id);
                  await showToast({ style: Toast.Style.Success, title: "Machine started" });
                  reload();
                } catch (error) {
                  logger.error("Start failed", error);
                  await showToast({ style: Toast.Style.Failure, title: "Failed to start" });
                }
              }}
            />
          )}
          {machine.state === "started" && (
            <Action
              title="Stop Machine"
              icon={Icon.Stop}
              onAction={async () => {
                try {
                  await stopMachine(appName, machine.id);
                  await showToast({ style: Toast.Style.Success, title: "Machine stopped" });
                  reload();
                } catch (error) {
                  logger.error("Stop failed", error);
                  await showToast({ style: Toast.Style.Failure, title: "Failed to stop" });
                }
              }}
            />
          )}
          {machine.state === "started" && (
            <Action
              title="Restart Machine"
              icon={Icon.RotateClockwise}
              onAction={async () => {
                try {
                  await restartMachine(appName, machine.id);
                  await showToast({ style: Toast.Style.Success, title: "Machine restarted" });
                  reload();
                } catch (error) {
                  logger.error("Restart failed", error);
                  await showToast({ style: Toast.Style.Failure, title: "Failed to restart" });
                }
              }}
            />
          )}

          <Action
            title="Destroy Machine"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              try {
                await destroyMachine(appName, machine.id, true);
                await showToast({ style: Toast.Style.Success, title: "Machine destroyed" });
                reload();
              } catch (error) {
                logger.error("Destroy failed", error);
                await showToast({ style: Toast.Style.Failure, title: "Failed to destroy" });
              }
            }}
          />

          <Action.OpenInBrowser
            title="Open Dashboard"
            url={`https://fly.io/apps/${appName}`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Machine ID"
            content={machine.id}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={reload}
          />
        </ActionPanel>
      }
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/lists/machines-list.tsx
git commit -m "feat: add machines list view with detail panel and lifecycle actions"
```

---

### Task 11: Top-Level Commands

**Files:**
- Create: `src/search-apps.tsx`
- Create: `src/search-machines.tsx`
- Delete: `src/index.tsx`

- [ ] **Step 1: Create `src/search-apps.tsx`**

```tsx
import { WithValidToken } from "./pages/with-valid-token";
import { AppsList } from "./pages/lists/apps-list";

export default function SearchApps() {
  return (
    <WithValidToken>
      {({ isLoading }) => <AppsList isLoading={isLoading} />}
    </WithValidToken>
  );
}
```

- [ ] **Step 2: Create `src/search-machines.tsx`**

```tsx
import { WithValidToken } from "./pages/with-valid-token";
import { MachinesList } from "./pages/lists/machines-list";

export default function SearchMachines() {
  return (
    <WithValidToken>
      {({ isLoading }) => <MachinesList isLoading={isLoading} />}
    </WithValidToken>
  );
}
```

- [ ] **Step 3: Delete `src/index.tsx`**

Run: `rm src/index.tsx`

- [ ] **Step 4: Commit**

```bash
git add src/search-apps.tsx src/search-machines.tsx
git rm src/index.tsx
git commit -m "feat: add Search Apps and Search Machines commands, remove old index"
```

---

### Task 12: AI Tools (Read)

**Files:**
- Create: `src/tools/get-apps.ts`
- Create: `src/tools/get-machines.ts`
- Create: `src/tools/get-volumes.ts`
- Create: `src/tools/get-secrets.ts`

- [ ] **Step 1: Create `src/tools/get-apps.ts`**

```typescript
import { fetchApplications } from "../api/graphql";

type Input = {
  /**
   * Optional organization name to filter apps by
   */
  orgName?: string;
};

export default async function (input: Input) {
  const apps = await fetchApplications();
  const filtered = input.orgName
    ? apps.filter((a) => a.organization.name === input.orgName)
    : apps;

  return filtered.map((a) => ({
    name: a.name,
    state: a.state,
    hostname: a.hostname,
    organization: a.organization.name,
    machineCount: a.machines?.nodes?.length ?? 0,
    regions: a.regions?.map((r) => r.code) ?? [],
  }));
}
```

- [ ] **Step 2: Create `src/tools/get-machines.ts`**

```typescript
import { listMachines } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app to list machines for
   */
  appName: string;
};

export default async function (input: Input) {
  const machines = await listMachines(input.appName);
  return machines.map((m) => ({
    id: m.id,
    state: m.state,
    region: m.region,
    cpu: `${m.config.guest.cpu_kind} x${m.config.guest.cpus}`,
    memoryMb: m.config.guest.memory_mb,
    image: m.config.image,
    createdAt: m.created_at,
  }));
}
```

- [ ] **Step 3: Create `src/tools/get-volumes.ts`**

```typescript
import { listVolumes } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app to list volumes for
   */
  appName: string;
};

export default async function (input: Input) {
  const volumes = await listVolumes(input.appName);
  return volumes.map((v) => ({
    name: v.name,
    sizeGb: v.sizeGb,
    region: v.region,
    state: v.state,
  }));
}
```

- [ ] **Step 4: Create `src/tools/get-secrets.ts`**

```typescript
import { fetchSecrets } from "../api/graphql";

type Input = {
  /**
   * The name of the Fly.io app to list secrets for
   */
  appName: string;
};

export default async function (input: Input) {
  const secrets = await fetchSecrets(input.appName);
  return secrets.map((s) => ({
    name: s.name,
    createdAt: s.createdAt,
  }));
}
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/get-apps.ts src/tools/get-machines.ts src/tools/get-volumes.ts src/tools/get-secrets.ts
git commit -m "feat: add read-only AI tools (get-apps, get-machines, get-volumes, get-secrets)"
```

---

### Task 13: AI Tools (Write — with Confirmation)

**Files:**
- Create: `src/tools/restart-machine.ts`
- Create: `src/tools/start-machine.ts`
- Create: `src/tools/stop-machine.ts`
- Create: `src/tools/destroy-machine.ts`

- [ ] **Step 1: Create `src/tools/restart-machine.ts`**

```typescript
import { Tool } from "@raycast/api";
import { restartMachine } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app
   */
  appName: string;
  /**
   * The machine ID to restart
   */
  machineId: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) => {
  return {
    message: `Restart machine ${input.machineId} in app ${input.appName}?`,
    info: [
      { name: "App", value: input.appName },
      { name: "Machine", value: input.machineId },
    ],
  };
};

export default async function (input: Input) {
  await restartMachine(input.appName, input.machineId);
  return `Machine ${input.machineId} restarted successfully`;
}
```

- [ ] **Step 2: Create `src/tools/start-machine.ts`**

```typescript
import { Tool } from "@raycast/api";
import { startMachine } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app
   */
  appName: string;
  /**
   * The machine ID to start
   */
  machineId: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) => {
  return {
    message: `Start machine ${input.machineId} in app ${input.appName}?`,
    info: [
      { name: "App", value: input.appName },
      { name: "Machine", value: input.machineId },
    ],
  };
};

export default async function (input: Input) {
  await startMachine(input.appName, input.machineId);
  return `Machine ${input.machineId} started successfully`;
}
```

- [ ] **Step 3: Create `src/tools/stop-machine.ts`**

```typescript
import { Tool } from "@raycast/api";
import { stopMachine } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app
   */
  appName: string;
  /**
   * The machine ID to stop
   */
  machineId: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) => {
  return {
    message: `Stop machine ${input.machineId} in app ${input.appName}?`,
    info: [
      { name: "App", value: input.appName },
      { name: "Machine", value: input.machineId },
    ],
  };
};

export default async function (input: Input) {
  await stopMachine(input.appName, input.machineId);
  return `Machine ${input.machineId} stopped successfully`;
}
```

- [ ] **Step 4: Create `src/tools/destroy-machine.ts`**

```typescript
import { Tool, Action } from "@raycast/api";
import { destroyMachine } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app
   */
  appName: string;
  /**
   * The machine ID to destroy
   */
  machineId: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) => {
  return {
    style: Action.Style.Destructive,
    message: `Permanently destroy machine ${input.machineId} in app ${input.appName}? This cannot be undone.`,
    info: [
      { name: "App", value: input.appName },
      { name: "Machine", value: input.machineId },
    ],
  };
};

export default async function (input: Input) {
  await destroyMachine(input.appName, input.machineId, true);
  return `Machine ${input.machineId} destroyed`;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/restart-machine.ts src/tools/start-machine.ts src/tools/stop-machine.ts src/tools/destroy-machine.ts
git commit -m "feat: add write AI tools with confirmation (restart, start, stop, destroy machine)"
```

---

### Task 14: Package.json and AI Evals

**Files:**
- Modify: `package.json`
- Create: `ai.yaml`

- [ ] **Step 1: Update `package.json`**

Replace the entire `package.json` with:

```json
{
  "$schema": "https://www.raycast.com/schemas/extension.json",
  "name": "raycast-fly",
  "title": "Fly.io",
  "description": "View and manage your Fly.io applications and machines",
  "categories": [
    "Developer Tools"
  ],
  "icon": "command-icon.png",
  "author": "devuo",
  "contributors": [
    "chrismessina"
  ],
  "license": "MIT",
  "commands": [
    {
      "name": "search-apps",
      "title": "Search Apps",
      "description": "Search and manage your Fly.io applications",
      "mode": "view"
    },
    {
      "name": "search-machines",
      "title": "Search Machines",
      "description": "Search and manage Fly.io machines across your apps",
      "mode": "view"
    }
  ],
  "tools": [
    {
      "name": "get-apps",
      "title": "Get Apps",
      "description": "List all Fly.io applications with their state, organization, machine count, and regions"
    },
    {
      "name": "get-machines",
      "title": "Get Machines",
      "description": "List all machines for a specific Fly.io app with their state, region, CPU, and memory"
    },
    {
      "name": "get-volumes",
      "title": "Get Volumes",
      "description": "List all volumes for a specific Fly.io app with name, size, region, and state"
    },
    {
      "name": "get-secrets",
      "title": "Get Secrets",
      "description": "List secret names for a specific Fly.io app (values are never exposed)"
    },
    {
      "name": "restart-machine",
      "title": "Restart Machine",
      "description": "Restart a specific machine in a Fly.io app"
    },
    {
      "name": "start-machine",
      "title": "Start Machine",
      "description": "Start a stopped machine in a Fly.io app"
    },
    {
      "name": "stop-machine",
      "title": "Stop Machine",
      "description": "Stop a running machine in a Fly.io app"
    },
    {
      "name": "destroy-machine",
      "title": "Destroy Machine",
      "description": "Permanently destroy a machine in a Fly.io app. This cannot be undone."
    }
  ],
  "ai": {
    "instructions": "Use the Fly.io tools to help users manage their applications and machines. Always list apps or machines first to get valid names and IDs before performing actions. Never guess machine IDs. Secret values are never exposed — only names are available."
  },
  "preferences": [
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
    },
    {
      "name": "verboseLogging",
      "type": "checkbox",
      "title": "Verbose Logging",
      "description": "Enable detailed logging for debugging",
      "default": false,
      "label": "Enable verbose logging",
      "required": false
    }
  ],
  "dependencies": {
    "@chrismessina/raycast-logger": "^1.2.2",
    "@raycast/api": "^1.104.11",
    "@raycast/utils": "^2.2.3",
    "node-fetch": "3.3.2",
    "uniqolor": "1.1.1"
  },
  "devDependencies": {
    "@raycast/eslint-config": "^2.1.1",
    "@types/node": "^25.5.0",
    "@types/react": "^19.2.14",
    "eslint": "^9.35.0",
    "prettier": "^3.8.1",
    "typescript": "^5.9.3"
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "fix-lint": "ray lint --fix",
    "lint": "ray lint",
    "publish": "npx @raycast/api@latest publish"
  }
}
```

- [ ] **Step 2: Create `ai.yaml`**

```yaml
instructions: |
  Use the Fly.io tools to help users manage their applications and machines.
  Always list apps or machines first to get valid names and IDs before performing actions.
  Never guess machine IDs. Secret values are never exposed — only names are available.

evals:
  - input: "list my fly apps"
    expected:
      - callsTool: "get-apps"

  - input: "what machines are running for myapp"
    expected:
      - callsTool:
          name: "get-machines"
          arguments:
            appName: "myapp"

  - input: "restart the machine abc123 in myapp"
    expected:
      - callsTool:
          name: "restart-machine"
          arguments:
            appName: "myapp"
            machineId: "abc123"

  - input: "what secrets does myapp have"
    expected:
      - callsTool:
          name: "get-secrets"
          arguments:
            appName: "myapp"

  - input: "stop machine xyz789 for myapp"
    expected:
      - callsTool:
          name: "stop-machine"
          arguments:
            appName: "myapp"
            machineId: "xyz789"

  - input: "show volumes for myapp"
    expected:
      - callsTool:
          name: "get-volumes"
          arguments:
            appName: "myapp"
```

- [ ] **Step 3: Commit**

```bash
git add package.json ai.yaml
git commit -m "feat: update package.json with v2 commands, tools, preferences; add AI evals"
```

---

### Task 15: Build Verification and Fixes

- [ ] **Step 1: Install dependencies**

Run: `cd /Users/messina/Developer/GitHub/chrismessina/raycast-fly && npm install`

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit --pretty`

Fix any type errors that appear. Common issues to watch for:
- Import paths
- Missing type exports
- `node-fetch` vs built-in `fetch` usage in `graphql.ts` (standalone functions use built-in `fetch`, hook uses `useFetch`)

- [ ] **Step 3: Lint**

Run: `npm run lint`

Fix any lint issues.

- [ ] **Step 4: Build**

Run: `npm run build`

Verify it produces output in `dist/`.

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve build errors and lint issues"
```

---

### Task 16: Documentation

**Files:**
- Modify: `README.md`
- Create: `CHANGELOG.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update `README.md`**

Replace the README with updated content reflecting v2.0:

- Title: Fly.io for Raycast
- Description covering: search apps, search machines, machine lifecycle, AI tools
- Setup section describing the inline onboarding flow (auto-detect CLI, generate token, or set manually)
- Features list: Search Apps (with detail panel), Search Machines (with detail panel), App Detail (machines, volumes, secrets, IPs, releases), Machine Detail (config, services, mounts, checks), AI Tools (list apps/machines/volumes/secrets, start/stop/restart/destroy machines)
- Fly MCP section: note that complex operations (create/deploy) can use the Fly MCP server via Claude
- Keyboard shortcuts reference table
- Credits/license

- [ ] **Step 2: Create `CHANGELOG.md`**

```markdown
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
- Verbose logging preference with `@chrismessina/raycast-logger`
- Custom Fly CLI path preference
- Keyboard shortcuts using `Keyboard.Shortcut.Common` conventions

### Changed
- Renamed "View Fly.io Applications" to "Search Apps"
- Split API layer into GraphQL (`api/graphql.ts`) and REST (`api/machines.ts`) modules
- Enhanced apps list with state icons, region tags, machine counts, and deploy timestamps
- Auth errors now show onboarding guide instead of static error page

### Removed
- Single-file `fly.ts` API (replaced by `api/` modules)
- Single-file `index.tsx` command (replaced by `search-apps.tsx`)
```

- [ ] **Step 3: Update `CLAUDE.md`** to reflect new architecture

Update the Architecture section to describe the new file structure: `api/` (graphql, machines, types, paths), `utils/` (logger, icons, time, cli), `pages/` (with-valid-token, setup-guide, lists/, details/), top-level commands, and `tools/`.

- [ ] **Step 4: Commit**

```bash
git add README.md CHANGELOG.md CLAUDE.md
git commit -m "docs: update README, add CHANGELOG, update CLAUDE.md for v2.0"
```

---

## Self-Review

**Spec coverage check:**
- File structure: Covered in file map and tasks 1-14
- Onboarding (with-valid-token, setup-guide): Task 6
- Preferences (authToken, flyBinaryPath, verboseLogging): Task 14
- Logging: Task 1 (logger), used throughout all view tasks
- Commands (Search Apps, Search Machines): Tasks 7, 10, 11
- App Detail view: Task 8
- Machine Detail view: Task 9
- Keyboard shortcuts: Applied throughout tasks 7-10
- State icons: Task 2
- AI Tools (8 total): Tasks 12-13
- Evals: Task 14
- Fly MCP integration: Task 7 (action in apps list)
- API layer (GraphQL, Machines REST): Tasks 4-5
- Binary detection: Task 3
- Documentation (README, CHANGELOG): Task 16

**Placeholder scan:** No TBDs, TODOs, or "implement later" found.

**Type consistency check:** All types defined in Task 1 (`api/types.ts`), imported consistently across all tasks. Function names match between API layer and consumers.
