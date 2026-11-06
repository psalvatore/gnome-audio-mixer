import assert from "node:assert/strict";
import test from "node:test";
import { createAudioController } from "../src/audio-controller.js";
import { createFakeSink } from "./helpers.js";

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
