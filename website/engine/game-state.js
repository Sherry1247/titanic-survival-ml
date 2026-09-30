import { getLevel } from "../data/levels.js";
import {
  captainPassengerPoints,
  passengerTimeBonus,
  routeStepPoints,
} from "./scoring.js";
import { isRouteComplete, nextRouteTarget } from "./level-manager.js";

export class GameState {
  constructor(mode = "captain") {
    this.setMode(mode);
  }

  setMode(mode) {
    this.mode = mode;
    this.level = getLevel(mode);
    this.selectedPassengerId = null;
    this.reset({ preserveSelection: false });
  }

  reset({ preserveSelection = this.mode === "passenger" } = {}) {
    if (!preserveSelection) this.selectedPassengerId = null;
    this.status = "ready";
    this.seconds = this.level.duration;
    this.score = 0;
    this.boardedPassengerIds = [];
    this.node = this.level.route[0] ?? "cabin";
    this.result = null;
  }

  selectPassenger(id) {
    if (this.boardedPassengerIds.includes(id)) {
      return { ok: false, code: "already-aboard" };
    }
    this.selectedPassengerId = id;
    return { ok: true, code: "selected" };
  }

  start() {
    if (this.mode === "passenger" && !this.selectedPassengerId) {
      return { ok: false, code: "choose-passenger" };
    }
    const selectedPassengerId = this.selectedPassengerId;
    this.reset({ preserveSelection: true });
    this.selectedPassengerId = selectedPassengerId;
    this.status = "running";
    return { ok: true, code: "started" };
  }

  tick(amount = 1) {
    if (this.status !== "running") return { ok: false, code: "not-running" };
    this.seconds = Math.max(0, this.seconds - amount);
    if (this.seconds === 0) {
      this.status = "lost";
      this.result = { mode: this.mode, status: "lost", score: this.score };
      return { ok: true, code: "timeout", complete: true };
    }
    return { ok: true, code: "tick", complete: false };
  }

  boardPassenger(passenger) {
    if (this.status !== "running") return { ok: false, code: "not-running" };
    if (!passenger) return { ok: false, code: "choose-passenger" };
    if (this.boardedPassengerIds.includes(passenger.id)) {
      return { ok: false, code: "already-aboard" };
    }
    if (this.boardedPassengerIds.length >= this.level.capacity) {
      return { ok: false, code: "boat-full" };
    }

    this.boardedPassengerIds.push(passenger.id);
    this.score += captainPassengerPoints(passenger);
    this.selectedPassengerId = null;
    const complete = this.boardedPassengerIds.length === this.level.capacity;
    if (complete) {
      this.status = "won";
      this.result = {
        mode: this.mode,
        status: "won",
        score: this.score,
        passengerIds: [...this.boardedPassengerIds],
        seconds: this.seconds,
      };
    }
    return {
      ok: true,
      code: complete ? "captain-complete" : "passenger-aboard",
      complete,
      remaining: this.level.capacity - this.boardedPassengerIds.length,
    };
  }

  moveTo(target) {
    if (this.status !== "running") return { ok: false, code: "not-running" };
    const expected = nextRouteTarget(this.level.route, this.node);
    if (target !== expected) {
      this.seconds = Math.max(0, this.seconds - this.level.wrongRoutePenalty);
      if (this.seconds === 0) {
        this.status = "lost";
        this.result = { mode: this.mode, status: "lost", score: this.score };
      }
      return {
        ok: false,
        code: "wrong-route",
        penalty: this.level.wrongRoutePenalty,
        complete: this.status === "lost",
      };
    }

    this.node = target;
    this.score += routeStepPoints(this.level);
    const complete = isRouteComplete(this.level.route, this.node);
    if (complete) {
      this.score += passengerTimeBonus(this.seconds);
      this.status = "won";
      this.result = {
        mode: this.mode,
        status: "won",
        score: this.score,
        passengerIds: [this.selectedPassengerId],
        seconds: this.seconds,
      };
    }
    return {
      ok: true,
      code: complete ? "passenger-complete" : `reached-${target}`,
      complete,
      target,
    };
  }
}
