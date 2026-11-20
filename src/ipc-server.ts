import { createAudioController } from "./audio-controller.js";
import { createIpcCommandReceiver } from "./ipc-command-receiver.js";
import { createIpcPublisher } from "./ipc-publisher.js";
import { VolumeCoordinator } from "./volume-coordinator.js";

const controller = createAudioController();
const stopPublishing = createIpcPublisher(controller, (message) => {
  process.stdout.write(message);
});
const volumeCoordinator = new VolumeCoordinator();

controller.start();

const receive = createIpcCommandReceiver((command) => {
  console.error("Command recieved: ", command);

  switch (command.type) {
    case "set-sink-volume":
      void volumeCoordinator.requestVolumeChange(
        command.sinkIndex,
        command.volume,
        controller.setSinkVolume,
      );
      break;

    case "set-sink-mute":
      void controller.setSinkMute(command.sinkIndex, command.muted);
      break;

    case "set-sink-input-volume":
      void volumeCoordinator.requestVolumeChange(
        command.sinkIndex,
        command.volume,
        controller.setSinkInputVolume,
      );
      break;

    case "set-sink-input-mute":
      void controller.setSinkInputMute(command.sinkIndex, command.muted);
      break;
  }
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
