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

  return {
    type: "set-sink-volume",
    sinkIndex: parsed.sinkIndex,
    volume: parsed.volume,
  };
}
