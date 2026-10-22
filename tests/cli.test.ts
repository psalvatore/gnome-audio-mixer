import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import type { Interface } from "node:readline/promises";
import { runMenu } from "../src/cli.js";
import {
  createFakeReadline,
  createFakeSink,
  createFakeSinkInput,
} from "./helpers.js";
import type { CliServices } from "../src/types.js";
import { VOLUME_LIMIT, EXIT_OPTION } from "../src/config.js";

before(() => {
  mock.method(console, "log", () => {});
});

test("'Exit' successfully exits cli", async () => {
  const fakeRl: Interface = createFakeReadline([`${EXIT_OPTION}`]);
  const fakeServices: CliServices = {
    getSinks: async () => [],
    setSinkVolume: async () => {},
    setSinkMute: async () => {},
    getSinkInputs: async () => [],
    setSinkInputVolume: async () => {},
    setSinkInputMute: async () => {},
  };

  await assert.doesNotReject(async () => {
    await runMenu(fakeRl, fakeServices);
  });
});

test("'List audio sinks' calls getSinks() once", async () => {
  const fakeRl: Interface = createFakeReadline(["1", `${EXIT_OPTION}`]);

  let getSinksCallCount = 0;

  const fakeServices: CliServices = {
    getSinks: async () => {
      getSinksCallCount++;
      return [];
    },
    setSinkVolume: async () => {},
    setSinkMute: async () => {},
    getSinkInputs: async () => [],
    setSinkInputVolume: async () => {},
    setSinkInputMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.equal(getSinksCallCount, 1);
});

test("'List audio sink inputs' calls getSinkInputs() once", async () => {
  const fakeRl: Interface = createFakeReadline(["4", `${EXIT_OPTION}`]);

  let getSinkInputsCallCount = 0;

  const fakeServices: CliServices = {
    getSinks: async () => [],
    setSinkVolume: async () => {},
    setSinkMute: async () => {},
    getSinkInputs: async () => {
      getSinkInputsCallCount++;
      return [];
    },
    setSinkInputVolume: async () => {},
    setSinkInputMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.equal(getSinkInputsCallCount, 1);
});

test("'Set sink volume' calls service with correct arguments", async () => {
  const fakeRl: Interface = createFakeReadline([
    "2",
    "1",
    "75",
    `${EXIT_OPTION}`,
  ]);

  let recordedName: string | undefined;
  let recordedVolume: number | undefined;

  const fakeServices: CliServices = {
    getSinks: async () => [createFakeSink()],
    setSinkVolume: async (name: string, volume: number) => {
      recordedName = name;
      recordedVolume = volume;
    },
    setSinkMute: async () => {},
    getSinkInputs: async () => [],
    setSinkInputVolume: async () => {},
    setSinkInputMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.deepEqual([recordedName, recordedVolume], ["test-speakers", 75]);
});

test("'Set sink volume' with invalid volume does not call setSinkVolume()", async () => {
  const fakeRl: Interface = createFakeReadline([
    "2",
    "1",
    `${VOLUME_LIMIT + 50}`,
    `${EXIT_OPTION}`,
  ]);

  let setVolumeCallCount = 0;

  const fakeServices: CliServices = {
    getSinks: async () => [createFakeSink()],
    setSinkVolume: async () => {
      setVolumeCallCount++;
    },
    setSinkMute: async () => {},
    getSinkInputs: async () => [],
    setSinkInputVolume: async () => {},
    setSinkInputMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.equal(setVolumeCallCount, 0);
});

const muteSinkTestCases = [
  { label: "Mute", mute: "1", expected: true },
  { label: "Unmute", mute: "0", expected: false },
];

for (const testCase of muteSinkTestCases) {
  test(`'${testCase.label} sink' calls service with correct arguments`, async () => {
    const fakeRl: Interface = createFakeReadline([
      "3",
      "1",
      testCase.mute,
      `${EXIT_OPTION}`,
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
      getSinkInputs: async () => [],
      setSinkInputVolume: async () => {},
      setSinkInputMute: async () => {},
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
    const fakeRl: Interface = createFakeReadline([
      "2",
      testCase,
      `${EXIT_OPTION}`,
    ]);

    let serviceCallCount = 0;

    const fakeServices: CliServices = {
      getSinks: async () => [createFakeSink()],
      setSinkVolume: async () => {
        serviceCallCount++;
      },
      setSinkMute: async () => {
        serviceCallCount++;
      },
      getSinkInputs: async () => [],
      setSinkInputVolume: async () => {},
      setSinkInputMute: async () => {},
    };

    await runMenu(fakeRl, fakeServices);

    assert.equal(serviceCallCount, 0);
  });
}

test(`No sinks available does not call service`, async () => {
  const fakeRl: Interface = createFakeReadline(["2", `${EXIT_OPTION}`]);

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
    getSinkInputs: async () => [],
    setSinkInputVolume: async () => {},
    setSinkInputMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.deepEqual([getSinksCallCount, setVolumeOrMuteCall], [1, 0]);
});

test("'Set application stream volume' calls service with correct arguments", async () => {
  const fakeRl: Interface = createFakeReadline([
    "5",
    "2",
    "75",
    `${EXIT_OPTION}`,
  ]);

  let recordedIndex: number | undefined;
  let recordedVolume: number | undefined;

  const fakeServices: CliServices = {
    getSinks: async () => [],
    setSinkVolume: async () => {},
    setSinkMute: async () => {},
    getSinkInputs: async () => [
      createFakeSinkInput(),
      {
        ...createFakeSinkInput(),
        index: 13151,
      },
    ],
    setSinkInputVolume: async (index: number, volume: number) => {
      recordedIndex = index;
      recordedVolume = volume;
    },
    setSinkInputMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.deepEqual([recordedIndex, recordedVolume], [13151, 75]);
});

test("'Set application stream volume' with invalid volume does not call setSinkInputVolume()", async () => {
  const fakeRl: Interface = createFakeReadline([
    "5",
    "1",
    `${VOLUME_LIMIT + 50}`,
    `${EXIT_OPTION}`,
  ]);

  let setVolumeCallCount = 0;

  const fakeServices: CliServices = {
    getSinks: async () => [],
    setSinkVolume: async () => {},
    setSinkMute: async () => {},
    getSinkInputs: async () => [createFakeSinkInput()],
    setSinkInputVolume: async () => {
      setVolumeCallCount++;
    },
    setSinkInputMute: async () => {},
  };

  await runMenu(fakeRl, fakeServices);

  assert.equal(setVolumeCallCount, 0);
});

const selectSinkInputTestCases = ["0", "5", "abc", ""];

for (const testCase of selectSinkInputTestCases) {
  test(`Invalid application stream selection ${JSON.stringify(testCase)} input does not call service`, async () => {
    const fakeRl: Interface = createFakeReadline([
      "5",
      testCase,
      `${EXIT_OPTION}`,
    ]);

    let serviceCallCount = 0;

    const fakeServices: CliServices = {
      getSinks: async () => [],
      setSinkVolume: async () => {},
      setSinkMute: async () => {},
      getSinkInputs: async () => [createFakeSinkInput()],
      setSinkInputVolume: async () => {
        serviceCallCount++;
      },
      setSinkInputMute: async () => {
        serviceCallCount++;
      },
    };

    await runMenu(fakeRl, fakeServices);

    assert.equal(serviceCallCount, 0);
  });
}

const muteSinkInputTestCases = [
  { label: "Mute", mute: "1", expected: true },
  { label: "Unmute", mute: "0", expected: false },
];

for (const testCase of muteSinkInputTestCases) {
  test(`'${testCase.label} sink input' calls service with correct arguments`, async () => {
    const fakeRl: Interface = createFakeReadline([
      "6",
      "2",
      testCase.mute,
      `${EXIT_OPTION}`,
    ]);

    let recordedIndex: number | undefined;
    let recordedMute: boolean | undefined;

    const fakeServices: CliServices = {
      getSinks: async () => [],
      setSinkVolume: async () => {},
      setSinkMute: async () => {},
      getSinkInputs: async () => [
        createFakeSinkInput(),
        {
          ...createFakeSinkInput(),
          index: 13151,
        },
      ],
      setSinkInputVolume: async () => {},
      setSinkInputMute: async (index: number, mute: boolean) => {
        recordedIndex = index;
        recordedMute = mute;
      },
    };

    await runMenu(fakeRl, fakeServices);

    assert.deepEqual([recordedIndex, recordedMute], [13151, testCase.expected]);
  });
}

test("Invalid mute input with one available application audio stream does not call service", async () => {
  const fakeRl: Interface = createFakeReadline([
    "6",
    "1",
    "abc",
    `${EXIT_OPTION}`,
  ]);

  let serviceCallCount = 0;

  const fakeServices: CliServices = {
    getSinks: async () => [],
    setSinkVolume: async () => {},
    setSinkMute: async () => {},
    getSinkInputs: async () => [createFakeSinkInput()],
    setSinkInputVolume: async () => {
      serviceCallCount++;
    },
    setSinkInputMute: async () => {
      serviceCallCount++;
    },
  };

  await runMenu(fakeRl, fakeServices);

  assert.equal(serviceCallCount, 0);
});

test("Mute menu selected with no available application audio stream does not call service", async () => {
  const fakeRl: Interface = createFakeReadline(["6", `${EXIT_OPTION}`]);

  let serviceCallCount = 0;

  const fakeServices: CliServices = {
    getSinks: async () => [],
    setSinkVolume: async () => {},
    setSinkMute: async () => {},
    getSinkInputs: async () => [],
    setSinkInputVolume: async () => {
      serviceCallCount++;
    },
    setSinkInputMute: async () => {
      serviceCallCount++;
    },
  };

  await runMenu(fakeRl, fakeServices);

  assert.equal(serviceCallCount, 0);
});

after(() => {
  mock.restoreAll();
});
