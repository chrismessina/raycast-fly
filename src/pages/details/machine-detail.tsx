import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getMachine,
  startMachine,
  stopMachine,
  restartMachine,
  destroyMachine,
} from "../../api/machines";
import type { Machine } from "../../api/types";
import { getMachineStateIcon } from "../../utils/icons";
import { timeAgo } from "../../utils/time";
import { logger } from "../../utils/logger";

export function MachineDetail({ appName, machineId }: { appName: string; machineId: string }) {
  const [machine, setMachine] = useState<Machine | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadMachine() {
    setIsLoading(true);
    try {
      const m = await getMachine(appName, machineId);
      setMachine(m);
    } catch (error) {
      logger.error("Failed to load machine", error);
      await showToast({ style: Toast.Style.Failure, title: "Failed to load machine details" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMachine();
  }, [appName, machineId]);

  const icon = machine ? getMachineStateIcon(machine.state) : undefined;

  return (
    <List isLoading={isLoading} navigationTitle={machineId}>
      {machine ? (
        <>
          <List.Section title="Overview">
            <List.Item
              title="State"
              icon={icon}
              accessories={[{ text: machine.state }]}
              actions={<MachineActions appName={appName} machine={machine} reload={loadMachine} />}
            />
            <List.Item title="Machine ID" accessories={[{ text: machine.id }]} icon={Icon.Fingerprint} />
            <List.Item title="Region" accessories={[{ text: machine.region }]} icon={Icon.Globe} />
            <List.Item
              title="Image"
              accessories={[{ text: machine.config.image }]}
              icon={Icon.Box}
            />
            <List.Item
              title="Created"
              accessories={[{ text: timeAgo(machine.created_at) }]}
              icon={Icon.Calendar}
            />
          </List.Section>

          <List.Section title="Resources">
            <List.Item
              title="CPU"
              accessories={[
                { text: `${machine.config.guest.cpu_kind} x${machine.config.guest.cpus}` },
              ]}
              icon={Icon.ComputerChip}
            />
            <List.Item
              title="Memory"
              accessories={[{ text: `${machine.config.guest.memory_mb} MB` }]}
              icon={Icon.MemoryChip}
            />
          </List.Section>

          {machine.config.services && machine.config.services.length > 0 ? (
            <List.Section title="Services">
              {machine.config.services.map((svc, i) => (
                <List.Item
                  key={`svc-${i}`}
                  title={`Port ${svc.internal_port}`}
                  subtitle={svc.protocol}
                  accessories={[
                    {
                      text: svc.ports.map((p) => `${p.port} (${p.handlers.join(", ")})`).join(", "),
                    },
                    ...(svc.autostart ? [{ text: "autostart" }] : []),
                    ...(svc.autostop ? [{ text: `autostop: ${svc.autostop}` }] : []),
                  ]}
                  icon={Icon.Network}
                />
              ))}
            </List.Section>
          ) : null}

          {machine.config.mounts && machine.config.mounts.length > 0 ? (
            <List.Section title="Mounts">
              {machine.config.mounts.map((mount, i) => (
                <List.Item
                  key={`mount-${i}`}
                  title={mount.volume || mount.name || "Volume"}
                  subtitle={mount.path}
                  accessories={mount.size_gb ? [{ text: `${mount.size_gb} GB` }] : []}
                  icon={Icon.HardDrive}
                />
              ))}
            </List.Section>
          ) : null}

          {machine.checks && machine.checks.length > 0 ? (
            <List.Section title="Checks">
              {machine.checks.map((check, i) => (
                <List.Item
                  key={`check-${i}`}
                  title={check.name || `Check ${i + 1}`}
                  accessories={[{ text: check.status }]}
                  icon={check.status === "passing" ? Icon.CheckCircle : Icon.XMarkCircle}
                />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : null}
    </List>
  );
}

function MachineActions({
  appName,
  machine,
  reload,
}: {
  appName: string;
  machine: Machine;
  reload: () => void;
}) {
  return (
    <ActionPanel title={machine.id}>
      {machine.state === "stopped" && (
        <Action
          title="Start Machine"
          icon={Icon.Play}
          onAction={async () => {
            try {
              await startMachine(appName, machine.id);
              await showToast({ style: Toast.Style.Success, title: "Machine started" });
              reload();
            } catch (error) {
              logger.error("Start failed", error);
              await showToast({ style: Toast.Style.Failure, title: "Failed to start" });
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
              reload();
            } catch (error) {
              logger.error("Stop failed", error);
              await showToast({ style: Toast.Style.Failure, title: "Failed to stop" });
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
              reload();
            } catch (error) {
              logger.error("Restart failed", error);
              await showToast({ style: Toast.Style.Failure, title: "Failed to restart" });
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
          } catch (error) {
            logger.error("Destroy failed", error);
            await showToast({ style: Toast.Style.Failure, title: "Failed to destroy" });
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
        onAction={reload}
      />
    </ActionPanel>
  );
}
