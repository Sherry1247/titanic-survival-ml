import { GAME_PHASE_COUNT, sceneFor, startingCircumstances } from "../data/game-scenarios.js";

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

function deterministicDraw(passengerId, decisions) {
  const input = `${passengerId}:${decisions.join("|")}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export class GameState {
  constructor(passenger = null) {
    this.assignPassenger(passenger);
  }

  assignPassenger(passenger) {
    this.passenger = passenger;
    this.status = passenger ? "profile" : "selecting";
    this.phaseIndex = 0;
    this.decisions = [];
    this.history = [];
    this.lastConsequence = null;
    this.result = null;
    this.totalPhases = GAME_PHASE_COUNT;
    if (passenger) Object.assign(this, startingCircumstances(passenger));
  }

  start() {
    if (!this.passenger) return { ok: false, code: "choose-passenger" };
    this.status = "deciding";
    return { ok: true, code: "started", scene: this.currentScene() };
  }

  currentScene() {
    if (!this.passenger || this.status === "complete") return null;
    return sceneFor(this, this.passenger);
  }

  choose(choiceId) {
    if (this.status !== "deciding") return { ok: false, code: "not-deciding" };
    const scene = this.currentScene();
    const choice = scene?.choices.find((item) => item.id === choiceId);
    if (!choice) return { ok: false, code: "unknown-choice" };
    const effect = choice.effect;
    this.minutesRemaining = Math.max(0, this.minutesRemaining + (effect.minutes ?? 0));
    this.information = Math.max(0, this.information + (effect.information ?? 0));
    this.access = Math.max(0, this.access + (effect.access ?? 0));
    this.risk = Math.max(0, this.risk + (effect.risk ?? 0));
    this.crowding = Math.max(0, this.crowding + (effect.crowding ?? 0));
    if (effect.location) this.location = effect.location;
    if (effect.deckLevel !== undefined) this.deckLevel = effect.deckLevel;
    if (effect.routeStatus) this.routeStatus = effect.routeStatus;
    if (effect.lifeboatAccess) this.lifeboatAccess = effect.lifeboatAccess;
    if (effect.companions) this.companions = effect.companions;
    if (effect.boarding) this.boarding = effect.boarding;
    this.decisions.push(choice.id);
    this.phaseIndex += 1;
    this.lastConsequence = { sceneId: scene.id, choiceId, copy: choice.consequence };
    this.history.push({
      sceneId: scene.id,
      choiceId,
      consequence: choice.consequence,
      minutesRemaining: this.minutesRemaining,
      location: this.location,
      deckLevel: this.deckLevel,
    });
    if (this.phaseIndex >= GAME_PHASE_COUNT) {
      this.finish();
      return { ok: true, code: "complete", complete: true, consequence: this.lastConsequence };
    }
    this.status = "consequence";
    return { ok: true, code: "consequence", complete: false, consequence: this.lastConsequence };
  }

  continue() {
    if (this.status !== "consequence") return { ok: false, code: "no-consequence" };
    this.status = "deciding";
    return { ok: true, code: "continued", scene: this.currentScene() };
  }

  finish() {
    const baseline = this.passenger.modelProbability;
    const timeEffect = this.minutesRemaining >= 115 ? 0.06 : this.minutesRemaining >= 90 ? 0.02 : -0.05;
    const accessEffect = clamp(this.access, 0, 7) * 0.014;
    const informationEffect = clamp(this.information, 0, 5) * 0.012;
    const riskEffect = clamp(this.risk, 0, 5) * -0.022;
    const crowdingEffect = clamp(this.crowding, 0, 6) * -0.008;
    const locationEffect = ["loading-gate", "loading-edge"].includes(this.location) ? 0.035 : this.deckLevel === 0 ? 0.012 : -0.025;
    const groupEffect = this.boarding === "together" && !this.passenger.isAlone ? -0.035 : 0;
    const simulationProbability = clamp(baseline + timeEffect + accessEffect + informationEffect + riskEffect + crowdingEffect + locationEffect + groupEffect, 0.03, 0.97);
    const draw = deterministicDraw(this.passenger.id, this.decisions);
    this.status = "complete";
    this.result = {
      passengerId: this.passenger.id,
      simulationOutcome: draw < simulationProbability ? 1 : 0,
      simulationProbability,
      modelProbability: baseline,
      historicalOutcome: this.passenger.survived,
      decisions: [...this.decisions],
      finalState: {
        minutesRemaining: this.minutesRemaining,
        location: this.location,
        companions: this.companions,
        information: this.information,
        access: this.access,
        risk: this.risk,
        crowding: this.crowding,
        routeStatus: this.routeStatus,
        lifeboatAccess: this.lifeboatAccess,
      },
    };
    return this.result;
  }

  reset() {
    this.assignPassenger(this.passenger);
  }
}
