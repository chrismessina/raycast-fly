import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { GRAPHQL_URL } from "../api/graphql";
import { resolveAndCacheToken } from "../utils/auth";
import { SetupGuide } from "./setup-guide";
import { logger } from "../utils/logger";

interface Props {
  children: (args: { isLoading: boolean }) => React.ReactNode;
}

async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "{ viewer { email } }" }),
    });
    const json = (await response.json()) as { errors?: { extensions?: { code?: string } }[] };
    if (json.errors?.some((e) => e.extensions?.code === "UNAUTHORIZED")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function WithValidToken({ children }: Props) {
  const [state, setState] = useState<"loading" | "no-token" | "invalid" | "valid">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState("loading");
    resolveAndCacheToken().then(async (token) => {
      if (!token) {
        setState("no-token");
        return;
      }
      const valid = await validateToken(token);
      if (valid) {
        setState("valid");
      } else {
        logger.warn("Authentication failed, showing setup guide");
        setState("invalid");
      }
    });
  }, [attempt]);

  function onTokenSaved() {
    setAttempt((a) => a + 1);
  }

  if (state === "loading") {
    return <List isLoading={true} />;
  }

  if (state === "no-token" || state === "invalid") {
    return <SetupGuide onTokenSaved={onTokenSaved} />;
  }

  return <>{children({ isLoading: false })}</>;
}
