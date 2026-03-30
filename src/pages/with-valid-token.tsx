import { List } from "@raycast/api";
import { useEffect, useState } from "react";
import { useApplications, isAuthenticationError } from "../api/graphql";
import { resolveAndCacheToken } from "../utils/auth";
import { SetupGuide } from "./setup-guide";
import { logger } from "../utils/logger";

interface Props {
  children: (args: { isLoading: boolean }) => React.ReactNode;
}

export function WithValidToken({ children }: Props) {
  const [tokenState, setTokenState] = useState<"loading" | "missing" | "ready">("loading");

  useEffect(() => {
    resolveAndCacheToken().then((token) => {
      setTokenState(token ? "ready" : "missing");
    });
  }, []);

  if (tokenState === "loading") {
    return <List isLoading={true} />;
  }

  if (tokenState === "missing") {
    return <SetupGuide />;
  }

  return <TokenValidator>{children}</TokenValidator>;
}

function TokenValidator({ children }: Props) {
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
