import { getPreferenceValues } from "@raycast/api";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { logger } from "../utils/logger";

const cliLogger = logger.child("cli");

const COMMON_PATHS = [
  "/opt/homebrew/bin/fly",
  "/usr/local/bin/fly",
  `${process.env.HOME}/.fly/bin/fly`,
  "/opt/homebrew/bin/flyctl",
  "/usr/local/bin/flyctl",
  `${process.env.HOME}/.fly/bin/flyctl`,
];

export function findFlyBinary(): string | null {
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
