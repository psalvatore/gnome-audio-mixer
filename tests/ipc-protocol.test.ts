import assert from "node:assert/strict";
import test from "node:test";
import {
  serializeAudioMessage,
  parseAudioMessage,
  type AudioMessage,
} from "../src/ipc-protocol.js";

const message: AudioMessage = {
  type: "state",
  payload: {
    sinks: [],
    sinkInputs: [],
  },
};

test("Serialize a valid state message", () => {
  const serialized = serializeAudioMessage(message);

  assert.equal(serialized, JSON.stringify(message) + "\n");
});

test("Parse a valid state message", () => {
  const serialized =
    '{"type": "state", "payload": {"sinks": [], "sinkInputs": []}}';
  const parsed = parseAudioMessage(serialized);

  assert.deepEqual(parsed, message);
});

test("Parse malformed JSON", () => {
  const serialized =
    '{"type": "state", "payload": {"sinks": [], "sinkInputs": []}';
  const parsed = parseAudioMessage(serialized);

  assert.deepEqual(parsed, null);
});

test("Parse a message with the wrong type", () => {
  const serialized =
    '{"type": "test", "payload": {"sinks": [], "sinkInputs": []}}';
  const parsed = parseAudioMessage(serialized);

  assert.deepEqual(parsed, null);
});

test("Parse a message with a missing payload", () => {
  const serialized = '{"type": "state", "payload": {}}';
  const parsed = parseAudioMessage(serialized);

  assert.deepEqual(parsed, null);
});

test("Parse a message with invalid sinks or sinkInputs", () => {
  const serialized =
    '{"type": "state", "payload": {"sinks": "not sinks", "sinkInputs": "not input sinks"}}';
  const parsed = parseAudioMessage(serialized);

  assert.deepEqual(parsed, null);
});
