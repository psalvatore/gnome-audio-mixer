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

function handleStdinData(chunk: Buffer): void {
  receive(chunk.toString("utf8"));
}

process.stdin.on("data", handleStdinData);

process.on("SIGINT", () => {
  stopPublishing();
  controller.stop();

  process.stdin.off("data", handleStdinData);
  process.stdin.pause();
});
