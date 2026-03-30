import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

const MCP_MARKDOWN = `# Fly.io MCP Server

The Fly.io MCP server lets AI coding agents provision and manage your Fly.io applications.

## Setup

Run one of the following commands in your terminal to configure the MCP server for your preferred editor or AI client:

| Client | Command |
|--------|---------|
| Claude Desktop | \`fly mcp server --claude\` |
| Cursor | \`fly mcp server --cursor\` |
| VS Code | \`fly mcp server --vscode\` |
| Windsurf | \`fly mcp server --windsurf\` |
| Neovim | \`fly mcp server --neovim\` |
| Zed | \`fly mcp server --zed\` |
| Custom config path | \`fly mcp server --config <path>\` |

## Supported Commands

The MCP server provides access to most \`flyctl\` commands:

- **apps** — Manage Fly applications
- **machine** — Manage Fly Machines (create, start, stop, destroy)
- **volumes** — Manage persistent storage
- **secrets** — Manage application secrets
- **certs** — Manage SSL certificates
- **orgs** — Manage organizations
- **logs** — View application logs
- **status** — Show application status
- **platform** — Platform information

## Testing with MCP Inspector

You can explore available tools using the MCP inspector:

\`\`\`
fly mcp server -i
\`\`\`

Then navigate to http://127.0.0.1:6274 to browse and test tools interactively.

## Learn More

See the [Fly.io MCP documentation](https://fly.io/docs/flyctl/mcp/) for full details.
`;

export function McpGuide() {
  return (
    <Detail
      navigationTitle="Fly MCP Setup"
      markdown={MCP_MARKDOWN}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Claude Command" content="fly mcp server --claude" icon={Icon.Terminal} />
          <Action.CopyToClipboard title="Copy Cursor Command" content="fly mcp server --cursor" icon={Icon.Terminal} />
          <Action.CopyToClipboard title="Copy VS Code Command" content="fly mcp server --vscode" icon={Icon.Terminal} />
          <Action.CopyToClipboard
            title="Copy Windsurf Command"
            content="fly mcp server --windsurf"
            icon={Icon.Terminal}
          />
          <Action.OpenInBrowser title="Open Fly MCP Docs" url="https://fly.io/docs/flyctl/mcp/" icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}
