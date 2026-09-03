import { Tool, Action } from "@raycast/api";
import { destroyMachine } from "../api/machines";

type Input = {
  /**
   * The name of the Fly.io app
   */
  appName: string;
  /**
   * The machine ID to destroy
   */
  machineId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Destructive,
    message: `Permanently destroy machine ${input.machineId} in app ${input.appName}? This cannot be undone.`,
    info: [
      { name: "App", value: input.appName },
      { name: "Machine", value: input.machineId },
    ],
  };
};

export default async function (input: Input) {
  await destroyMachine(input.appName, input.machineId, true);
  return `Machine ${input.machineId} destroyed`;
}
