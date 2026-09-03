import { Clipboard, Toast, showToast } from "@raycast/api";

export async function showErrorToast(title: string, error: unknown): Promise<Toast> {
  const message = error instanceof Error ? error.message : "Unknown error";
  return showToast({
    style: Toast.Style.Failure,
    title,
    message,
    primaryAction: {
      title: "Copy Error",
      onAction: async () => {
        await Clipboard.copy(message);
      },
    },
  });
}
