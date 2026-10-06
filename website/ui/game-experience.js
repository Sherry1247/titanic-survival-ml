import { comparableCohorts } from "../data/analysis.js";
import { GameState } from "../engine/game-state.js";
import { classLabel, escapeHtml, pct, portLabel, recorded } from "./format.js";

const GAME_POOL_IDS = [2, 8, 15, 22, 44, 59, 184, 194, 298, 308, 450, 473, 505, 619, 691, 751, 803, 856];

const copy = (value, lang) => value?.[lang] ?? value?.en ?? "";

function transition(container) {
  if (!window.gsap || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  window.gsap.fromTo(container, { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, duration: 0.36, ease: "power1.out", clearProps: "transform,opacity,visibility" });
}

function focusGamePanel(root, selector) {
  const panel = root.querySelector(selector);
  if (!panel) return;
  panel.setAttribute("tabindex", "-1");
  requestAnimationFrame(() => {
    root.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    panel.focus({ preventScroll: true });
  });
}

const stateCopy = {
  companions: {
    alone: { en: "Travelling alone", zh: "独自旅行" },
    together: { en: "Party together", zh: "同行者在一起" },
    group: { en: "With a passenger group", zh: "跟随乘客人群" },
  },
  routes: {
    uncertain: { en: "No confirmed route", zh: "路线尚未确认" },
    directed: { en: "Crew-directed route", zh: "船员指引路线" },
    "self-directed": { en: "Self-directed route", zh: "自行选择路线" },
    delayed: { en: "Delayed route", zh: "路线延误" },
    congested: { en: "Congested route", zh: "路线拥堵" },
    unverified: { en: "Unverified route", zh: "未经确认的路线" },
  },
};

function clockTime(minutesRemaining) {
  const elapsed = 160 - minutesRemaining;
  const total = (23 * 60 + 40 + elapsed) % (24 * 60);
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function profileDetails(passenger, lang) {
  const zh = lang === "zh";
  return [
    [zh ? "年龄" : "Age", passenger.age === null ? (zh ? "未记录" : "Not recorded") : passenger.age],
    [zh ? "性别" : "Sex", passenger.sex === "female" ? (zh ? "女性" : "Female") : (zh ? "男性" : "Male")],
    [zh ? "舱位" : "Class", zh ? `${passenger.pclass}等舱` : classLabel(passenger.pclass)],
    [zh ? "同行情况" : "Party", passenger.isAlone ? (zh ? "独自旅行" : "Travelling alone") : (zh ? `${passenger.familySize}人家庭记录` : `Family record of ${passenger.familySize}`)],
    [zh ? "登船港" : "Embarked", portLabel(passenger.embarked)],
    [zh ? "船舱" : "Cabin", recorded(passenger.cabin, zh ? "未记录" : "Not recorded")],
  ];
}

export function createGameExperience({ root, passengers, getLanguage, onExplore }) {
  let state = new GameState();

  function drawPassenger() {
    const pool = GAME_POOL_IDS.map((id) => passengers.find((passenger) => passenger.id === id)).filter(Boolean);
    const alternatives = pool.filter((passenger) => passenger.id !== state.passenger?.id);
    const random = globalThis.crypto?.getRandomValues
      ? globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
      : Math.random();
    state.assignPassenger(alternatives[Math.floor(random * alternatives.length)] ?? pool[0]);
    renderProfile();
  }

  function renderLaunch() {
    const lang = getLanguage();
    const zh = lang === "zh";
    root.innerHTML = `
      <div class="game-launch">
        <p class="phase-marker">${zh ? "1912年4月14日 · 北大西洋" : "14 APRIL 1912 · NORTH ATLANTIC"}</p>
        <h3>${zh ? "打开一份封存的乘客记录。" : "Open a sealed passenger record."}</h3>
        <p>${zh ? "系统会从数据集中抽取一名真实记录乘客。你不会挑选一个‘容易获胜’的角色；舱位、年龄、家庭和记录缺失将决定你的起始处境。" : "A recorded passenger will be drawn from the dataset. You do not choose an easy role: class, age, family, and missing records shape the situation you inherit."}</p>
        <ul class="game-rules"><li>${zh ? "五个不断变化的局势" : "Five changing situations"}</li><li>${zh ? "路线、时间与同行者会持续变化" : "Routes, time, and companions persist"}</li><li>${zh ? "没有即时的正确答案提示" : "No instant right-answer labels"}</li></ul>
        <button class="action-primary" id="draw-record" type="button">${zh ? "打开记录并开始" : "Open the record"}</button>
      </div>`;
    root.querySelector("#draw-record").addEventListener("click", drawPassenger);
    transition(root);
  }

  function renderProfile() {
    const lang = getLanguage();
    const zh = lang === "zh";
    const passenger = state.passenger;
    root.innerHTML = `
      <div class="passenger-record">
        <div class="record-heading"><span>WHITE STAR LINE · PASSENGER RECORD</span><strong>NO. ${String(passenger.id).padStart(3, "0")}</strong></div>
        <h3>${escapeHtml(passenger.name)}</h3>
        <dl>${profileDetails(passenger, lang).map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
        ${passenger.cabin === null ? `<p class="record-warning">${zh ? "船舱位置未记录。游戏不会为这名乘客虚构具体船舱。" : "Cabin location was not recorded. The game will not invent a specific cabin for this passenger."}</p>` : ""}
      </div>
      <div class="manifest-brief"><strong>${zh ? "你的起始处境" : "Your starting circumstance"}</strong><span>${copy(state.locationLabel, lang)} · ${state.companions === "alone" ? (zh ? "独自旅行" : "travelling alone") : (zh ? "同行者在附近" : "companions nearby")}</span></div>
      <div class="game-actions"><button class="action-primary" id="begin-watch" type="button">${zh ? "进入4月14日夜晚" : "Enter the night"}</button><button class="text-action" id="change-profile" type="button">${zh ? "重新抽取记录" : "Draw another record"}</button></div>`;
    root.querySelector("#begin-watch").addEventListener("click", () => { state.start(); renderScene(); });
    root.querySelector("#change-profile").addEventListener("click", drawPassenger);
    transition(root);
  }

  function renderStateLine() {
    const lang = getLanguage();
    const zh = lang === "zh";
    const states = [
      [zh ? "船上时间" : "Ship time", clockTime(state.minutesRemaining)],
      [zh ? "同行者" : "Companions", copy(stateCopy.companions[state.companions] ?? stateCopy.companions.alone, lang)],
      [zh ? "路线状态" : "Route", copy(stateCopy.routes[state.routeStatus] ?? stateCopy.routes.uncertain, lang)],
      [zh ? "可确认信息" : "Confirmed information", state.information >= 3 ? (zh ? "较多" : "several reports") : state.information ? (zh ? "有限" : "limited") : (zh ? "没有" : "none")],
    ];
    return `<dl class="situation-line">${states.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
  }

  function renderShipBoard() {
    const lang = getLanguage();
    const zh = lang === "zh";
    const decks = [
      [0, zh ? "救生艇甲板" : "BOAT DECK"],
      [1, zh ? "A层" : "A DECK"],
      [2, zh ? "B–C层" : "B–C DECKS"],
      [3, zh ? "D–E层" : "D–E DECKS"],
      [4, zh ? "F–G层" : "F–G DECKS"],
    ];
    const latest = state.history.at(-1);
    return `<aside class="evacuation-board" aria-label="${zh ? "当前疏散位置" : "Current evacuation position"}">
      <div class="board-heading"><span>RMS TITANIC</span><time>${clockTime(state.minutesRemaining)}</time></div>
      <div class="ship-cutaway" role="img" aria-label="${zh ? "简化甲板剖面图，显示玩家当前层级；不是精确历史位置图" : "Simplified deck section showing the current level; not an exact historical location map"}">
        ${decks.map(([level, label]) => `<div class="deck-line ${state.deckLevel === level ? "is-current" : ""}"><span>${label}</span><i aria-hidden="true"></i>${state.deckLevel === level ? `<b>${zh ? "你在这里" : "YOU ARE HERE"}</b>` : ""}</div>`).join("")}
      </div>
      <p class="diagram-note">${zh ? "方向示意 · 不代表已知船舱位置" : "Orientation diagram · not a recorded cabin location"}</p>
      ${latest ? `<div class="route-log"><span>${zh ? "最近变化" : "LATEST CHANGE"}</span><p>${copy(latest.consequence, lang)}</p></div>` : ""}
    </aside>`;
  }

  function renderScene() {
    const lang = getLanguage();
    const scene = state.currentScene();
    root.innerHTML = `
      <div class="game-board-layout">
        ${renderShipBoard()}
        <div class="decision-scene" data-phase="${scene.id}">
          <div class="game-time">${scene.time}</div>
          <p class="phase-marker">${lang === "zh" ? `局势 ${state.phaseIndex + 1} / ${state.totalPhases}` : `SITUATION ${state.phaseIndex + 1} / ${state.totalPhases}`}</p>
          <h3>${copy(scene.title, lang)}</h3>
          <p class="scene-copy">${copy(scene.body, lang)}</p>
          ${renderStateLine()}
          <div class="decision-prompt">${lang === "zh" ? "你现在怎么做？" : "What do you do now?"}</div>
          <div class="decision-list">${scene.choices.map((choice, index) => `<button type="button" data-choice="${choice.id}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${copy(choice.label, lang)}</strong>${choice.hint ? `<small>${copy(choice.hint, lang)}</small>` : ""}</button>`).join("")}</div>
        </div>
      </div>`;
    root.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => {
      const outcome = state.choose(button.dataset.choice);
      if (outcome.complete) renderOutcome(); else renderConsequence();
    }));
    transition(root);
    focusGamePanel(root, ".decision-scene");
  }

  function renderConsequence() {
    const lang = getLanguage();
    root.innerHTML = `
      <div class="game-board-layout">
        ${renderShipBoard()}
        <div class="consequence">
          <p class="phase-marker">${lang === "zh" ? "局势已改变" : "THE SITUATION CHANGED"}</p>
          <h3>${copy(state.lastConsequence.copy, lang)}</h3>
          ${renderStateLine()}
          <p>${lang === "zh" ? "你不会立刻知道这是否是正确选择。时间、路线和人群会把它带入下一幕。" : "You do not yet know whether this helped. Time, route, and crowd conditions carry the decision forward."}</p>
          <button class="action-primary" id="continue-watch" type="button">${lang === "zh" ? "查看下一局势" : "Face the next situation"}</button>
        </div>
      </div>`;
    root.querySelector("#continue-watch").addEventListener("click", () => { state.continue(); renderScene(); });
    transition(root);
    focusGamePanel(root, ".consequence");
  }

  function renderOutcome() {
    const lang = getLanguage();
    const zh = lang === "zh";
    const passenger = state.passenger;
    const result = state.result;
    const cohorts = comparableCohorts(passenger);
    root.innerHTML = `
      <div class="outcome-transition">
        <p class="phase-marker">${zh ? "游戏模拟结果" : "GAME SIMULATION OUTCOME"}</p>
        <h3>${result.simulationOutcome ? (zh ? "你在这次模拟中生还。" : "You survived this simulation.") : (zh ? "你在这次模拟中未能生还。" : "You did not survive this simulation.")}</h3>
        <p>${zh ? "这不是对这名历史乘客经历的重建。相同身份和不同决策都可能产生其他模拟结果。" : "This is not a reconstruction of this historical passenger's experience. The same profile and different decisions could produce another simulated outcome."}</p>
      </div>
      <section class="personal-evidence" aria-labelledby="personal-evidence-title">
        <h3 id="personal-evidence-title">${zh ? "你的乘客记录与证据" : "Your passenger record and the evidence"}</h3>
        <dl class="evidence-types">
          <div><dt>${zh ? "历史记录" : "Recorded history"}</dt><dd>${result.historicalOutcome ? (zh ? "生还" : "Survived") : (zh ? "未生还" : "Did not survive")}</dd></div>
          <div><dt>${zh ? "模型估计" : "Model estimate"}</dt><dd>${pct(result.modelProbability)} ${zh ? "生存概率" : "estimated survival probability"}</dd></div>
          <div><dt>${zh ? "游戏模拟" : "Game simulation"}</dt><dd>${result.simulationOutcome ? (zh ? "生还" : "Survived") : (zh ? "未生还" : "Did not survive")}</dd></div>
          <div><dt>${zh ? "玩家决策" : "Player decisions"}</dt><dd>${result.decisions.map((item) => item.replaceAll("-", " ")).join(" → ")}</dd></div>
        </dl>
        <h4>${zh ? "类似乘客的历史结果" : "How similar recorded passengers fared"}</h4>
        <div class="cohort-lines">${cohorts.map((cohort) => `<div><span>${escapeHtml(cohort.label)}</span><strong>${cohort.survived} / ${cohort.total}</strong><b>${pct(cohort.rate)}</b><small>95% CI ${pct(cohort.low)}–${pct(cohort.high)}${cohort.smallSample ? ` · ${zh ? "小样本" : "small sample"}` : ""}</small></div>`).join("")}</div>
        <p class="evidence-conclusion">${zh ? "你的结果只是历史模式中的一种可能。记录展示关联，但不能证明某个变量导致了个人结局。" : "Your outcome was one possibility within a historical pattern. The records show associations; they cannot prove that one variable caused an individual's outcome."}</p>
        <div class="game-actions"><button class="action-primary" id="explore-profile" type="button">${zh ? "探索类似乘客" : "Explore similar passengers"}</button><button class="text-action" id="replay" type="button">${zh ? "用同一记录重新开始" : "Replay this record"}</button><button class="text-action" id="new-record" type="button">${zh ? "打开另一份记录" : "Open another record"}</button></div>
      </section>`;
    root.querySelector("#explore-profile").addEventListener("click", () => onExplore(passenger));
    root.querySelector("#replay").addEventListener("click", () => { state.reset(); renderProfile(); });
    root.querySelector("#new-record").addEventListener("click", () => { state = new GameState(); renderLaunch(); });
    transition(root);
    focusGamePanel(root, ".outcome-transition");
  }

  function rerender() {
    if (state.status === "selecting") renderLaunch();
    else if (state.status === "profile") renderProfile();
    else if (state.status === "deciding") renderScene();
    else if (state.status === "consequence") renderConsequence();
    else renderOutcome();
  }

  renderLaunch();
  return { rerender, getState: () => state };
}
