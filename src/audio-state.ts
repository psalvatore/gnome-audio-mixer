import { getSinkChanges, getSinkInputChanges } from "./audio-diff.js";
import type { AudioState, AudioStateChanges } from "./types.js";

export class AudioStateStore {
  private state: AudioState = { sinks: [], sinkInputs: [] };
  private listeners = new Set<
    (state: AudioState, changes: AudioStateChanges) => void
  >();

  getState(): AudioState {
    return structuredClone(this.state);
  }

  setState(state: AudioState): void {
    const changes: AudioStateChanges = {
      sinks: getSinkChanges(this.state.sinks, state.sinks),
      sinkInputs: getSinkInputChanges(this.state.sinkInputs, state.sinkInputs),
    };

    if (JSON.stringify(this.state) === JSON.stringify(state)) {
      return;
    }

    this.state = structuredClone(state);

    for (const listener of this.listeners) {
      listener(this.getState(), structuredClone(changes));
    }
  }

  clear(): void {
    this.setState({ sinks: [], sinkInputs: [] });
  }

  subscribe(
    listener: (state: AudioState, changes: AudioStateChanges) => void,
  ): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
