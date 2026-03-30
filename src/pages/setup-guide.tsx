import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Icon,
  LaunchType,
  Toast,
  launchCommand,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { findFlyBinary, isFlyAuthenticated } from "../api/paths";
import { generateToken } from "../utils/cli";
import { logger } from "../utils/logger";

type CliState = "not-found" | "not-authenticated" | "authenticated";

function detectCliState(): { state: CliState; binaryPath: string | null } {
  const binaryPath = findFlyBinary();
  if (!binaryPath) return { state: "not-found", binaryPath: null };
  if (!isFlyAuthenticated(binaryPath)) return { state: "not-authenticated", binaryPath };
  return { state: "authenticated", binaryPath };
}

export function SetupGuide() {
  const { state, binaryPath } = detectCliState();
  logger.step(`Setup guide: CLI state is "${state}"`);

  if (state === "authenticated" && binaryPath) {
    return <AuthenticatedGuide binaryPath={binaryPath} />;
  }

  if (state === "not-authenticated" && binaryPath) {
    return <NotAuthenticatedGuide />;
  }

  return <NotFoundGuide />;
}

function AuthenticatedGuide({ binaryPath }: { binaryPath: string }) {
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
                await Clipboard.copy(token);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Token generated",
                  message: "Copied to clipboard. Paste into extension preferences.",
                });
                openExtensionPreferences();
              } catch (error) {
                logger.error("Token generation failed", error);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to generate token",
                  message: error instanceof Error ? error.message : "Unknown error",
                });
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
          <Action.Open title="Open Terminal" target="/System/Applications/Utilities/Terminal.app" icon={Icon.Terminal} />
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
            title="Install via Homebrew Extension"
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
