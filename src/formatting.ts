import type { AudioSink, AudioSinkInput } from "./types.js";

export function formatSink(sink: AudioSink): string {
  return `${sink.description} (${sink.volume}%) [${sink.mute ? "Muted" : "Unmuted"}]`;
}

export function formatSinkList(sinks: AudioSink[]): string {
  if (sinks.length > 0) {
    const formatted = sinks.map(
      (sink, index) => `${index + 1}. ${formatSink(sink)}`,
    );

    return formatted.join("\n");
  }

  return "No audio sinks found.";
}

export function formatSinkInput(sink: AudioSinkInput): string {
  return `${sink.applicationName} (Stream ${sink.index}) - ${sink.volume}% [${sink.mute ? "Muted" : "Unmuted"}]`;
}

export function formatSinkInputList(sinkInputs: AudioSinkInput[]): string {
  if (sinkInputs.length > 0) {
    const formatted = sinkInputs.map(
      (sinkInput, index) => `${index + 1}. ${formatSinkInput(sinkInput)}`,
    );

    return formatted.join("\n");
  }

  return "No application audio streams found.";
}
