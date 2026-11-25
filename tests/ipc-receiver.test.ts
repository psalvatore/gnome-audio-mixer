import assert from "node:assert/strict";
import test from "node:test";
import { createIpcReceiver } from "../src/ipc-receiver.js";
import { serializeAudioMessage } from "../src/ipc-protocol.js";
import type { AudioMessage } from "../src/types.js";

test("Receives a complete message in one chunk", () => {
  const receivedMessages: AudioMessage[] = [];

  const receive = createIpcReceiver((message) => {
    receivedMessages.push(message);
  });

  const message: AudioMessage = {
    type: "state",
    payload: {
      sinks: [],
      sinkInputs: [],
    },
  };

  receive(serializeAudioMessage(message));

  assert.deepEqual(receivedMessages, [message]);
});

test("Buffers messages split across multiple chunks", () => {
  const receivedMessages: AudioMessage[] = [];

  const receive = createIpcReceiver((message) => {
    receivedMessages.push(message);
  });

  const message: AudioMessage = {
    type: "state",
    payload: {
      sinks: [],
      sinkInputs: [],
    },
  };

  const serialized = serializeAudioMessage(message);
  const midpoint = Math.floor(serialized.length / 2);

  receive(serialized.slice(0, midpoint));

  assert.equal(receivedMessages.length, 0);

  receive(serialized.slice(midpoint));

  assert.deepEqual(receivedMessages, [message]);
});

test("Receives multiple messages in a single chunk", () => {
  const receivedMessages: AudioMessage[] = [];

  const receive = createIpcReceiver((message) => {
    receivedMessages.push(message);
  });

  const firstMessage: AudioMessage = {
    type: "state",
    payload: {
      sinks: [],
      sinkInputs: [],
    },
  };

  const secondMessage: AudioMessage = {
    type: "state",
    payload: {
      sinks: [],
      sinkInputs: [],
    },
  };

  receive(
    serializeAudioMessage(firstMessage) + serializeAudioMessage(secondMessage),
  );

  assert.deepEqual(receivedMessages, [firstMessage, secondMessage]);
});
