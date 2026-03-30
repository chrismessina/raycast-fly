import { Action, ActionPanel, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import uniqolor from "uniqolor";
import { useApplications } from "../../api/graphql";
import { restartMachine } from "../../api/machines";
import type { Application } from "../../api/types";
import { getAppStateIcon } from "../../utils/icons";
import { timeAgo } from "../../utils/time";
import { logger } from "../../utils/logger";
import { AppDetail } from "../details/app-detail";
import { findFlyBinary } from "../../api/paths";
import { installFlyMcp } from "../../utils/cli";

interface Props {
  isLoading: boolean;
}

export function AppsList({ isLoading: parentLoading }: Props) {
  const { data, isLoading, revalidate } = useApplications();
  const apps = data?.data?.apps?.nodes ?? [];
  const loading = parentLoading || isLoading;

  // Build org list for filter
  const orgs = [...new Set(apps.map((a) => a.organization.name))];

  return (
    <List
      isShowingDetail
      isLoading={loading}
      searchBarAccessory={
        orgs.length > 1 ? (
          <List.Dropdown tooltip="Filter by Organization" onChange={() => {}}>
            <List.Dropdown.Item title="All Organizations" value="" />
            {orgs.map((org) => (
              <List.Dropdown.Item key={org} title={org} value={org} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.Section title="Applications">
        {apps.map((app) => (
          <AppListItem key={app.name} app={app} revalidate={revalidate} />
        ))}
      </List.Section>
    </List>
  );
}

function AppListItem({ app, revalidate }: { app: Application; revalidate: () => void }) {
  const icon = getAppStateIcon(app.state);
  const machineCount = app.machines?.nodes?.length ?? 0;
  const regions = app.regions?.map((r) => r.code).join(", ") ?? "";

  return (
    <List.Item
      title={app.name}
      subtitle={app.organization.name}
      icon={icon}
      accessories={[
        ...(regions ? [{ text: regions }] : []),
        { text: `${machineCount} machines` },
        ...(app.currentRelease ? [{ text: timeAgo(app.currentRelease.createdAt), tooltip: "Last deployed" }] : []),
      ]}
      detail={<AppListDetail app={app} />}
      actions={<AppListActions app={app} revalidate={revalidate} />}
    />
  );
}

function AppListDetail({ app }: { app: Application }) {
  const isMb = app.vmSize.memoryGb < 1;
  const hostname = app.hostname ? `https://${app.hostname}` : undefined;

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="State">
            <List.Item.Detail.Metadata.TagList.Item text={app.state.toLowerCase()} color={uniqolor(app.state).color} />
          </List.Item.Detail.Metadata.TagList>

          <List.Item.Detail.Metadata.Label title="Organization" text={app.organization.name} />

          {hostname && <List.Item.Detail.Metadata.Link title="Hostname" text={hostname} target={hostname} />}

          <List.Item.Detail.Metadata.Label title="Machine Count" text={String(app.machines?.nodes?.length ?? 0)} />

          <List.Item.Detail.Metadata.Label
            title="Machine Size"
            text={`${app.vmSize.name}@${isMb ? app.vmSize.memoryMb + "MB" : app.vmSize.memoryGb + "GB"}`}
          />

          <List.Item.Detail.Metadata.Label title="Volumes" text={String(app.volumes?.nodes?.length ?? 0)} />

          {app.regions ? (
            <List.Item.Detail.Metadata.TagList title="Regions">
              {app.regions.map((region) => (
                <List.Item.Detail.Metadata.TagList.Item
                  key={region.code}
                  text={region.code}
                  color={uniqolor(region.code, { lightness: [70, 100] }).color}
                />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : null}

          <List.Item.Detail.Metadata.Label title="Public IPs" text={String(app.ipAddresses?.nodes?.length ?? 0)} />
          <List.Item.Detail.Metadata.Label title="Certificates" text={String(app.certificates?.nodes?.length ?? 0)} />

          {app.autoscaling?.enabled ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Autoscaling" />
              <List.Item.Detail.Metadata.Label title="Strategy" text={app.autoscaling.strategy} />
              <List.Item.Detail.Metadata.Label
                title="Range"
                text={`${app.autoscaling.minCount} - ${app.autoscaling.maxCount}`}
              />
            </>
          ) : null}

          {app.currentRelease ? (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Current Release" />
              <List.Item.Detail.Metadata.Label
                title="Date"
                text={app.currentRelease.createdAt.replace("T", " ").replace("Z", " UTC")}
              />
              <List.Item.Detail.Metadata.TagList title="Status">
                <List.Item.Detail.Metadata.TagList.Item
                  text={app.currentRelease.status}
                  color={uniqolor(app.currentRelease.status, { lightness: [70, 100] }).color}
                />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label title="Image" text={app.currentRelease.imageRef} />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function AppListActions({ app, revalidate }: { app: Application; revalidate: () => void }) {
  const ips = app.ipAddresses?.nodes?.map((ip) => ip.address) ?? [];

  return (
    <ActionPanel title={app.name}>
      <Action.Push title="View App Details" icon={Icon.Eye} target={<AppDetail appName={app.name} />} />

      <Action.OpenInBrowser
        title="Open Dashboard"
        url={`https://fly.io/apps/${app.name}`}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <Action.OpenInBrowser
        title="Open Monitoring"
        url={`https://fly.io/apps/${app.name}/monitoring`}
        shortcut={Keyboard.Shortcut.Common.OpenWith}
      />

      {app.hostname ? <Action.OpenInBrowser title="Open Hostname" url={`https://${app.hostname}`} /> : null}
      {app.hostname ? (
        <Action.CopyToClipboard title="Copy Hostname" content={app.hostname} shortcut={Keyboard.Shortcut.Common.Copy} />
      ) : null}

      {ips.length === 1 ? (
        <Action.CopyToClipboard title="Copy IP" content={ips[0]} shortcut={Keyboard.Shortcut.Common.CopyPath} />
      ) : null}

      {app.currentRelease ? (
        <Action.CopyToClipboard title="Copy Release Image" content={app.currentRelease.imageRef} />
      ) : null}

      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />

      {app.state === "DEPLOYED" && (app.machines?.nodes?.length ?? 0) > 0 ? (
        <Action
          title="Restart Application"
          icon={Icon.RotateClockwise}
          style={Action.Style.Destructive}
          onAction={async () => {
            const machines = app.machines?.nodes ?? [];
            const toast = await showToast({
              title: app.name,
              message: "Preparing to restart...",
              style: Toast.Style.Animated,
            });
            try {
              for (let i = 0; i < machines.length; i++) {
                toast.message = `Restarting machine ${i + 1}/${machines.length}`;
                await restartMachine(app.name, machines[i].id);
              }
              toast.message = "All machines restarted";
              toast.style = Toast.Style.Success;
              revalidate();
            } catch (error) {
              logger.error("Restart failed", error);
              toast.message = "Failed to restart a machine";
              toast.style = Toast.Style.Failure;
            }
          }}
        />
      ) : null}

      <Action
        title="Install Fly MCP for Claude"
        icon={Icon.Plug}
        onAction={async () => {
          const binaryPath = findFlyBinary();
          if (!binaryPath) {
            await showToast({
              style: Toast.Style.Failure,
              title: "flyctl not found",
              message: "Install the Fly CLI first",
            });
            return;
          }
          try {
            installFlyMcp(binaryPath);
            await showToast({ style: Toast.Style.Success, title: "Fly MCP installed for Claude" });
          } catch (error) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Failed to install MCP",
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }}
      />
    </ActionPanel>
  );
}
