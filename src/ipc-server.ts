import { createAudioController } from "./audio-controller.js";
import { createIpcCommandReceiver } from "./ipc-command-receiver.js";
import { createIpcPublisher } from "./ipc-publisher.js";

const controller = createAudioController();
const stopPublishing = createIpcPublisher(controller, (message) => {
  process.stdout.write(message);
});

controller.start();

const receive = createIpcCommandReceiver((command) => {
  console.error("Command recieved: ", command);
});

process.stdin.on("data", (chunk: Buffer) => {
  receive(chunk.toString("utf8"));
});

process.on("SIGINT", () => {
  stopPublishing();
  controller.stop();
});
