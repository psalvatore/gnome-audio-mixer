import test from "node:test";
import assert from "node:assert/strict";
import { createFakeSink, createFakeSinkInput } from "./helpers.js";
import { getSinkChanges, getSinkInputChanges } from "../src/audio-diff.js";

const sink1 = { ...createFakeSink(), index: 1 };
const sink2 = { ...createFakeSink(), index: 2 };
const sink3 = { ...createFakeSink(), index: 3 };
const sink4 = { ...createFakeSink(), index: 4 };
const sink5 = { ...createFakeSink(), index: 5 };

test("correctly diffs added sink", () => {
  const previous = [sink1];
  const current = [sink1, sink2];

  const result = getSinkChanges(previous, current);

  assert.deepEqual(result, { added: [sink2], removed: [], updated: [] });
});

test("correctly diffs removed sink", () => {
  const previous = [sink1, sink2];
  const current = [sink1];

  const result = getSinkChanges(previous, current);

  assert.deepEqual(result, { added: [], removed: [sink2], updated: [] });
});

test("correctly diffs no changes", () => {
  const previous = [sink1, sink2];
  const current = [sink1, sink2];

  const result = getSinkChanges(previous, current);

  assert.deepEqual(result, { added: [], removed: [], updated: [] });
});

test("correctly diffs multiple sink changes", () => {
  const previous = [sink1, sink2, sink3];
  const current = [sink2, sink4, sink5];

  const result = getSinkChanges(previous, current);

  assert.deepEqual(result, {
    added: [sink4, sink5],
    removed: [sink1, sink3],
    updated: [],
  });
});

test("sink diff does not modify input arrays", () => {
  const previous = [sink1, sink2, sink3];
  const current = [sink2, sink4, sink5];

  const previousSnapshot = structuredClone(previous);
  const currentSnapshot = structuredClone(current);

  const result = getSinkChanges(previous, current);

  assert.deepEqual(previous, previousSnapshot);
  assert.deepEqual(current, currentSnapshot);
});

test("correctly diffs updated sink volume", () => {
  const previous = [
    sink1,
    sink2,
    { ...createFakeSink(), index: 6, volume: 50, mute: false },
  ];
  const current = [
    sink1,
    sink2,
    { ...createFakeSink(), index: 6, volume: 75, mute: false },
  ];

  const result = getSinkChanges(previous, current);

  assert.deepEqual(result, {
    added: [],
    removed: [],
    updated: [{ ...createFakeSink(), index: 6, volume: 75, mute: false }],
  });
});

test("correctly diffs updated sink mute", () => {
  const previous = [
    sink1,
    sink2,
    { ...createFakeSink(), index: 6, volume: 50, mute: false },
  ];
  const current = [
    sink1,
    sink2,
    { ...createFakeSink(), index: 6, volume: 50, mute: true },
  ];

  const result = getSinkChanges(previous, current);

  assert.deepEqual(result, {
    added: [],
    removed: [],
    updated: [{ ...createFakeSink(), index: 6, volume: 50, mute: true }],
  });
});

test("correctly diffs no sink updates", () => {
  const previous = [
    sink1,
    sink2,
    { ...createFakeSink(), index: 6, volume: 50, mute: false },
  ];
  const current = [
    sink1,
    sink2,
    { ...createFakeSink(), index: 6, volume: 50, mute: false },
  ];

  const result = getSinkChanges(previous, current);

  assert.deepEqual(result, {
    added: [],
    removed: [],
    updated: [],
  });
});

const input1 = { ...createFakeSinkInput(), index: 1 };
const input2 = { ...createFakeSinkInput(), index: 2 };
const input3 = { ...createFakeSinkInput(), index: 3 };
const input4 = { ...createFakeSinkInput(), index: 4 };
const input5 = { ...createFakeSinkInput(), index: 5 };

test("correctly diffs added sink input", () => {
  const previous = [input1];
  const current = [input1, input2];

  const result = getSinkInputChanges(previous, current);

  assert.deepEqual(result, {
    added: [input2],
    removed: [],
    updated: [],
  });
});

test("correctly diffs removed sink input", () => {
  const previous = [input1, input2];
  const current = [input1];

  const result = getSinkInputChanges(previous, current);

  assert.deepEqual(result, {
    added: [],
    removed: [input2],
    updated: [],
  });
});

test("correctly diffs no changes", () => {
  const previous = [input1, input2];
  const current = [input1, input2];

  const result = getSinkInputChanges(previous, current);

  assert.deepEqual(result, {
    added: [],
    removed: [],
    updated: [],
  });
});

test("correctly diffs multiple added and removed sink inputs", () => {
  const previous = [input1, input2, input3];
  const current = [input2, input4, input5];

  const result = getSinkInputChanges(previous, current);

  assert.deepEqual(result, {
    added: [input4, input5],
    removed: [input1, input3],
    updated: [],
  });
});

test("correctly detects sink input volume changes", () => {
  const previous = [{ ...input1, volume: 50 }];
  const current = [{ ...input1, volume: 75 }];

  const result = getSinkInputChanges(previous, current);

  assert.deepEqual(result, {
    added: [],
    removed: [],
    updated: [current[0]],
  });
});

test("correctly detects sink input mute changes", () => {
  const previous = [{ ...input1, mute: false }];
  const current = [{ ...input1, mute: true }];

  const result = getSinkInputChanges(previous, current);

  assert.deepEqual(result, {
    added: [],
    removed: [],
    updated: [current[0]],
  });
});

test("correctly detects sink input output-device changes", () => {
  const previous = [{ ...input1, sink: 1 }];
  const current = [{ ...input1, sink: 2 }];

  const result = getSinkInputChanges(previous, current);

  assert.deepEqual(result, {
    added: [],
    removed: [],
    updated: [current[0]],
  });
});

test("does not report unchanged sink inputs as updated", () => {
  const previous = [{ ...input1, volume: 50, mute: false, sink: 1 }];
  const current = [{ ...input1, volume: 50, mute: false, sink: 1 }];

  const result = getSinkInputChanges(previous, current);

  assert.deepEqual(result, {
    added: [],
    removed: [],
    updated: [],
  });
});

test("does not modify input arrays or their objects", () => {
  const previous = [input1, input2, input3];
  const current = [input2, input4, input5];

  const previousSnapshot = structuredClone(previous);
  const currentSnapshot = structuredClone(current);

  getSinkInputChanges(previous, current);

  assert.deepEqual(previous, previousSnapshot);
  assert.deepEqual(current, currentSnapshot);
});

test("correctly handles empty input arrays", () => {
  assert.deepEqual(getSinkInputChanges([], []), {
    added: [],
    removed: [],
    updated: [],
  });

  assert.deepEqual(getSinkInputChanges([], [input1]), {
    added: [input1],
    removed: [],
    updated: [],
  });

  assert.deepEqual(getSinkInputChanges([input1], []), {
    added: [],
    removed: [input1],
    updated: [],
  });
});
