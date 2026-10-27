import { spawn } from "node:child_process";
import { LineBuffer } from "./line-buffer.js";
import { parseAudioEvent } from "./audio-events.js";
import { debounce } from "./debounce.js";

export function subscribeToAudioEvents(onAudioChange: () => void): void {
  const child = spawn("pactl", ["subscribe"]);
  const parser = new LineBuffer();
  const debouncedOnAudioChange = debounce(onAudioChange, 200);

  child.stdout.on("data", (chunk) => {
    const completeLines = parser.push(chunk);
    for (const line of completeLines) {
      const audioEvent = parseAudioEvent(line);
      if (audioEvent) {
        debouncedOnAudioChange();
      }
    }
  });

  child.on("error", (error) => {
    console.error("Failed to start pactl:", error.message);
  });
}
