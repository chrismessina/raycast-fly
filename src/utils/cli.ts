import { execSync } from "child_process";
import { logger } from "./logger";

const FLY_ENV = { ...process.env, FLY_NO_UPDATE_CHECK: "1" };
const cliLogger = logger.child("cli");

function getPersonalOrgSlug(binaryPath: string): string {
  try {
    const output = execSync(`"${binaryPath}" orgs list --json`, {
      encoding: "utf-8",
      timeout: 10000,
      env: FLY_ENV,
    });
    const orgs = JSON.parse(output) as Record<string, string>;
    if ("personal" in orgs) {
      cliLogger.debug("Found personal org slug");
      return "personal";
    }
    const firstSlug = Object.keys(orgs)[0];
    if (firstSlug) {
      cliLogger.debug(`Using first org slug: ${firstSlug}`);
      return firstSlug;
    }
  } catch {
    cliLogger.warn("Failed to detect org slug, using 'personal'");
  }
  return "personal";
}

export function generateToken(binaryPath: string): string {
  cliLogger.info("Generating Fly.io API token...");

  const orgSlug = getPersonalOrgSlug(binaryPath);
  cliLogger.info(`Creating org token for: ${orgSlug}`);

  const token = execSync(`"${binaryPath}" tokens create org -o ${orgSlug}`, {
    encoding: "utf-8",
    timeout: 15000,
    env: FLY_ENV,
  }).trim();

  cliLogger.info("Token generated successfully");
  return token;
}

export function installFlyMcp(binaryPath: string): void {
  cliLogger.info("Installing Fly MCP for Claude...");

  execSync(`"${binaryPath}" mcp add`, {
    encoding: "utf-8",
    timeout: 30000,
    env: FLY_ENV,
  });

  cliLogger.info("Fly MCP installed successfully");
}
