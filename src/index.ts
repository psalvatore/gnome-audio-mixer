import { createAudioController } from "./audio-controller.js";

try {
  const controller = createAudioController();

  controller.store.subscribe((_state, changes) => {
    logChanges(
      changes.sinks.added,
      (sink) => `Audio device added: ${sink.description}`,
    );

    logChanges(
      changes.sinks.removed,
      (sink) => `Audio device removed: ${sink.description}`,
    );

    logChanges(
      changes.sinks.updated,
      (sink) =>
        `Audio device updated: ${sink.description} (${sink.volume}%, muted: ${sink.mute})`,
    );

    logChanges(
      changes.sinkInputs.added,
      (input) => `Application audio started: ${input.applicationName}`,
    );

    logChanges(
      changes.sinkInputs.removed,
      (input) => `Application audio stopped: ${input.applicationName}`,
    );

    logChanges(
      changes.sinkInputs.updated,
      (input) =>
        `Application audio updated: ${input.applicationName} (${input.volume}%, muted: ${input.mute})`,
    );
  });

  controller.start();
  controller.start();

  setTimeout(() => {
    console.log("waited for 10 seconds then stopped twice");
    controller.stop();
    controller.stop();
  }, 10000);

  setTimeout(() => {
    console.log("waited for 20 seconds then started");
    controller.start();
  }, 20000);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

function logChanges<T>(items: T[], formatMessage: (item: T) => string): void {
  for (const item of items) {
    console.log(formatMessage(item));
  }
}
