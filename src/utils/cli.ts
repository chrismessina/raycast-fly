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
