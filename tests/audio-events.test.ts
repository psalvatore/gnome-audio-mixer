import test from "node:test";
import assert from "node:assert/strict";
import { parseAudioEvent } from "../src/audio-events.js";

const validParseAudioEventTestCases = [
  {
    input: "Event 'new' on sink-input #6442",
    expected: { action: "new", resource: "sink-input", index: 6442 },
  },
  {
    input: "Event 'change' on sink #46",
    expected: { action: "change", resource: "sink", index: 46 },
  },
  {
    input: "Event 'remove' on sink-input #6442",
    expected: { action: "remove", resource: "sink-input", index: 6442 },
  },
];

for (const testCase of validParseAudioEventTestCases) {
  test(`correctly parses AudioEvent ("${testCase.input}")`, () => {
    const result = parseAudioEvent(testCase.input);

    assert.deepEqual(result, testCase.expected);
  });
}

const invalidParseAudioEventTestCases = [
  { input: "Event 'change' on card #20647", expected: null },
  { input: "Event 'change' on sink #abc", expected: null },
  { input: "Event 'update' on sink #46", expected: null },
  { input: "Event 'new' on source #46", expected: null },
  { input: "garbage Event 'new' on sink #46", expected: null },
  { input: "Event 'new' on sink #46 garbage", expected: null },
  { input: "Event 'new' on sink #9007199254740992", expected: null },
];

for (const testCase of invalidParseAudioEventTestCases) {
  test(`correctly returns null when parsing invalid AudioEvent ("${testCase.input}")`, () => {
    const result = parseAudioEvent(testCase.input);

    assert.deepEqual(result, testCase.expected);
  });
}
