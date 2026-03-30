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
