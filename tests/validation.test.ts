import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidSinkName,
  isValidVolume,
  isPactlSinkInput,
  isValidMenuSelection,
  getSelectedItem,
} from "../src/validation.js";
import { VOLUME_LIMIT } from "../src/config.js";
import { createFakePactlSinkInput } from "./helpers.js";

const validVolumes = [0, 50, VOLUME_LIMIT];

for (const volume of validVolumes) {
  test(`accepts volume ${volume}`, () => {
    assert.equal(isValidVolume(volume), true);
  });
}

const invalidVolumes = [-1, VOLUME_LIMIT + 1, NaN, Infinity];

for (const volume of invalidVolumes) {
  test(`rejects volume ${volume}`, () => {
    assert.equal(isValidVolume(volume), false);
  });
}

const validSinkNames = [
  "music_bus",
  "alsa_output.pci-0000_0c_00.4.analog-stereo",
  "  music_bus  ",
];

for (const name of validSinkNames) {
  test(`accepts name ${JSON.stringify(name)}`, () => {
    assert.equal(isValidSinkName(name), true);
  });
}

const invalidSinkNames = ["", "   ", "\t\n"];

for (const name of invalidSinkNames) {
  test(`rejects name ${JSON.stringify(name)}`, () => {
    assert.equal(isValidSinkName(name), false);
  });
}

test("accepts valid PactlSinkInput", () => {
  assert.equal(isPactlSinkInput(createFakePactlSinkInput()), true);
});

test("rejects invalid mute PactlSinkInput", () => {
  const invalidInput = {
    ...createFakePactlSinkInput(),
    mute: "false",
  };

  assert.equal(isPactlSinkInput(invalidInput), false);
});

test("rejects invalid property PactlSinkInput", () => {
  const input = createFakePactlSinkInput();

  const invalidInput = {
    ...input,
    properties: {
      ...input.properties,
      "application.name": 12,
    },
  };

  assert.equal(isPactlSinkInput(invalidInput), false);
});

const validMenuSelectionCases = [
  { name: "selection minimum", selection: "1", itemCount: 3 },
  { name: "selection maximum", selection: "3", itemCount: 3 },
];

for (const testCase of validMenuSelectionCases) {
  test(`accepts ${testCase.name}`, () => {
    assert.equal(
      isValidMenuSelection(testCase.selection, testCase.itemCount),
      true,
    );
  });
}

const invalidMenuSelectionCases = [
  { name: "selection below minimum", selection: "0", itemCount: 3 },
  { name: "selection above maximum", selection: "4", itemCount: 3 },
  { name: "non-numeric selection", selection: "abc", itemCount: 3 },
  { name: "empty selection", selection: "", itemCount: 3 },
  { name: "decimal selection", selection: "1.5", itemCount: 3 },
  { name: "whitespace selection", selection: " ", itemCount: 3 },
  { name: "selection from empty menu", selection: "1", itemCount: 0 },
  { name: "scientific notation", selection: "1e0", itemCount: 3 },
  { name: "hexadecimal notation", selection: "0x2", itemCount: 3 },
];

for (const testCase of invalidMenuSelectionCases) {
  test(`rejects ${testCase.name}`, () => {
    assert.equal(
      isValidMenuSelection(testCase.selection, testCase.itemCount),
      false,
    );
  });
}

const validGetSelectedItemCases = [
  {
    name: "array of strings with valid selection",
    items: ["Speakers", "Headphones"],
    selection: "2",
    expected: "Headphones",
  },
  {
    name: "array of numbers with valid selection",
    items: [10, 20, 30],
    selection: "1",
    expected: 10,
  },
];

for (const testCase of validGetSelectedItemCases) {
  test(`accepts ${testCase.name}`, () => {
    assert.equal(
      getSelectedItem<string | number>(testCase.items, testCase.selection),
      testCase.expected,
    );
  });
}

const invalidGetSelectedItemCases = [
  {
    name: "selection above maximum",
    items: ["Speakers"],
    selection: "5",
    expected: null,
  },
  {
    name: "non-numeric selection",
    items: ["Speakers"],
    selection: "abc",
    expected: null,
  },
  {
    name: "selection from empty array",
    items: [],
    selection: "1",
    expected: null,
  },
];

for (const testCase of invalidGetSelectedItemCases) {
  test(`rejects ${testCase.name}`, () => {
    assert.equal(
      getSelectedItem(testCase.items, testCase.selection),
      testCase.expected,
    );
  });
}
