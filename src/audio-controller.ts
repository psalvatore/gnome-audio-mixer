import { AudioStateStore } from "./audio-state.js";
import { subscribeToAudioEvents } from "./events.js";
import { getSinkInputs, getSinks } from "./pactl.js";
import { createRefreshCoordinator } from "./refresh-coordinator.js";
import type { AudioState } from "./types.js";

export interface AudioController {
  store: AudioStateStore;
  refresh: () => void;
  start: () => void;
  stop: () => void;
}

type SubscribeToEvents = (onAudioChange: () => void) => () => void;
type FetchAudioState = () => Promise<AudioState>;

export function createAudioController(
  subscribe: SubscribeToEvents = subscribeToAudioEvents,
  fetchState: FetchAudioState = fetchAudioState,
): AudioController {
  const store = new AudioStateStore();

  async function refreshAudioState() {
    const audioState = await fetchState();

    store.setState(audioState);
  }

  const refresh = createRefreshCoordinator(refreshAudioState);

  let started = false;
  let stopListening: (() => void) | undefined;

  function start(): void {
    if (started) {
      return;
    }

    started = true;
    stopListening = subscribe(refresh);
    refresh();
  }

  function stop(): void {
    if (!started) {
      return;
    }

    stopListening?.();
    stopListening = undefined;
    started = false;
  }

  return {
    store,
    refresh,
    start,
    stop,
  };
}

export async function fetchAudioState(): Promise<AudioState> {
  const [sinks, sinkInputs] = await Promise.all([getSinks(), getSinkInputs()]);

  return { sinks, sinkInputs };
}
