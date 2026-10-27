import test from "node:test";
import assert from "node:assert/strict";
import { createRefreshCoordinator } from "../src/refresh-coordinator.js";

test("correctly starts one refresh from single request", () => {
  let callCount = 0;

  const requestRefresh = createRefreshCoordinator(async () => {
    callCount++;
  });

  requestRefresh();

  assert.equal(callCount, 1);
});

test("coalesces twenty requests into one additional refresh", async () => {
  let callCount = 0;
  let finishRefresh!: () => void;

  const requestRefresh = createRefreshCoordinator(async () => {
    callCount++;

    if (callCount === 1) {
      await new Promise<void>((resolve) => {
        finishRefresh = resolve;
      });
    }
  });

  requestRefresh();

  assert.equal(callCount, 1);

  for (let i = 0; i < 20; i++) {
    requestRefresh();
  }

  assert.equal(callCount, 1);

  finishRefresh();

  await Promise.resolve();
  await Promise.resolve();

  assert.equal(callCount, 2);

  await Promise.resolve();
  await Promise.resolve();

  assert.equal(callCount, 2);
});

test("finishes first refresh before starting second refresh", async () => {
  let callCount = 0;
  let finishRefresh!: () => void;

  const requestRefresh = createRefreshCoordinator(async () => {
    callCount++;

    await new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
  });

  requestRefresh();
  requestRefresh();

  assert.equal(callCount, 1);

  finishRefresh();

  await Promise.resolve();
  await Promise.resolve();

  assert.equal(callCount, 2);

  finishRefresh();

  await Promise.resolve();
  await Promise.resolve();
});

test("recovers later refresh after failed previous refresh", async (t) => {
  const errorMock = t.mock.method(console, "error", () => {});
  let callCount = 0;

  const requestRefresh = createRefreshCoordinator(async () => {
    callCount++;

    if (callCount === 1) {
      throw new Error("Simulated refresh failure");
    }
  });

  requestRefresh();

  assert.equal(callCount, 1);

  await Promise.resolve();
  await Promise.resolve();

  requestRefresh();

  assert.equal(callCount, 2);
  assert.equal(errorMock.mock.callCount(), 1);
});
