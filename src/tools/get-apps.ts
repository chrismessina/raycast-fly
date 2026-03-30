import { fetchApplications } from "../api/graphql";

type Input = {
  /**
   * Optional organization name to filter apps by
   */
  orgName?: string;
};

export default async function (input: Input) {
  const apps = await fetchApplications();
  const filtered = input.orgName
    ? apps.filter((a) => a.organization.name === input.orgName)
    : apps;

  return filtered.map((a) => ({
    name: a.name,
    state: a.state,
    hostname: a.hostname,
    organization: a.organization.name,
    machineCount: a.machines?.nodes?.length ?? 0,
    regions: a.regions?.map((r) => r.code) ?? [],
  }));
}
