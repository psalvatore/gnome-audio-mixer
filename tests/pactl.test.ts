import test from "node:test";
import assert from "node:assert/strict";
import { setSinkMute, setSinkVolume, getSinks } from "../src/pactl.js";
import { VOLUME_LIMIT } from "../src/config.js";
import { createFakeRunner, createRecordingRunner } from "./helpers.js";

test("mutes a sink using the correct pactl command", async () => {
  const commands: string[][] = [];

  const fakeRunner = createRecordingRunner(commands);

  await setSinkMute("music_bus", true, fakeRunner);

  assert.deepEqual(commands, [["pactl", "set-sink-mute", "music_bus", "1"]]);
});

test("unmutes a sink using the correct pactl command", async () => {
  const commands: string[][] = [];

  const fakeRunner = createRecordingRunner(commands);

  await setSinkMute("music_bus", false, fakeRunner);

  assert.deepEqual(commands, [["pactl", "set-sink-mute", "music_bus", "0"]]);
});

test("rejects an empty sink name without executing pactl", async () => {
  const commands: string[][] = [];

  const fakeRunner = createRecordingRunner(commands);

  await assert.rejects(
    async () => {
      await setSinkMute("", true, fakeRunner);
    },
    {
      name: "Error",
      message: "Sink name cannot be empty.",
    },
  );

  assert.deepEqual(commands, []);
});

test("propagates errors from the pactl command runner (set mute)", async () => {
  const fakeRunner = async (): Promise<string> => {
    throw new Error("Simulated pactl failure");
  };

  await assert.rejects(
    async () => {
      await setSinkMute("music_bus", true, fakeRunner);
    },
    {
      name: "Error",
      message: "Simulated pactl failure",
    },
  );
});

test("rejects a whitespace-only sink name without executing pactl (set mute)", async () => {
  let runnerCalled = false;

  const fakeRunner = async (): Promise<string> => {
    runnerCalled = true;
    return "";
  };

  await assert.rejects(
    async () => {
      await setSinkMute("   ", true, fakeRunner);
    },
    {
      name: "Error",
      message: "Sink name cannot be empty.",
    },
  );

  assert.equal(runnerCalled, false);
});

test("accepts a valid volume using the correct pactl command", async () => {
  const commands: string[][] = [];

  const fakeRunner = createRecordingRunner(commands);

  await setSinkVolume("music_bus", 50, fakeRunner);

  assert.deepEqual(commands, [
    ["pactl", "set-sink-volume", "music_bus", "50%"],
  ]);
});

test("rejects a volume below the range without executing pactl", async () => {
  let runnerCalled = false;

  const fakeRunner = async (): Promise<string> => {
    runnerCalled = true;
    return "";
  };

  await assert.rejects(
    async () => {
      await setSinkVolume("music_bus", -1, fakeRunner);
    },
    {
      name: "RangeError",
      message: `Volume must be between 0 and ${VOLUME_LIMIT}.`,
    },
  );

  assert.equal(runnerCalled, false);
});

test("rejects a volume above the range without executing pactl", async () => {
  let runnerCalled = false;

  const fakeRunner = async (): Promise<string> => {
    runnerCalled = true;
    return "";
  };

  await assert.rejects(
    async () => {
      await setSinkVolume("music_bus", VOLUME_LIMIT + 1, fakeRunner);
    },
    {
      name: "RangeError",
      message: `Volume must be between 0 and ${VOLUME_LIMIT}.`,
    },
  );

  assert.equal(runnerCalled, false);
});

test("rejects a whitespace-only sink name without executing pactl (set volume)", async () => {
  let runnerCalled = false;

  const fakeRunner = async (): Promise<string> => {
    runnerCalled = true;
    return "";
  };

  await assert.rejects(
    async () => {
      await setSinkVolume("   ", 50, fakeRunner);
    },
    {
      name: "Error",
      message: "Sink name cannot be empty.",
    },
  );

  assert.equal(runnerCalled, false);
});

test("propagates errors from the pactl command runner (set volume)", async () => {
  const fakeRunner = async (): Promise<string> => {
    throw new Error("Simulated pactl failure");
  };

  await assert.rejects(
    async () => {
      await setSinkVolume("music_bus", 50, fakeRunner);
    },
    {
      name: "Error",
      message: "Simulated pactl failure",
    },
  );
});

test("returns an empty array when pactl reports no sinks", async () => {
  const fakeRunner = createFakeRunner(JSON.stringify([]));

  const result = await getSinks(fakeRunner);

  assert.deepEqual(result, []);
});

test("executes the correct pactl command to retrieve sinks", async () => {
  const commands: string[][] = [];

  const fakeRunner = createRecordingRunner(commands, "[]");

  await getSinks(fakeRunner);

  assert.deepEqual(commands, [["pactl", "-f", "json", "list", "sinks"]]);
});

test("propagates errors from the pactl command runner (get sinks)", async () => {
  const fakeRunner = async (): Promise<string> => {
    throw new Error("Simulated pactl failure");
  };

  await assert.rejects(
    async () => {
      await getSinks(fakeRunner);
    },
    {
      name: "Error",
      message: "Simulated pactl failure",
    },
  );
});

test("rejects invalid JSON returned by pactl", async () => {
  const fakeRunner = createFakeRunner("invalid json");

  await assert.rejects(async () => {
    await getSinks(fakeRunner);
  }, SyntaxError);
});

test("rejects valid JSON, but not an array returned by pactl", async () => {
  const fakeRunner = createFakeRunner(JSON.stringify({}));

  await assert.rejects(
    async () => {
      await getSinks(fakeRunner);
    },
    {
      name: "Error",
      message: "Expected pactl to return an array.",
    },
  );
});

test("rejects valid array containing an invalid sink returned by pactl", async () => {
  const fakeRunner = createFakeRunner(JSON.stringify([{}]));

  await assert.rejects(
    async () => {
      await getSinks(fakeRunner);
    },
    {
      name: "Error",
      message: "pactl returned an invalid sink.",
    },
  );
});

test("converts valid pactl sink data into AudioSink objects", async () => {
  const fakeRunner = createFakeRunner(
    JSON.stringify([
      {
        index: 40,
        state: "IDLE",
        name: "music_bus",
        description: "Music",
        mute: false,
        volume: {
          "front-left": {
            value: 65536,
            value_percent: "45%",
            db: "0.00 dB",
          },
          "front-right": {
            value: 65536,
            value_percent: "60%",
            db: "0.00 dB",
          },
        },
      },
    ]),
  );

  const result = await getSinks(fakeRunner);

  assert.deepEqual(result, [
    {
      index: 40,
      name: "music_bus",
      description: "Music",
      state: "IDLE",
      mute: false,
      volume: 60,
    },
  ]);
});
