import { AudioStateStore } from "./audio-state.js";
import { subscribeToAudioEvents } from "./events.js";
import {
  getSinkInputs,
  getSinks,
  setSinkVolume as pactlSetSinkVolume,
  setSinkMute as pactlSetSinkMute,
  setSinkInputVolume as pactlSetSinkInputVolume,
  setSinkInputMute as pactlSetSinkInputMute,
} from "./pactl.js";
import { createRefreshCoordinator } from "./refresh-coordinator.js";
import type { AudioState } from "./types.js";

export interface AudioController {
  store: AudioStateStore;
  refresh: () => void;
  start: () => void;
  stop: () => void;
  setSinkVolume: (name: string, volume: number) => Promise<void>;
  setSinkMute: (name: string, muted: boolean) => Promise<void>;
  setSinkInputVolume: (index: number, volume: number) => Promise<void>;
  setSinkInputMute: (index: number, muted: boolean) => Promise<void>;
}

interface AudioControls {
  setSinkVolume: (name: string, volume: number) => Promise<void>;
  setSinkMute: (name: string, muted: boolean) => Promise<void>;
  setSinkInputVolume: (index: number, volume: number) => Promise<void>;
  setSinkInputMute: (index: number, muted: boolean) => Promise<void>;
}

type SubscribeToEvents = (onAudioChange: () => void) => () => void;
type FetchAudioState = () => Promise<AudioState>;

export function createAudioController(
  subscribe: SubscribeToEvents = subscribeToAudioEvents,
  fetchState: FetchAudioState = fetchAudioState,
  controls: AudioControls = {
    setSinkVolume: pactlSetSinkVolume,
    setSinkMute: pactlSetSinkMute,
    setSinkInputVolume: pactlSetSinkInputVolume,
    setSinkInputMute: pactlSetSinkInputMute,
  },
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

  function setSinkVolume(name: string, volume: number): Promise<void> {
    return controls.setSinkVolume(name, volume);
  }

  function setSinkMute(name: string, muted: boolean): Promise<void> {
    return controls.setSinkMute(name, muted);
  }

  function setSinkInputVolume(index: number, volume: number): Promise<void> {
    return controls.setSinkInputVolume(index, volume);
  }

  function setSinkInputMute(index: number, muted: boolean): Promise<void> {
    return controls.setSinkInputMute(index, muted);
  }

  return {
    store,
    refresh,
    start,
    stop,
    setSinkVolume,
    setSinkMute,
    setSinkInputVolume,
    setSinkInputMute,
  };
}

export async function fetchAudioState(): Promise<AudioState> {
  const [sinks, sinkInputs] = await Promise.all([getSinks(), getSinkInputs()]);

  return { sinks, sinkInputs };
}
