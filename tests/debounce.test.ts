import test from "node:test";
import assert from "node:assert/strict";
import { debounce } from "../src/debounce.js";

test("executes debounce callback after delay", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });

  let callCount = 0;

  const debounced = debounce(() => {
    callCount++;
  }, 200);

  debounced();

  assert.equal(callCount, 0);

  t.mock.timers.tick(200);

  assert.equal(callCount, 1);
});

test("executes callback once after delay calling debounce three times", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });

  let callCount = 0;

  const debounced = debounce(() => {
    callCount++;
  }, 200);

  debounced();
  debounced();
  debounced();

  t.mock.timers.tick(200);

  assert.equal(callCount, 1);
});

test("executes callback at 300ms after debounce calls at 0ms and 100ms", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });

  let callCount = 0;

  const debounced = debounce(() => {
    callCount++;
  }, 200);

  debounced();

  t.mock.timers.tick(100);

  debounced();

  t.mock.timers.tick(100);
  assert.equal(callCount, 0);

  t.mock.timers.tick(100);
  assert.equal(callCount, 1);
});

test("executes different debounce callbacks independently", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });

  let callCountA = 0;
  let callCountB = 0;

  const debouncedA = debounce(() => {
    callCountA++;
  }, 200);

  const debouncedB = debounce(() => {
    callCountB++;
  }, 200);

  debouncedA();
  debouncedB();

  t.mock.timers.tick(200);

  assert.equal(callCountA, 1);
  assert.equal(callCountB, 1);
});
