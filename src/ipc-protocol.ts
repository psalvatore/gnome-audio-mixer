import type { AudioState } from "./types.js";

export type AudioMessage = {
  type: "state";
  payload: AudioState;
};

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

  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }

  if (!("type" in parsed) || parsed.type !== "state") {
    return null;
  }

  if (
    !("payload" in parsed) ||
    typeof parsed.payload !== "object" ||
    parsed.payload === null
  ) {
    return null;
  }

  if (!("sinks" in parsed.payload) || !Array.isArray(parsed.payload.sinks)) {
    return null;
  }

  if (
    !("sinkInputs" in parsed.payload) ||
    !Array.isArray(parsed.payload.sinkInputs)
  ) {
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
