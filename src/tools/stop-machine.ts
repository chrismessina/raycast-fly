import { Tool } from "@raycast/api";
import { stopMachine } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app
   */
  appName: string;
  /**
   * The machine ID to stop
   */
  machineId: string;
};

export const confirmation: Tool.Confirmation<Input> = (input) => {
  return {
    message: `Stop machine ${input.machineId} in app ${input.appName}?`,
    info: [
      { name: "App", value: input.appName },
      { name: "Machine", value: input.machineId },
    ],
  };
};

export default async function (input: Input) {
  await stopMachine(input.appName, input.machineId);
  return `Machine ${input.machineId} stopped successfully`;
}
