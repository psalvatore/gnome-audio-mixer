import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AudioSink, PactlVolumeProp } from "./types.js";
import { isPactlSink } from "./validation.js";

const execFileAsync = promisify(execFile);

export async function getSinks(): Promise<AudioSink[]> {
  const result = await execFileAsync("pactl", ["-f", "json", "list", "sinks"]);

  const pactlSinks: unknown = JSON.parse(result.stdout);

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

function getMaxVolumeFromChannels(value: PactlVolumeProp): number {
  const channelArray = Object.values(value);

  const volumePercentArray = channelArray.map((channel) => {
    return parseInt(channel.value_percent, 10);
  });

  return Math.max(...volumePercentArray);
}
