import test from "node:test";
import assert from "node:assert/strict";

import {
  isRouteComplete,
  nextRouteTarget,
  routeProgress,
} from "../engine/level-manager.js";

const route = ["cabin", "stairs", "deck", "boat"];

test("level manager returns the next highlighted stop", () => {
  assert.equal(nextRouteTarget(route, "cabin"), "stairs");
  assert.equal(nextRouteTarget(route, "stairs"), "deck");
  assert.equal(nextRouteTarget(route, "boat"), null);
});

test("route progress counts completed moves", () => {
  assert.deepEqual(routeProgress(route, "cabin"), { completed: 0, total: 3 });
  assert.deepEqual(routeProgress(route, "deck"), { completed: 2, total: 3 });
  assert.equal(isRouteComplete(route, "boat"), true);
  assert.equal(isRouteComplete(route, "deck"), false);
});
