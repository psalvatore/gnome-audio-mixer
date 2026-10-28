import { startCli } from "./cli.js";
import { subscribeToAudioEvents } from "./events.js";
import { getSinkInputs, getSinks } from "./pactl.js";
import { createRefreshCoordinator } from "./refresh-coordinator.js";
import { AudioStateStore } from "./audio-state.js";

try {
  const refresh = createRefreshCoordinator(refreshAudioState);

  subscribeToAudioEvents(refresh);

  refresh();

  // await startCli();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

const store = new AudioStateStore();

store.subscribe((state) => {
  console.log(
    `Audio state updated!\n` +
      `Sinks: ${state.sinks.length}\n` +
      `Sink inputs: ${state.sinkInputs.length}\n`,
  );
});

async function refreshAudioState() {
  const [sinks, sinkInputs] = await Promise.all([getSinks(), getSinkInputs()]);

  store.setState({ sinks, sinkInputs });
}
