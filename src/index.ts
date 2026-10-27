import { startCli } from "./cli.js";
import { subscribeToAudioEvents } from "./events.js";
import { getSinkInputs, getSinks } from "./pactl.js";
import { createRefreshCoordinator } from "./refresh-coordinator.js";

try {
  const refresh = createRefreshCoordinator(refreshAudioState);
  subscribeToAudioEvents(refresh);

  refresh();

  // await startCli();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}

async function refreshAudioState() {
  const [sinks, sinkInputs] = await Promise.all([getSinks(), getSinkInputs()]);

  console.log(sinks);
  console.log(sinkInputs);
}
