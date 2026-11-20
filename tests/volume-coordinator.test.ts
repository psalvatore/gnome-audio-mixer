import assert from "node:assert/strict";
import { test, before, after, mock } from "node:test";
import { VolumeCoordinator } from "../src/volume-coordinator.js";

before(() => {
  mock.method(console, "error", () => {});
});

test("executes a single volume request", async () => {
  const coordinator = new VolumeCoordinator();
  const calls: string[] = [];

  const fakeSetVolume = async (sinkIndex: number, volume: number) => {
    calls.push(`${sinkIndex}:${volume}`);
  };

  await coordinator.requestVolumeChange(1, 75, fakeSetVolume);

  assert.deepEqual(calls, ["1:75"]);
});

test("coalesces multiple volume requests", async () => {
  const coordinator = new VolumeCoordinator();
  const calls: string[] = [];

  let finishOperation!: () => void;

  const operationFinished = new Promise<void>((resolve) => {
    finishOperation = resolve;
  });

  const fakeSetVolume = async (sinkIndex: number, volume: number) => {
    calls.push(`${sinkIndex}:${volume}`);
    await operationFinished;
  };

  const request = coordinator.requestVolumeChange(1, 30, fakeSetVolume);
  coordinator.requestVolumeChange(1, 50, fakeSetVolume);
  coordinator.requestVolumeChange(1, 70, fakeSetVolume);
  coordinator.requestVolumeChange(1, 90, fakeSetVolume);

  finishOperation();
  await request;

  assert.deepEqual(calls, ["1:30", "1:90"]);
});

test("processes different sinks independently", async () => {
  const coordinator = new VolumeCoordinator();
  const calls: string[] = [];

  let finishSink1!: () => void;

  const sink1Finished = new Promise<void>((resolve) => {
    finishSink1 = resolve;
  });

  const fakeSetVolume = async (sinkIndex: number, volume: number) => {
    calls.push(`${sinkIndex}:${volume}`);

    if (sinkIndex === 1) {
      await sink1Finished;
    }
  };

  const request1 = coordinator.requestVolumeChange(1, 30, fakeSetVolume);
  const request2 = coordinator.requestVolumeChange(2, 80, fakeSetVolume);

  assert.deepEqual(calls, ["1:30", "2:80"]);

  await request2;

  finishSink1();
  await request1;

  assert.deepEqual(calls, ["1:30", "2:80"]);
});

test("continues processing pending requests after an error", async () => {
  const coordinator = new VolumeCoordinator();
  const calls: string[] = [];

  let rejectOperation!: (reason: Error) => void;

  const operationFinished = new Promise<void>((_resolve, reject) => {
    rejectOperation = reject;
  });

  const fakeSetVolume = async (sinkIndex: number, volume: number) => {
    calls.push(`${sinkIndex}:${volume}`);

    if (volume === 30) {
      await operationFinished;
    }
  };

  const request = coordinator.requestVolumeChange(1, 30, fakeSetVolume);

  const pendingRequest = coordinator.requestVolumeChange(1, 90, fakeSetVolume);

  rejectOperation(new Error("Simulated pactl failure"));

  await request;
  await pendingRequest;

  assert.deepEqual(calls, ["1:30", "1:90"]);
});

after(() => {
  mock.restoreAll();
});
