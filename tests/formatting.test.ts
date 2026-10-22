import test from "node:test";
import assert from "node:assert/strict";
import type { AudioSink, AudioSinkInput } from "../src/types.js";
import {
  formatSink,
  formatSinkList,
  formatSinkInput,
  formatSinkInputList,
} from "../src/formatting.js";
import { createFakeSinkInput } from "../tests/helpers.js";

test("formats string correctly given an unmuted sink", () => {
  const sink: AudioSink = {
    index: 40,
    name: "music_bus",
    description: "Music",
    state: "IDLE",
    mute: false,
    volume: 40,
  };

  const result = formatSink(sink);

  assert.equal(result, "Music (40%) [Unmuted]");
});

test("formats string correctly given a muted sink", () => {
  const sink: AudioSink = {
    index: 40,
    name: "music_bus",
    description: "Speakers",
    state: "IDLE",
    mute: true,
    volume: 75,
  };

  const result = formatSink(sink);

  assert.equal(result, "Speakers (75%) [Muted]");
});

test("returns a message for an empty sink list", () => {
  const result = formatSinkList([]);

  assert.equal(result, "No audio sinks found.");
});

test("formats string correctly given sink list of single sink", () => {
  const sinks: AudioSink[] = [
    {
      index: 40,
      name: "music_bus",
      description: "Music",
      state: "IDLE",
      mute: false,
      volume: 40,
    },
  ];

  const result = formatSinkList(sinks);

  assert.equal(result, "1. Music (40%) [Unmuted]");
});

test("formats string correctly given sink list of multiple sinks", () => {
  const sinks: AudioSink[] = [
    {
      index: 40,
      name: "music_bus",
      description: "Music",
      state: "IDLE",
      mute: false,
      volume: 40,
    },
    {
      index: 41,
      name: "browser_bus",
      description: "Browser",
      state: "IDLE",
      mute: true,
      volume: 65,
    },
  ];

  const result = formatSinkList(sinks);

  assert.equal(result, "1. Music (40%) [Unmuted]\n2. Browser (65%) [Muted]");
});

test("formats string correctly given an unmuted sink input", () => {
  const sinkInput: AudioSinkInput = {
    ...createFakeSinkInput(),
    volume: 40,
  };

  const result = formatSinkInput(sinkInput);

  assert.equal(result, "Test Browser (Stream 0) - 40% [Unmuted]");
});

test("formats string correctly given a muted sink input", () => {
  const sinkInput: AudioSinkInput = {
    ...createFakeSinkInput(),
    mute: true,
    volume: 40,
  };

  const result = formatSinkInput(sinkInput);

  assert.equal(result, "Test Browser (Stream 0) - 40% [Muted]");
});

test("returns a message for an empty sink input list", () => {
  const result = formatSinkInputList([]);

  assert.equal(result, "No application audio streams found.");
});

test("formats string correctly given sink input list of multiple sink inputs", () => {
  const sinkInputs: AudioSinkInput[] = [
    createFakeSinkInput(),
    {
      ...createFakeSinkInput(),
      index: 13151,
      applicationName: "Discord",
      volume: 75,
      mute: true,
    },
  ];

  const result = formatSinkInputList(sinkInputs);

  assert.equal(
    result,
    "1. Test Browser (Stream 0) - 40% [Unmuted]\n2. Discord (Stream 13151) - 75% [Muted]",
  );
});
