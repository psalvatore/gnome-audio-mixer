import { startCli } from "./cli.js";
import { subscribeToAudioEvents } from "./events.js";
import { getSinkInputs, getSinks } from "./pactl.js";
import { createRefreshCoordinator } from "./refresh-coordinator.js";
import { AudioStateStore } from "./audio-state.js";

try {
  const refresh = createRefreshCoordinator(refreshAudioState);

  subscribeToAudioEvents(refresh);

  refresh();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

const store = new AudioStateStore();

store.subscribe((_state, changes) => {
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

async function refreshAudioState() {
  const [sinks, sinkInputs] = await Promise.all([getSinks(), getSinkInputs()]);

  store.setState({ sinks, sinkInputs });
}

function logChanges<T>(items: T[], formatMessage: (item: T) => string): void {
  for (const item of items) {
    console.log(formatMessage(item));
  }
}
