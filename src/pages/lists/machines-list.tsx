import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useApplications } from "../../api/graphql";
import { listMachines, startMachine, stopMachine, restartMachine, destroyMachine } from "../../api/machines";
import type { Machine } from "../../api/types";
import { getMachineStateIcon } from "../../utils/icons";
import { timeAgo } from "../../utils/time";
import { logger } from "../../utils/logger";
import { MachineDetail } from "../details/machine-detail";

interface Props {
  isLoading: boolean;
}

export function MachinesList({ isLoading: parentLoading }: Props) {
  const { data, isLoading: appsLoading } = useApplications();
  const apps = (data?.data?.apps?.nodes ?? []).filter(Boolean);
  const appNames = apps.map((a) => a.name);

  const [selectedApp, setSelectedApp] = useState<string>("");
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machinesLoading, setMachinesLoading] = useState(false);

  async function loadMachines(appName: string) {
    if (!appName) {
      setMachines([]);
      return;
    }
    setMachinesLoading(true);
    try {
      const result = await listMachines(appName);
      setMachines(result);
    } catch (error) {
      logger.error("Failed to load machines", error);
      setMachines([]);
    } finally {
      setMachinesLoading(false);
    }
  }

  useEffect(() => {
    if (selectedApp) {
      loadMachines(selectedApp);
    } else if (appNames.length > 0 && !selectedApp) {
      setSelectedApp(appNames[0]);
    }
  }, [selectedApp, appNames.length]);

  const loading = parentLoading || appsLoading || machinesLoading;

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by App" value={selectedApp} onChange={setSelectedApp}>
          {appNames.map((name) => (
            <List.Dropdown.Item key={name} title={name} value={name} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title={`Machines${selectedApp ? ` — ${selectedApp}` : ""}`}>
        {machines.map((machine) => (
          <MachineListItem
            key={machine.id}
            machine={machine}
            appName={selectedApp}
            reload={() => loadMachines(selectedApp)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function MachineListItem({ machine, appName, reload }: { machine: Machine; appName: string; reload: () => void }) {
  const icon = getMachineStateIcon(machine.state);
  const cpuSpec = `${machine.config.guest.cpu_kind} x${machine.config.guest.cpus}`;
  const memSpec = `${machine.config.guest.memory_mb}MB`;

  return (
    <List.Item
      title={machine.id}
      subtitle={machine.region}
      icon={icon}
      accessories={[{ text: `${cpuSpec} / ${memSpec}` }, { text: timeAgo(machine.updated_at) }]}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="State" text={machine.state} icon={icon} />
              <List.Item.Detail.Metadata.Label title="Region" text={machine.region} />
              <List.Item.Detail.Metadata.Label title="Image" text={machine.config.image} />
              <List.Item.Detail.Metadata.Label title="CPU" text={cpuSpec} />
              <List.Item.Detail.Metadata.Label title="Memory" text={memSpec} />
              <List.Item.Detail.Metadata.Label title="Created" text={timeAgo(machine.created_at)} />
              {machine.config.services?.map((svc, i) => (
                <List.Item.Detail.Metadata.Label
                  key={`svc-${i}`}
                  title={`Service ${svc.internal_port}`}
                  text={`${svc.protocol} → ${svc.ports.map((p) => p.port).join(", ")}`}
                />
              ))}
              {machine.config.mounts?.map((mount, i) => (
                <List.Item.Detail.Metadata.Label
                  key={`mount-${i}`}
                  title="Mount"
                  text={`${mount.volume || mount.name} → ${mount.path}`}
                />
              ))}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel title={machine.id}>
          <Action.Push
            title="View Machine Details"
            icon={Icon.Eye}
            target={<MachineDetail appName={appName} machineId={machine.id} />}
          />

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
                reload();
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
      }
    />
  );
}
