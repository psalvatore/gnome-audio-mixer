import type { AudioController } from "./audio-controller.js";
import { serializeAudioMessage } from "./ipc-protocol.js";
import type { AudioMessage } from "./types.js";

export function createIpcPublisher(
  controller: AudioController,
  write: (message: string) => void,
): () => void {
  return controller.store.subscribe((state) => {
    const message: AudioMessage = {
      type: "state",
      payload: state,
    };

    write(serializeAudioMessage(message));
  });
}
