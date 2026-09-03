import fetch from "node-fetch";
import { getAuthToken } from "../utils/auth";
import { logger } from "../utils/logger";
import type { Machine, Volume } from "./types";

const MACHINES_API = "https://api.machines.dev/v1";
const apiLogger = logger.child("api");

function headers(): Record<string, string> {
  const authToken = getAuthToken();
  return {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
  };
}

async function machinesRequest<T>(path: string, method = "GET"): Promise<T> {
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

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
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
  return machinesRequest<Volume[]>(`/apps/${appName}/volumes`);
}
