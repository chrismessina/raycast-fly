import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { useAppDetail } from "../../api/graphql";
import { restartMachine, startMachine, stopMachine, destroyMachine } from "../../api/machines";
import type { Application, MachineSummary, Secret } from "../../api/types";
import { getMachineStateIcon } from "../../utils/icons";
import { timeAgo } from "../../utils/time";
import { logger } from "../../utils/logger";
import { showErrorToast } from "../../utils/toast";

export function AppDetail({ appName }: { appName: string }) {
  const { data, isLoading, revalidate } = useAppDetail(appName);
  const app = data?.data?.app;

  return (
    <List isLoading={isLoading} navigationTitle={appName}>
      {app ? (
        <>
          <List.Section title="Machines">
            {app.machines?.nodes?.map((machine) => (
              <MachineItem key={machine.id} machine={machine} appName={appName} revalidate={revalidate} />
            ))}
            {(!app.machines?.nodes || app.machines.nodes.length === 0) && (
              <List.Item title="No machines" icon={Icon.Minus} />
            )}
          </List.Section>

          <List.Section title="Volumes">
            {app.volumes?.nodes?.map((vol, i) => (
              <List.Item
                key={`vol-${i}`}
                title={vol.name}
                accessories={[{ text: `${vol.sizeGb} GB` }, { text: vol.region }, { text: vol.state }]}
                icon={Icon.HardDrive}
              />
            ))}
            {(!app.volumes?.nodes || app.volumes.nodes.length === 0) && (
              <List.Item title="No volumes" icon={Icon.Minus} />
            )}
          </List.Section>

          <List.Section title="Secrets">
            {(app as Application & { secrets?: Secret[] }).secrets?.map((secret) => (
              <List.Item
                key={secret.name}
                title={secret.name}
                accessories={[{ text: timeAgo(secret.createdAt) }]}
                icon={Icon.Lock}
              />
            ))}
          </List.Section>

          <List.Section title="IP Addresses">
            {app.ipAddresses?.nodes?.map((ip, i) => (
              <List.Item
                key={`ip-${i}`}
                title={ip.address}
                accessories={[{ text: ip.type }]}
                icon={Icon.Globe}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy IP Address" content={ip.address} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          <List.Section title="Recent Releases">
            {app.currentRelease ? (
              <List.Item
                title={app.currentRelease.imageRef}
                accessories={[{ text: app.currentRelease.status }, { text: timeAgo(app.currentRelease.createdAt) }]}
                icon={Icon.Box}
                actions={
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Image Ref" content={app.currentRelease.imageRef} />
                  </ActionPanel>
                }
              />
            ) : (
              <List.Item title="No releases" icon={Icon.Minus} />
            )}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

function MachineItem({
  machine,
  appName,
  revalidate,
}: {
  machine: MachineSummary;
  appName: string;
  revalidate: () => void;
}) {
  const icon = getMachineStateIcon(machine.state);

  return (
    <List.Item
      title={machine.id}
      subtitle={machine.region}
      icon={icon}
      accessories={[{ text: machine.state }]}
      actions={
        <ActionPanel title={machine.id}>
          {machine.state === "stopped" && (
            <Action
              title="Start Machine"
              icon={Icon.Play}
              onAction={async () => {
                try {
                  await startMachine(appName, machine.id);
                  await showToast({ style: Toast.Style.Success, title: "Machine started" });
                  revalidate();
                } catch (error) {
                  logger.error("Start failed", error);
                  await showErrorToast("Failed to start machine", error);
                }
              }}
            />
          )}

          {machine.state === "started" && (
            <Action
              title="Stop Machine"
              icon={Icon.Stop}
              onAction={async () => {
                try {
                  await stopMachine(appName, machine.id);
                  await showToast({ style: Toast.Style.Success, title: "Machine stopped" });
                  revalidate();
                } catch (error) {
                  logger.error("Stop failed", error);
                  await showErrorToast("Failed to stop machine", error);
                }
              }}
            />
          )}

          {machine.state === "started" && (
            <Action
              title="Restart Machine"
              icon={Icon.RotateClockwise}
              onAction={async () => {
                try {
                  await restartMachine(appName, machine.id);
                  await showToast({ style: Toast.Style.Success, title: "Machine restarted" });
                  revalidate();
                } catch (error) {
                  logger.error("Restart failed", error);
                  await showErrorToast("Failed to restart machine", error);
                }
              }}
            />
          )}

          <Action
            title="Destroy Machine"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              try {
                await destroyMachine(appName, machine.id, true);
                await showToast({ style: Toast.Style.Success, title: "Machine destroyed" });
                revalidate();
              } catch (error) {
                logger.error("Destroy failed", error);
                await showErrorToast("Failed to destroy machine", error);
              }
            }}
          />

          <Action.OpenInBrowser
            title="Open Dashboard"
            url={`https://fly.io/apps/${appName}`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />

          <Action.CopyToClipboard
            title="Copy Machine ID"
            content={machine.id}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />

          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
