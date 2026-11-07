import { createAudioController } from "./audio-controller.js";
import type { AudioController } from "./audio-controller.js";
import type { AudioSink, AudioState } from "./types.js";

function waitForMusicSink(controller: AudioController): Promise<AudioSink> {
  return new Promise((resolve, reject) => {
    const existingSink = controller.store
      .getState()
      .sinks.find((sink) => sink.description === "Music");

    if (existingSink) {
      resolve(existingSink);
      return;
    }

    let unsubscribe = () => {};

    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Timed out waiting for Music sink"));
    }, 2000);

    unsubscribe = controller.store.subscribe((state) => {
      const musicSink = state.sinks.find(
        (sink) => sink.description === "Music",
      );

      if (musicSink) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(musicSink);
      }
    });
  });
}

function waitForSinkVolume(
  controller: AudioController,
  sinkName: string,
  expectedVolume: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Signal was aborted"));
      return;
    }

    const hasExpectedVolume = (state: AudioState): boolean =>
      state.sinks.some(
        (sink) => sink.name === sinkName && sink.volume === expectedVolume,
      );

    if (hasExpectedVolume(controller.store.getState())) {
      resolve();
      return;
    }

    let unsubscribe = () => {};

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for volume ${expectedVolume}%`));
    }, 2000);

    function onAbort() {
      cleanup();
      reject(new Error("Volume wait cancelled"));
    }

    function cleanup() {
      clearTimeout(timeout);
      unsubscribe();
      signal.removeEventListener("abort", onAbort);
    }

    unsubscribe = controller.store.subscribe((state) => {
      if (hasExpectedVolume(state)) {
        cleanup();
        resolve();
      }
    });

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

const abortController = new AbortController();
const controller = createAudioController();

let originalVolume: number | undefined;
let musicSinkName: string | undefined;

try {
  controller.start();

  const musicSink = await waitForMusicSink(controller);

  musicSinkName = musicSink.name;
  originalVolume = musicSink.volume;

  console.log(`Original volume: ${originalVolume}%`);

  const volumeUpdated = waitForSinkVolume(
    controller,
    musicSinkName,
    50,
    abortController.signal,
  );

  void volumeUpdated.catch(() => {});

  await controller.setSinkVolume(musicSinkName, 50);
  await volumeUpdated;

  console.log("Verified: Music volume updated to 50%");
} finally {
  abortController.abort();

  try {
    if (musicSinkName !== undefined && originalVolume !== undefined) {
      await controller.setSinkVolume(musicSinkName, originalVolume);
      console.log(`Restored Music volume to ${originalVolume}%`);
    }
  } finally {
    controller.stop();
  }
}
