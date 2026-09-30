import test from "node:test";
import assert from "node:assert/strict";

import { PASSENGERS, getPassenger } from "../data/passengers.js";
import { GameState } from "../engine/game-state.js";

test("commander mode fills four seats, prevents duplicates, and completes", () => {
  const state = new GameState("captain");
  assert.equal(state.start().ok, true);

  const chosen = ["p2", "p8", "p15", "p21"];
  assert.equal(state.boardPassenger(getPassenger(chosen[0])).remaining, 3);
  assert.equal(state.boardPassenger(getPassenger(chosen[0])).code, "already-aboard");
  state.boardPassenger(getPassenger(chosen[1]));
  state.boardPassenger(getPassenger(chosen[2]));
  const finalMove = state.boardPassenger(getPassenger(chosen[3]));

  assert.equal(finalMove.complete, true);
  assert.equal(state.status, "won");
  assert.deepEqual(state.boardedPassengerIds, chosen);
  assert.equal(
    state.score,
    chosen.reduce((total, id) => total + getPassenger(id).priorityPoints, 0),
  );
  assert.deepEqual(state.result.passengerIds, state.boardedPassengerIds);
});

test("passenger mode requires a passenger and follows the route in order", () => {
  const state = new GameState("passenger");
  assert.equal(state.start().code, "choose-passenger");

  state.selectPassenger("p8");
  state.start();
  const wrongMove = state.moveTo("deck");
  assert.equal(wrongMove.code, "wrong-route");
  assert.equal(state.seconds, 45);
  assert.equal(state.node, "cabin");

  assert.equal(state.moveTo("stairs").code, "reached-stairs");
  assert.equal(state.moveTo("deck").code, "reached-deck");
  const finalMove = state.moveTo("boat");

  assert.equal(finalMove.complete, true);
  assert.equal(state.status, "won");
  assert.equal(state.score, 120);
  assert.deepEqual(state.result.passengerIds, ["p8"]);
});

test("timer ends an active watch without producing a winning score", () => {
  const state = new GameState("captain");
  state.start();
  const result = state.tick(60);

  assert.equal(result.code, "timeout");
  assert.equal(state.status, "lost");
  assert.equal(state.result.status, "lost");
});

test("every passenger has localized clue text and a numeric score", () => {
  for (const passenger of PASSENGERS) {
    assert.ok(passenger.details.en.meta);
    assert.ok(passenger.details.zh.meta);
    assert.ok(passenger.details.en.clue);
    assert.equal(typeof passenger.priorityPoints, "number");
    assert.equal(typeof passenger.probability, "number");
    assert.ok([0, 1].includes(passenger.historicalOutcome));
  }
});
