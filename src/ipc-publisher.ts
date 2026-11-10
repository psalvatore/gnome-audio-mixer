import type { AudioController } from "./audio-controller.js";
import { serializeAudioMessage, type AudioMessage } from "./ipc-protocol.js";

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
