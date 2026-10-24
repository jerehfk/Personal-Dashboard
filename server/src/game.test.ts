import { test } from "node:test";
import assert from "node:assert/strict";
import { habitXp, levelFor } from "./game.ts";
import { computeStreaks, isValidDate } from "./stats.ts";

test("Levelkurve", () => {
  assert.deepEqual(levelFor(0), { xp: 0, level: 1, into: 0, need: 50 });
  assert.equal(levelFor(49).level, 1);
  assert.equal(levelFor(50).level, 2);
  assert.deepEqual(levelFor(250), { xp: 250, level: 3, into: 50, need: 250 });
  assert.equal(levelFor(450).level, 4);
});

test("Serienbonus gedeckelt", () => {
  assert.equal(habitXp(1), 10);
  assert.equal(habitXp(4), 13);
  assert.equal(habitXp(100), 20);
});

test("Streaks", () => {
  assert.deepEqual(computeStreaks([], "2026-10-24"), { current: 0, longest: 0 });
  assert.deepEqual(computeStreaks(["2026-10-22", "2026-10-23", "2026-10-24"], "2026-10-24"), { current: 3, longest: 3 });
  assert.equal(computeStreaks(["2026-10-22", "2026-10-23"], "2026-10-24").current, 2);
  assert.deepEqual(computeStreaks(["2026-10-20", "2026-10-21", "2026-10-22"], "2026-10-24"), { current: 0, longest: 3 });
  assert.deepEqual(computeStreaks(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-26"], "2026-10-26"), { current: 3, longest: 3 });
  assert.ok(isValidDate("2026-02-28") && !isValidDate("2026-02-30") && !isValidDate("morgen"));
});
