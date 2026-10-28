import type { AudioState } from "./types.js";

export class AudioStateStore {
  private state: AudioState = { sinks: [], sinkInputs: [] };
  private listeners = new Set<(state: AudioState) => void>();

  getState(): AudioState {
    return structuredClone(this.state);
  }

  setState(state: AudioState): void {
    if (JSON.stringify(this.state) === JSON.stringify(state)) {
      return;
    }

    this.state = structuredClone(state);

    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  clear(): void {
    this.setState({ sinks: [], sinkInputs: [] });
  }

  subscribe(listener: (state: AudioState) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}
