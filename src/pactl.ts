import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type {
  AudioSink,
  PactlVolumeProp,
  CommandRunner,
  AudioSinkInput,
  PactlSinkInput,
} from "./types.js";
import {
  isPactlSink,
  isValidVolume,
  isValidSinkName,
  isPactlSinkInput,
} from "./validation.js";
import { VOLUME_LIMIT } from "./config.js";

const execFileAsync = promisify(execFile);

const defaultRunner: CommandRunner = async (command, args) => {
  const result = await execFileAsync(command, args);

  return result.stdout;
};

export async function getSinks(
  runner: CommandRunner = defaultRunner,
): Promise<AudioSink[]> {
  const result = await runner("pactl", ["-f", "json", "list", "sinks"]);

  const pactlSinks: unknown = JSON.parse(result);

  if (!Array.isArray(pactlSinks)) {
    throw new Error("Expected pactl to return an array.");
  }

  if (!pactlSinks.every(isPactlSink)) {
    throw new Error("pactl returned an invalid sink.");
  }

  return pactlSinks.map((sink) => {
    return {
      index: sink.index,
      name: sink.name,
      description: sink.description,
      state: sink.state,
      mute: sink.mute,
      volume: getMaxVolumeFromChannels(sink.volume),
    };
  });
}

export async function setSinkVolume(
  name: string,
  volume: number,
  runner: CommandRunner = defaultRunner,
): Promise<void> {
  if (!isValidSinkName(name)) {
    throw new Error("Sink name cannot be empty.");
  }

  if (!isValidVolume(volume)) {
    throw new RangeError(`Volume must be between 0 and ${VOLUME_LIMIT}.`);
  }

  await runner("pactl", ["set-sink-volume", name, `${volume}%`]);
}

export async function setSinkMute(
  name: string,
  muted: boolean,
  runner: CommandRunner = defaultRunner,
): Promise<void> {
  if (!isValidSinkName(name)) {
    throw new Error("Sink name cannot be empty.");
  }

  const muteValue = muted ? "1" : "0";
  await runner("pactl", ["set-sink-mute", name, muteValue]);
}

function getMaxVolumeFromChannels(value: PactlVolumeProp): number {
  const channelArray = Object.values(value);

  const volumePercentArray = channelArray.map((channel) => {
    return parseInt(channel.value_percent, 10);
  });

  return Math.max(...volumePercentArray);
}

export async function getSinkInputs(
  runner: CommandRunner = defaultRunner,
): Promise<AudioSinkInput[]> {
  const result = await runner("pactl", ["-f", "json", "list", "sink-inputs"]);

  const pactlSinkInputs: unknown = JSON.parse(result);

  if (!Array.isArray(pactlSinkInputs)) {
    throw new Error("Expected pactl to return an array.");
  }

  if (!pactlSinkInputs.every(isPactlSinkInput)) {
    throw new Error("pactl returned an invalid sink input.");
  }

  return pactlSinkInputs.map((sinkInput) => {
    return {
      index: sinkInput.index,
      sink: sinkInput.sink,
      applicationName:
        sinkInput.properties["application.name"] ?? "Unknown Application",
      iconName: sinkInput.properties["application.icon_name"] ?? "",
      mediaName: sinkInput.properties["media.name"] ?? "Unknown Stream",
      mute: sinkInput.mute,
      volume: getMaxVolumeFromChannels(sinkInput.volume),
    };
  });
}

export async function setSinkInputVolume(
  index: number,
  volume: number,
  runner: CommandRunner = defaultRunner,
): Promise<void> {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("Sink Input index must be a non-negative integer.");
  }

  if (!isValidVolume(volume)) {
    throw new RangeError(`Volume must be between 0 and ${VOLUME_LIMIT}.`);
  }

  await runner("pactl", ["set-sink-input-volume", `${index}`, `${volume}%`]);
}

export async function setSinkInputMute(
  index: number,
  muted: boolean,
  runner: CommandRunner = defaultRunner,
): Promise<void> {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("Sink Input index must be a non-negative integer.");
  }

  const muteValue = muted ? "1" : "0";
  await runner("pactl", ["set-sink-input-mute", `${index}`, muteValue]);
}
