import type { SinkState, AudioSink } from "./types.js";

export function isSinkState(state: unknown): state is SinkState {
  return state === "RUNNING" || state === "IDLE" || state === "SUSPENDED";
}

export function isAudioSink(value: unknown): value is AudioSink {
  if (typeof value === "object" && value !== null) {
    return (
      "index" in value &&
      typeof value.index === "number" &&
      "name" in value &&
      typeof value.name === "string" &&
      "description" in value &&
      typeof value.description === "string" &&
      "state" in value &&
      isSinkState(value.state) &&
      "mute" in value &&
      typeof value.mute === "boolean"
    );
  }

  return false;
}
