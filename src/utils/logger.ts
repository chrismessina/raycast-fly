import { createLogger } from "@chrismessina/raycast-logger";
import { getPreferenceValues } from "@raycast/api";

function isVerbose(): boolean {
  try {
    const { verboseLogging } = getPreferenceValues<{ verboseLogging?: boolean }>();
    return verboseLogging === true;
  } catch {
    return false;
  }
}

export const logger = createLogger({
  name: "fly",
  verbose: isVerbose(),
});
