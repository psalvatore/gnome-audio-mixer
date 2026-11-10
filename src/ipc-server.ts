import { createAudioController } from "./audio-controller.js";
import { createIpcPublisher } from "./ipc-publisher.js";

const controller = createAudioController();
const stopPublishing = createIpcPublisher(controller, (message) => {
  process.stdout.write(message);
});

controller.start();

process.on("SIGINT", () => {
  stopPublishing();
  controller.stop();
});
