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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setTokenState("loading");
    resolveAndCacheToken().then((token) => {
      setTokenState(token ? "ready" : "missing");
    });
  }, [attempt]);

  function onTokenSaved() {
    setAttempt((a) => a + 1);
  }

  if (tokenState === "loading") {
    return <List isLoading={true} />;
  }

  if (tokenState === "missing") {
    return <SetupGuide onTokenSaved={onTokenSaved} />;
  }

  return <TokenValidator onTokenSaved={onTokenSaved}>{children}</TokenValidator>;
}

function TokenValidator({ children, onTokenSaved }: Props & { onTokenSaved: () => void }) {
  const { data, isLoading } = useApplications();

  if (isLoading) {
    return <List isLoading={true} />;
  }

  if (isAuthenticationError(data)) {
    logger.warn("Authentication failed, showing setup guide");
    return <SetupGuide onTokenSaved={onTokenSaved} />;
  }

  return <>{children({ isLoading })}</>;
}
