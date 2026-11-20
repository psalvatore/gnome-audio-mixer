export class VolumeCoordinator {
  private activeSinks = new Set<number>();
  private pendingVolumes = new Map<number, number>();

  async requestVolumeChange(
    sinkIndex: number,
    volume: number,
    setSinkVolume: (sinkIndex: number, volume: number) => Promise<void>,
  ): Promise<void> {
    this.pendingVolumes.set(sinkIndex, volume);

    if (this.activeSinks.has(sinkIndex)) {
      return;
    }

    this.activeSinks.add(sinkIndex);

    try {
      while (this.pendingVolumes.has(sinkIndex)) {
        const nextVolume = this.pendingVolumes.get(sinkIndex)!;
        this.pendingVolumes.delete(sinkIndex);

        try {
          await setSinkVolume(sinkIndex, nextVolume);
        } catch (error) {
          console.error("Failed to set sink volume:", error);
        }
      }
    } finally {
      this.activeSinks.delete(sinkIndex);
    }
  }
}
