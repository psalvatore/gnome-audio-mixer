import type {
  SinkState,
  PactlSink,
  PactlVolumeChannel,
  PactlVolumeProp,
  PactlSinkInput,
  AudioEventAction,
  AudioEventResource,
  AudioMessage,
  AudioSink,
  AudioSinkInput,
  AudioCommand,
} from "./types.js";
import { VOLUME_LIMIT } from "./config.js";

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
      typeof value.mute === "boolean" &&
      "volume" in value &&
      typeof value.volume === "number"
    );
  }

  return false;
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

export function isAudioSinkInput(value: unknown): value is AudioSinkInput {
  if (typeof value === "object" && value !== null) {
    return (
      "index" in value &&
      typeof value.index === "number" &&
      "sink" in value &&
      typeof value.sink === "number" &&
      "applicationName" in value &&
      typeof value.applicationName === "string" &&
      "iconName" in value &&
      typeof value.iconName === "string" &&
      "mediaName" in value &&
      typeof value.mediaName === "string" &&
      "mute" in value &&
      typeof value.mute === "boolean" &&
      "volume" in value &&
      typeof value.volume === "number"
    );
  }

  return false;
}

export function isPactlSinkInput(value: unknown): value is PactlSinkInput {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return (
      "index" in value &&
      typeof value.index === "number" &&
      "sink" in value &&
      typeof value.sink === "number" &&
      "mute" in value &&
      typeof value.mute === "boolean" &&
      "volume" in value &&
      isPactlVolumeProp(value.volume) &&
      "properties" in value &&
      typeof value.properties === "object" &&
      value.properties !== null &&
      !Array.isArray(value.properties) &&
      Object.values(value.properties).every(
        (property) => typeof property === "string",
      )
    );
  }

  return false;
}

export function isValidVolume(volume: number): boolean {
  return Number.isFinite(volume) && volume >= 0 && volume <= VOLUME_LIMIT;
}

export function isValidSinkName(name: string): boolean {
  return name.trim().length > 0;
}

export function isValidMenuSelection(
  selection: string,
  itemCount: number,
): boolean {
  const parsedSelection = Number(selection);

  return (
    /^\d+$/.test(selection) &&
    parsedSelection >= 1 &&
    parsedSelection <= itemCount
  );
}

export function getSelectedItem<T>(items: T[], selection: string): T | null {
  if (!isValidMenuSelection(selection, items.length)) {
    return null;
  }

  return items[Number(selection) - 1] ?? null;
}

export function isValidAudioEventAction(
  value: string | undefined,
): value is AudioEventAction {
  return value === "new" || value === "change" || value === "remove";
}

export function isValidAudioEventResource(
  value: string | undefined,
): value is AudioEventResource {
  return value === "sink" || value === "sink-input";
}

export function isValidAudioMessage(value: unknown): value is AudioMessage {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return (
      "type" in value &&
      value.type === "state" &&
      "payload" in value &&
      typeof value.payload === "object" &&
      value.payload !== null &&
      "sinks" in value.payload &&
      Array.isArray(value.payload.sinks) &&
      value.payload.sinks.every(isAudioSink) &&
      "sinkInputs" in value.payload &&
      Array.isArray(value.payload.sinkInputs) &&
      value.payload.sinkInputs.every(isAudioSinkInput)
    );
  }

  return false;
}

export function isValidAudioCommand(value: unknown): value is AudioCommand {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return (
      "type" in value &&
      value.type === "set-sink-volume" &&
      "sinkIndex" in value &&
      typeof value.sinkIndex === "number" &&
      "volume" in value &&
      typeof value.volume === "number"
    );
  }

  return false;
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
