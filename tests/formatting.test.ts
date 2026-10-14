import test from "node:test";
import assert from "node:assert/strict";
import type { AudioSink } from "../src/types.js";
import { formatSink, formatSinkList } from "../src/formatting.js";

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
