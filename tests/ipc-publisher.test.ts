import assert from "node:assert/strict";
import test from "node:test";
import { createIpcPublisher } from "../src/ipc-publisher.js";
import { createAudioController } from "../src/audio-controller.js";
import { createFakeSink, createFakeSinkInput } from "./helpers.js";
import { parseAudioMessage } from "../src/ipc-protocol.js";

test("Publishes state changes", () => {
  const messages: string[] = [];

  const write = (message: string) => {
    messages.push(message);
  };

  const controller = createAudioController();

  const stopPublishing = createIpcPublisher(controller, write);

  controller.store.setState({
    sinks: [{ ...createFakeSink(), index: 9999 }],
    sinkInputs: [createFakeSinkInput()],
  });

  assert.deepEqual(messages, [
    JSON.stringify({
      type: "state",
      payload: controller.store.getState(),
    }) + "\n",
  ]);

  stopPublishing();
});

test("Publishes the correct payload", () => {
  const messages: string[] = [];
  const write = (message: string) => {
    messages.push(message);
  };

  const controller = createAudioController();
  const stopPublishing = createIpcPublisher(controller, write);

  const updatedState = {
    sinks: [{ ...createFakeSink(), index: 9999, volume: 75 }],
    sinkInputs: [createFakeSinkInput()],
  };

  controller.store.setState(updatedState);

  assert.equal(messages.length, 1);

  const parsed = parseAudioMessage(messages[0]!);

  assert.deepEqual(parsed, {
    type: "state",
    payload: updatedState,
  });

  stopPublishing();
});

test("Stops publishing after unsubscribe", () => {
  const messages: string[] = [];
  const write = (message: string) => {
    messages.push(message);
  };

  const controller = createAudioController();
  const stopPublishing = createIpcPublisher(controller, write);

  controller.store.setState({
    sinks: [{ ...createFakeSink(), volume: 50 }],
    sinkInputs: [],
  });

  assert.equal(messages.length, 1);

  stopPublishing();

  controller.store.setState({
    sinks: [{ ...createFakeSink(), volume: 75 }],
    sinkInputs: [],
  });

  assert.equal(messages.length, 1);
});
