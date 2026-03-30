import { useFetch } from "@raycast/utils";
import { getAuthToken } from "../utils/auth";
import { logger } from "../utils/logger";
import type { Application, ApplicationsResponse, AppDetailResponse, Secret } from "./types";

const GRAPHQL_URL = "https://api.fly.io/graphql";

function useGraphQL<T>(query: string) {
  const authToken = getAuthToken();

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
  if (
    typeof data === "object" &&
    data !== null &&
    "errors" in data &&
    Array.isArray((data as { errors: unknown[] }).errors)
  ) {
    return (data as { errors: { extensions?: { code?: string } }[] }).errors.some(
      (error) => error?.extensions?.code === "UNAUTHORIZED",
    );
  }
  return false;
}

// Standalone fetch for AI tools (non-hook context)
export async function fetchApplications(): Promise<Application[]> {
  const authToken = getAuthToken();
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
  const authToken = getAuthToken();
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
