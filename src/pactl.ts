import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AudioSink, PactlVolumeProp, CommandRunner } from "./types.js";
import { isPactlSink, isValidVolume, isValidSinkName } from "./validation.js";
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
