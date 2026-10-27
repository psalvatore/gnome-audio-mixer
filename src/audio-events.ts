import type { AudioEvent } from "./types.js";
import {
  isValidAudioEventAction,
  isValidAudioEventResource,
} from "./validation.js";

export function parseAudioEvent(line: string): AudioEvent | null {
  const result = line.match(/^Event\s+'([^']+)'\s+on\s+([a-z-]+)\s+#(\d+)$/);

  if (result === null) {
    return null;
  }

  const action = result[1];
  const resource = result[2];
  const index = Number(result[3]);

  if (
    !isValidAudioEventAction(action) ||
    !isValidAudioEventResource(resource) ||
    !Number.isSafeInteger(index)
  ) {
    return null;
  }

  return {
    action: action,
    resource: resource,
    index: index,
  };
}
