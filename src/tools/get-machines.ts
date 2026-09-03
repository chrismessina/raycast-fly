import { listMachines } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app to list machines for
   */
  appName: string;
};

export default async function (input: Input) {
  const machines = await listMachines(input.appName);
  return machines.map((m) => ({
    id: m.id,
    state: m.state,
    region: m.region,
    cpu: `${m.config.guest.cpu_kind} x${m.config.guest.cpus}`,
    memoryMb: m.config.guest.memory_mb,
    image: m.config.image,
    createdAt: m.created_at,
  }));
}
