import { execSync } from "child_process";
import { logger } from "./logger";

const FLY_ENV = { ...process.env, FLY_NO_UPDATE_CHECK: "1" };

/**
 * Get the personal org slug from `fly orgs list`.
 * Falls back to "personal" if detection fails.
 */
function getPersonalOrgSlug(binaryPath: string): string {
  const cliLogger = logger.child("cli");
  try {
    const output = execSync(`"${binaryPath}" orgs list`, {
      encoding: "utf-8",
      timeout: 10000,
      env: FLY_ENV,
    });
    // Parse the table output — look for PERSONAL type
    for (const line of output.split("\n")) {
      if (line.includes("PERSONAL")) {
        const slug = line.trim().split(/\s+/)[1];
        if (slug && slug !== "----") {
          cliLogger.debug(`Found personal org: ${slug}`);
          return slug;
        }
      }
    }
  } catch {
    cliLogger.warn("Failed to detect org slug, using 'personal'");
  }
  return "personal";
}

export function generateToken(binaryPath: string): string {
  const cliLogger = logger.child("cli");
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
  const cliLogger = logger.child("cli");
  cliLogger.info("Installing Fly MCP for Claude...");

  execSync(`"${binaryPath}" mcp add`, {
    encoding: "utf-8",
    timeout: 30000,
    env: FLY_ENV,
  });

  cliLogger.info("Fly MCP installed successfully");
}
