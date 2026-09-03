import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchType,
  List,
  Toast,
  launchCommand,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { findFlyBinary, isFlyAuthenticated } from "../api/paths";
import { generateToken } from "../utils/cli";
import { saveGeneratedToken } from "../utils/auth";
import { logger } from "../utils/logger";
import { showErrorToast } from "../utils/toast";

type CliState = "loading" | "not-found" | "not-authenticated" | "authenticated";

interface SetupGuideProps {
  onTokenSaved?: () => void;
}

export function SetupGuide({ onTokenSaved }: SetupGuideProps) {
  const [cliState, setCliState] = useState<CliState>("loading");
  const [binaryPath, setBinaryPath] = useState<string | null>(null);

  useEffect(() => {
    const path = findFlyBinary();
    if (!path) {
      setCliState("not-found");
      return;
    }
    setBinaryPath(path);
    if (!isFlyAuthenticated(path)) {
      setCliState("not-authenticated");
      return;
    }
    setCliState("authenticated");
    logger.step("setup", `CLI state is "authenticated"`);
  }, []);

  if (cliState === "loading") {
    return <List isLoading={true} />;
  }

  if (cliState === "authenticated" && binaryPath) {
    return <AuthenticatedGuide binaryPath={binaryPath} onTokenSaved={onTokenSaved} />;
  }

  if (cliState === "not-authenticated") {
    return <NotAuthenticatedGuide />;
  }

  return <NotFoundGuide />;
}

function AuthenticatedGuide({ binaryPath, onTokenSaved }: { binaryPath: string; onTokenSaved?: () => void }) {
  const markdown = `# Fly.io Setup

Found \`flyctl\` at \`${binaryPath}\` and it's authenticated.

**Generate an API token** to connect this extension to your Fly.io account, or set one manually in preferences.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Generate Token"
            icon={Icon.Key}
            onAction={async () => {
              try {
                await showToast({ style: Toast.Style.Animated, title: "Generating token..." });
                const token = generateToken(binaryPath);
                await saveGeneratedToken(token);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Token saved",
                  message: "Connecting to Fly.io...",
                });
                onTokenSaved?.();
              } catch (error) {
                logger.error("Token generation failed", error);
                await showErrorToast("Failed to generate token", error);
              }
            }}
          />
          <Action title="Set Token Manually" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function NotAuthenticatedGuide() {
  const markdown = `# Fly.io Setup

Found \`flyctl\` but it's **not authenticated**. You need to sign in once via the terminal.

1. Open your terminal
2. Run \`fly auth login\`
3. Complete the sign-in in your browser
4. Come back here and try again`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Login Command" content="fly auth login" icon={Icon.Terminal} />
          <Action.Open
            title="Open Terminal"
            target="/System/Applications/Utilities/Terminal.app"
            icon={Icon.Terminal}
          />
          <Action title="Set Token Manually" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function NotFoundGuide() {
  const markdown = `# Fly.io Setup

The \`flyctl\` CLI was not found on your system. You need it to authenticate with Fly.io.

## Install via Homebrew

If you have Homebrew installed, run:
\`\`\`
brew install flyctl
\`\`\`

Or use the Homebrew Raycast extension to install it.

## Install via Script

If you don't have Homebrew:
\`\`\`
curl -L https://fly.io/install.sh | sh
\`\`\`

## Already have a token?

If you already have a Fly.io API token, you can set it directly in extension preferences.`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Install Via Homebrew Extension"
            icon={Icon.Download}
            onAction={async () => {
              try {
                await launchCommand({
                  ownerOrAuthorName: "nhojb",
                  extensionName: "brew",
                  name: "search",
                  type: LaunchType.UserInitiated,
                  context: { query: "flyctl" },
                });
              } catch {
                await open("https://www.raycast.com/nhojb/brew");
              }
            }}
          />
          <Action.CopyToClipboard
            title="Copy Install Script"
            content="curl -L https://fly.io/install.sh | sh"
            icon={Icon.Terminal}
          />
          <Action.OpenInBrowser title="Open Install Docs" url="https://fly.io/docs/flyctl/install/" icon={Icon.Globe} />
          <Action title="Set Token Manually" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
