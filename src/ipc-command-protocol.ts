import type { AudioCommand } from "./types.js";
import { isValidAudioCommand } from "./validation.js";

export function serializeAudioCommand(message: AudioCommand): string {
  return JSON.stringify(message) + "\n";
}

export function parseAudioCommand(input: string): AudioCommand | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(input);
  } catch {
    return null;
  }

  if (!isValidAudioCommand(parsed)) {
    return null;
  }

  switch (parsed.type) {
    case "set-sink-volume":
      return {
        type: parsed.type,
        sinkIndex: parsed.sinkIndex,
        volume: parsed.volume,
      };

    case "set-sink-mute":
      return {
        type: parsed.type,
        sinkIndex: parsed.sinkIndex,
        muted: parsed.muted,
      };

    case "set-sink-input-volume":
      return {
        type: parsed.type,
        sinkIndex: parsed.sinkIndex,
        volume: parsed.volume,
      };

    case "set-sink-input-mute":
      return {
        type: parsed.type,
        sinkIndex: parsed.sinkIndex,
        muted: parsed.muted,
      };

    default:
      return null;
  }
}
