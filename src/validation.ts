import type {
  SinkState,
  PactlSink,
  PactlVolumeChannel,
  PactlVolumeProp,
} from "./types.js";
import { VOLUME_LIMIT } from "./config.js";

export function isSinkState(state: unknown): state is SinkState {
  return state === "RUNNING" || state === "IDLE" || state === "SUSPENDED";
}

export function isPactlSink(value: unknown): value is PactlSink {
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
      typeof value.mute === "boolean" &&
      "volume" in value &&
      isPactlVolumeProp(value.volume)
    );
  }

  return false;
}

export function isValidVolume(volume: number): boolean {
  return Number.isFinite(volume) && volume >= 0 && volume <= VOLUME_LIMIT;
}

function isPactlVolumeProp(value: unknown): value is PactlVolumeProp {
  if (typeof value === "object" && value !== null) {
    const valuesArray = Object.values(value);

    return valuesArray.length > 0 && valuesArray.every(isPactlVolumeChannel);
  }

  return false;
}

function isPactlVolumeChannel(value: unknown): value is PactlVolumeChannel {
  if (typeof value === "object" && value !== null) {
    return (
      "value" in value &&
      typeof value.value === "number" &&
      "value_percent" in value &&
      typeof value.value_percent === "string" &&
      /^\d+%$/.test(value.value_percent) &&
      "db" in value &&
      typeof value.db === "string"
    );
  }

  return false;
}
