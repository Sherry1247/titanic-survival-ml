import test from "node:test";
import assert from "node:assert/strict";

import { ALL_PASSENGERS } from "../data/analysis.js";
import { GameState } from "../engine/game-state.js";

const withFamily = ALL_PASSENGERS.find((row) => row.pclass === 3 && !row.isAlone && row.age !== null);
const travellingAlone = ALL_PASSENGERS.find((row) => row.pclass === 1 && row.isAlone && row.age !== null);

test("game requires a passenger profile before starting", () => {
  const state = new GameState();
  assert.equal(state.start().code, "choose-passenger");
  state.assignPassenger(withFamily);
  assert.equal(state.start().code, "started");
  assert.equal(state.status, "deciding");
});

test("passenger class changes starting access and movement time", () => {
  const third = new GameState(withFamily);
  const first = new GameState(travellingAlone);
  assert.ok(first.access > third.access);
  third.start(); first.start();
  third.choose("investigate"); first.choose("investigate");
  assert.ok(first.minutesRemaining > third.minutesRemaining);
});

test("decisions update understandable state rather than a score", () => {
  const state = new GameState(withFamily);
  state.start();
  const before = state.minutesRemaining;
  const result = state.choose("wake-companions");
  assert.equal(result.code, "consequence");
  assert.equal(state.companions, "together");
  assert.ok(state.information > 0);
  assert.ok(state.minutesRemaining < before);
  assert.equal("score" in state, false);
});

test("five changing situations produce separate historical, model, and simulation outcomes", () => {
  const state = new GameState(withFamily);
  state.start();
  state.choose("wake-companions"); state.continue();
  state.choose("follow-crew"); state.continue();
  state.choose("wait-companionway"); state.continue();
  state.choose("nearest-queue"); state.continue();
  const final = state.choose("present-party");
  assert.equal(final.complete, true);
  assert.equal(state.status, "complete");
  assert.ok([0, 1].includes(state.result.simulationOutcome));
  assert.ok([0, 1].includes(state.result.historicalOutcome));
  assert.equal(typeof state.result.modelProbability, "number");
  assert.equal(state.result.decisions.length, 5);
  assert.equal(state.history.length, 5);
});

test("the same profile and path are reproducible for testing", () => {
  const play = () => {
    const state = new GameState(travellingAlone);
    state.start();
    state.choose("investigate"); state.continue();
    state.choose("nearest-stairs"); state.continue();
    state.choose("service-stair"); state.continue();
    state.choose("cross-deck"); state.continue();
    state.choose("seek-opening");
    return state.result;
  };
  assert.deepEqual(play(), play());
});

test("route, congestion, and deck position persist across decisions", () => {
  const state = new GameState(withFamily);
  state.start();
  state.choose("wait"); state.continue();
  state.choose("follow-crew"); state.continue();
  state.choose("wait-companionway");
  assert.equal(state.routeStatus, "congested");
  assert.equal(state.deckLevel, 2);
  assert.ok(state.crowding >= 3);
  assert.equal(state.history.at(-1).location, "upper-landing");
});
