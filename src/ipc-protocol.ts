import type { AudioMessage, AudioState } from "./types.js";
import { isValidAudioMessage } from "./validation.js";

export function serializeAudioMessage(message: AudioMessage): string {
  return JSON.stringify(message) + "\n";
}

export function parseAudioMessage(input: string): AudioMessage | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }

  if (!isValidAudioMessage(parsed)) {
    return null;
  }

  return {
    type: "state",
    payload: {
      sinks: parsed.payload.sinks,
      sinkInputs: parsed.payload.sinkInputs,
    },
  };
}
