import test from "node:test";
import assert from "node:assert/strict";
import { LineBuffer } from "../src/line-buffer.js";

const lineBufferTestCases = [
  { name: "complete line", input: ["Hello\n"], expected: [["Hello"]] },
  { name: "incomplete line", input: ["Hello"], expected: [[]] },
  { name: "split line", input: ["Hel", "lo\n"], expected: [[], ["Hello"]] },
  { name: "multiple lines", input: ["A\nB\nC\n"], expected: [["A", "B", "C"]] },
  {
    name: "mixed complete/incomplete",
    input: ["A\nB", "\n"],
    expected: [["A"], ["B"]],
  },
  { name: "empty input", input: [""], expected: [[]] },
  {
    name: "complete line and beginning of another",
    input: ["Hello\nWorld", "!\n"],
    expected: [["Hello"], ["World!"]],
  },
];

for (const testCase of lineBufferTestCases) {
  test(`accepts LineBuffer of ${testCase.name}`, () => {
    const parser = new LineBuffer();
    const completeLines = [];

    for (const input of testCase.input) {
      completeLines.push(parser.push(input));
    }

    assert.deepEqual(completeLines, testCase.expected);
  });
}
