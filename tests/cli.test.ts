import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import type { Interface } from "node:readline/promises";
import { runMenu } from "../src/cli.js";
import { createFakeReadline, createFakeSink } from "./helpers.js";
import type { CliServices } from "../src/types.js";
import { VOLUME_LIMIT } from "../src/config.js";

before(() => {
  mock.method(console, "log", () => {});
});

test("'Exit' successfully exits cli", async () => {
  const fakeRl: Interface = createFakeReadline(["4"]);
  const fakeServices: CliServices = {
    getSinks: async () => [],
    setSinkVolume: async () => {},
    setSinkMute: async () => {},
  };

  await assert.doesNotReject(async () => {
    await runMenu(fakeRl, fakeServices);
  });
});

test("'List audio sinks' calls getSinks() once", async () => {
  const fakeRl: Interface = createFakeReadline(["1", "4"]);

  let getSinksCallCount = 0;

  const fakeServices: CliServices = {
    getSinks: async () => {
      getSinksCallCount++;
      return [];
    },
    setSinkVolume: async () => {},
    setSinkMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.equal(getSinksCallCount, 1);
});

test("'Set sink volume' calls service with correct arguments", async () => {
  const fakeRl: Interface = createFakeReadline(["2", "1", "75", "4"]);

  let recordedName: string | undefined;
  let recordedVolume: number | undefined;

  const fakeServices: CliServices = {
    getSinks: async () => [createFakeSink()],
    setSinkVolume: async (name: string, volume: number) => {
      recordedName = name;
      recordedVolume = volume;
    },
    setSinkMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.deepEqual([recordedName, recordedVolume], ["test-speakers", 75]);
});

test("'Set sink volume' with invalid volume does not call setSinkVolume()", async () => {
  const fakeRl: Interface = createFakeReadline([
    "2",
    "1",
    `${VOLUME_LIMIT + 50}`,
    "4",
  ]);

  let setVolumeCallCount = 0;

  const fakeServices: CliServices = {
    getSinks: async () => [createFakeSink()],
    setSinkVolume: async () => {
      setVolumeCallCount++;
    },
    setSinkMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.equal(setVolumeCallCount, 0);
});

const muteTestCases = [
  { label: "Mute", mute: "1", expected: true },
  { label: "Unmute", mute: "0", expected: false },
];

for (const testCase of muteTestCases) {
  test(`'${testCase.label} sink' calls service with correct arguments`, async () => {
    const fakeRl: Interface = createFakeReadline([
      "3",
      "1",
      testCase.mute,
      "4",
    ]);

    let recordedName: string | undefined;
    let recordedMute: boolean | undefined;

    const fakeServices: CliServices = {
      getSinks: async () => [createFakeSink()],
      setSinkVolume: async () => {},
      setSinkMute: async (name: string, mute: boolean) => {
        recordedName = name;
        recordedMute = mute;
      },
    };

    await runMenu(fakeRl, fakeServices);

    assert.deepEqual(
      [recordedName, recordedMute],
      ["test-speakers", testCase.expected],
    );
  });
}

const selectSinkTestCases = ["0", "5", "abc", ""];

for (const testCase of selectSinkTestCases) {
  test(`Invalid sink selection ${JSON.stringify(testCase)} input does not call service`, async () => {
    const fakeRl: Interface = createFakeReadline(["2", testCase, "4"]);

    let serviceCallCount = 0;

    const fakeServices: CliServices = {
      getSinks: async () => [createFakeSink()],
      setSinkVolume: async () => {
        serviceCallCount++;
      },
      setSinkMute: async () => {
        serviceCallCount++;
      },
    };

    await runMenu(fakeRl, fakeServices);

    assert.equal(serviceCallCount, 0);
  });
}

test(`No sinks available does not call service`, async () => {
  const fakeRl: Interface = createFakeReadline(["2", "4"]);

  let getSinksCallCount = 0;
  let setVolumeOrMuteCall = 0;

  const fakeServices: CliServices = {
    getSinks: async () => {
      getSinksCallCount++;
      return [];
    },
    setSinkVolume: async () => {
      setVolumeOrMuteCall++;
    },
    setSinkMute: async () => {
      setVolumeOrMuteCall++;
    },
  };

  await runMenu(fakeRl, fakeServices);

  assert.deepEqual([getSinksCallCount, setVolumeOrMuteCall], [1, 0]);
});

after(() => {
  mock.restoreAll();
});
