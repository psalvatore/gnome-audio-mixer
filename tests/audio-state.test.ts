import test from "node:test";
import assert from "node:assert/strict";
import { AudioStateStore } from "../src/audio-state.js";
import { createFakeSink, createFakeSinkInput } from "./helpers.js";

test("initializes with empty audio state", () => {
  const store = new AudioStateStore();

  assert.deepEqual(store.getState(), {
    sinks: [],
    sinkInputs: [],
  });
});

test("updates audio state", () => {
  const store = new AudioStateStore();

  store.setState({
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });

  assert.deepEqual(store.getState(), {
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });
});

test("calls subscribed listener", () => {
  const store = new AudioStateStore();

  let callCount = 0;
  let listener = () => {
    callCount++;
  };

  store.subscribe(listener);

  assert.equal(callCount, 0);

  store.setState({
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });

  assert.equal(callCount, 1);
});

test("unsubscribes listener", () => {
  const store = new AudioStateStore();

  let callCount = 0;
  let listener = () => {
    callCount++;
  };

  const unsubscribe = store.subscribe(listener);

  store.setState({
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });

  assert.equal(callCount, 1);

  unsubscribe();

  store.setState({
    sinks: [{ ...createFakeSink(), index: 9999 }],
    sinkInputs: [createFakeSinkInput()],
  });

  assert.equal(callCount, 1);
});

test("persists internal state if getState() object gets modified", () => {
  const store = new AudioStateStore();

  store.setState({
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });

  let stateCopy = store.getState();

  stateCopy.sinks.push({ ...createFakeSink(), index: 9999 });

  assert.deepEqual(store.getState(), {
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });
});

test("persists internal state if setState() original param gets modified", () => {
  const store = new AudioStateStore();

  const originalState = {
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  };

  store.setState(originalState);

  originalState.sinks.push({
    ...createFakeSink(),
    index: 9999,
  });

  assert.deepEqual(store.getState(), {
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });
});

test("clear state notifies listener", () => {
  const store = new AudioStateStore();

  let callCount = 0;
  let listener = () => {
    callCount++;
  };

  store.subscribe(listener);

  store.setState({
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });

  assert.equal(callCount, 1);

  store.clear();

  assert.equal(callCount, 2);
});

test("avoids notifying listeners if setState() uses identical state", () => {
  const store = new AudioStateStore();

  let callCount = 0;
  let listener = () => {
    callCount++;
  };

  store.subscribe(listener);

  store.setState({
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });

  assert.equal(callCount, 1);

  store.setState({
    sinks: [createFakeSink()],
    sinkInputs: [createFakeSinkInput()],
  });

  assert.equal(callCount, 1);
});
