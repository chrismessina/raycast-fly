import { Action, ActionPanel, Alert, Icon, Keyboard, Toast, confirmAlert, showToast } from "@raycast/api";
import { startMachine, stopMachine, restartMachine, destroyMachine } from "../api/machines";
import { logger } from "../utils/logger";
import { showErrorToast } from "../utils/toast";

interface MachineActionsProps {
  machineId: string;
  machineState: string;
  machineRegion?: string;
  appName: string;
  onAction: () => void;
}

export function MachineActions({ machineId, machineState, machineRegion, appName, onAction }: MachineActionsProps) {
  return (
    <>
      {machineState === "started" && (
        <Action
          title="Restart Machine"
          icon={Icon.RotateClockwise}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Restart Machine",
              message: `Restart machine ${machineId}${machineRegion ? ` (${machineRegion})` : ""} in ${appName}?`,
              icon: Icon.RotateClockwise,
            });
            if (!confirmed) return;
            try {
              await showToast({ style: Toast.Style.Animated, title: "Restarting machine..." });
              await restartMachine(appName, machineId);
              await showToast({ style: Toast.Style.Success, title: "Machine restarted" });
              onAction();
            } catch (error) {
              logger.error("Restart failed", error);
              await showErrorToast("Failed to restart machine", error);
            }
          }}
        />
      )}

      {machineState === "stopped" && (
        <Action
          title="Start Machine"
          icon={Icon.Play}
          onAction={async () => {
            try {
              await startMachine(appName, machineId);
              await showToast({ style: Toast.Style.Success, title: "Machine started" });
              onAction();
            } catch (error) {
              logger.error("Start failed", error);
              await showErrorToast("Failed to start machine", error);
            }
          }}
        />
      )}

      {machineState === "started" && (
        <Action
          title="Stop Machine"
          icon={Icon.Stop}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Stop Machine",
              message: `Stop machine ${machineId}${machineRegion ? ` (${machineRegion})` : ""} in ${appName}?`,
              icon: Icon.Stop,
            });
            if (!confirmed) return;
            try {
              await stopMachine(appName, machineId);
              await showToast({ style: Toast.Style.Success, title: "Machine stopped" });
              onAction();
            } catch (error) {
              logger.error("Stop failed", error);
              await showErrorToast("Failed to stop machine", error);
            }
          }}
        />
      )}

      <ActionPanel.Section title="Destructive">
        <Action
          title="Destroy Machine"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={Keyboard.Shortcut.Common.Remove}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Destroy Machine",
              message: `Permanently destroy machine ${machineId}${machineRegion ? ` (${machineRegion})` : ""} in ${appName}? This cannot be undone.`,
              icon: Icon.Trash,
              primaryAction: {
                title: "Destroy",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (!confirmed) return;
            try {
              await destroyMachine(appName, machineId, true);
              await showToast({ style: Toast.Style.Success, title: "Machine destroyed" });
              onAction();
            } catch (error) {
              logger.error("Destroy failed", error);
              await showErrorToast("Failed to destroy machine", error);
            }
          }}
        />
      </ActionPanel.Section>
    </>
  );
}
