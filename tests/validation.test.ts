import test from "node:test";
import assert from "node:assert/strict";
import {
  isValidSinkName,
  isValidVolume,
  isPactlSinkInput,
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
