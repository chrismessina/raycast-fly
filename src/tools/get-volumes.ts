import { listVolumes } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app to list volumes for
   */
  appName: string;
};

export default async function (input: Input) {
  const volumes = await listVolumes(input.appName);
  return volumes.map((v) => ({
    name: v.name,
    sizeGb: v.sizeGb,
    region: v.region,
    state: v.state,
  }));
}
