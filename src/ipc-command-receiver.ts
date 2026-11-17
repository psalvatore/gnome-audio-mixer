import { parseAudioCommand } from "./ipc-command-protocol.js";
import { LineBuffer } from "./line-buffer.js";
import type { AudioCommand } from "./types.js";

export function createIpcCommandReceiver(
  onCommand: (message: AudioCommand) => void,
): (chunk: string) => void {
  const parser = new LineBuffer();

  return (chunk) => {
    const completeLines = parser.push(chunk);

    for (const line of completeLines) {
      const parsed = parseAudioCommand(line);

      if (parsed !== null) {
        onCommand(parsed);
      }
    }
  };
}
