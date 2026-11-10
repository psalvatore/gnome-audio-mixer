import { parseAudioMessage, type AudioMessage } from "./ipc-protocol.js";
import { LineBuffer } from "./line-buffer.js";

export function createIpcReceiver(
  onMessage: (message: AudioMessage) => void,
): (chunk: string) => void {
  const parser = new LineBuffer();

  return (chunk) => {
    const completeLines = parser.push(chunk);

    for (const line of completeLines) {
      const parsed = parseAudioMessage(line);

      if (parsed !== null) {
        onMessage(parsed);
      }
    }
  };
}
