import type { AudioSink } from "./types.js";

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
