import { Tool } from "@raycast/api";
import { startMachine } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app
   */
  appName: string;
  /**
   * The machine ID to start
   */
  machineId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Start machine ${input.machineId} in app ${input.appName}?`,
    info: [
      { name: "App", value: input.appName },
      { name: "Machine", value: input.machineId },
    ],
  };
};

export default async function (input: Input) {
  await startMachine(input.appName, input.machineId);
  return `Machine ${input.machineId} started successfully`;
}
