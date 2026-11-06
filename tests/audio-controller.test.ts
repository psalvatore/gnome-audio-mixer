import assert from "node:assert/strict";
import test from "node:test";
import { createAudioController } from "../src/audio-controller.js";
import { createFakeSink } from "./helpers.js";

function createTestController() {
  const calls: string[] = [];

  const fakeSubscribe = (_onAudioChange: () => void) => () => {};

  const fakeFetchState = async () => ({
    sinks: [],
    sinkInputs: [],
  });

  const fakeControls = {
    setSinkVolume: async (name: string, volume: number) => {
      calls.push(`volume:${name}:${volume}`);
    },
    setSinkMute: async (name: string, muted: boolean) => {
      calls.push(`mute:${name}:${muted}`);
    },
    setSinkInputVolume: async (index: number, volume: number) => {
      calls.push(`input-volume:${index}:${volume}`);
    },
    setSinkInputMute: async (index: number, muted: boolean) => {
      calls.push(`input-mute:${index}:${muted}`);
    },
  };

  const controller = createAudioController(
    fakeSubscribe,
    fakeFetchState,
    fakeControls,
  );

  return { controller, calls };
}

test("start() does not create duplicate subscriptions", () => {
  let subscriptionCount = 0;

  const fakeSubscribe = (_onAudioChange: () => void) => {
    subscriptionCount++;

    return () => {};
  };

  const fakeFetchAudioState = async () => ({
    sinks: [],
    sinkInputs: [],
  });

  const controller = createAudioController(fakeSubscribe, fakeFetchAudioState);

  controller.start();
  controller.start();

  assert.equal(subscriptionCount, 1);

  controller.stop();
});

test("stop() is idempotent", () => {
  let cleanupCount = 0;

  const fakeSubscribe = (_onAudioChange: () => void) => {
    return () => {
      cleanupCount++;
    };
  };

  const fakeFetchAudioState = async () => ({
    sinks: [],
    sinkInputs: [],
  });

  const controller = createAudioController(fakeSubscribe, fakeFetchAudioState);

  controller.start();
  controller.stop();
  controller.stop();

  assert.equal(cleanupCount, 1);
});

test("start() works after stop()", () => {
  let subscriptionCount = 0;

  const fakeSubscribe = (_onAudioChange: () => void) => {
    subscriptionCount++;

    return () => {};
  };

  const fakeFetchAudioState = async () => ({
    sinks: [],
    sinkInputs: [],
  });

  const controller = createAudioController(fakeSubscribe, fakeFetchAudioState);

  controller.start();
  controller.stop();
  controller.start();

  assert.equal(subscriptionCount, 2);

  controller.stop();
});

test("refresh() updates the audio state store", { timeout: 2000 }, async () => {
  const fakeSink = createFakeSink();

  const fakeSubscribe = (_onAudioChange: () => void) => {
    return () => {};
  };

  const fakeFetchAudioState = async () => ({
    sinks: [fakeSink],
    sinkInputs: [],
  });

  const controller = createAudioController(fakeSubscribe, fakeFetchAudioState);

  let unsubscribe = () => {};

  const stateUpdated = new Promise<void>((resolve) => {
    unsubscribe = controller.store.subscribe(() => {
      resolve();
    });
  });

  controller.refresh();

  await stateUpdated;
  unsubscribe();

  assert.deepEqual(controller.store.getState().sinks, [fakeSink]);
});

test("setSinkVolume() delegates to audio controls", async () => {
  const { controller, calls } = createTestController();

  await controller.setSinkVolume("alsa_output.test", 75);

  assert.deepEqual(calls, ["volume:alsa_output.test:75"]);
});

test("setSinkMute() delegates to audio controls", async () => {
  const { controller, calls } = createTestController();

  await controller.setSinkMute("alsa_output.test", true);

  assert.deepEqual(calls, ["mute:alsa_output.test:true"]);
});

test("setSinkInputVolume() delegates to audio controls", async () => {
  const { controller, calls } = createTestController();

  await controller.setSinkInputVolume(42, 60);

  assert.deepEqual(calls, ["input-volume:42:60"]);
});

test("setSinkInputMute() delegates to audio controls", async () => {
  const { controller, calls } = createTestController();

  await controller.setSinkInputMute(42, false);

  assert.deepEqual(calls, ["input-mute:42:false"]);
});

test("controller propagates audio control errors", async () => {
  const fakeSink = createFakeSink();

  const fakeSubscribe = (_onAudioChange: () => void) => {
    return () => {};
  };

  const fakeFetchAudioState = async () => ({
    sinks: [fakeSink],
    sinkInputs: [],
  });

  const calls: string[] = [];

  const fakeControls = {
    setSinkVolume: async () => {
      throw new Error("pactl failed");
    },
    setSinkMute: async (name: string, muted: boolean) => {
      calls.push(`mute:${name}:${muted}`);
    },
    setSinkInputVolume: async (index: number, volume: number) => {
      calls.push(`input-volume:${index}:${volume}`);
    },
    setSinkInputMute: async (index: number, muted: boolean) => {
      calls.push(`input-mute:${index}:${muted}`);
    },
  };

  const controller = createAudioController(
    fakeSubscribe,
    fakeFetchAudioState,
    fakeControls,
  );

  await assert.rejects(
    controller.setSinkVolume("alsa_output.test", 75),
    /pactl failed/,
  );
});
