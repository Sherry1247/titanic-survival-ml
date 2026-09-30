import { PASSENGERS, getPassenger } from "./data/passengers.js";
import { translate } from "./data/translations.js";
import { GameState } from "./engine/game-state.js";
import { nextRouteTarget, routeProgress } from "./engine/level-manager.js";
import { renderPassengerPanel } from "./ui/passenger-panel.js";
import { renderResultPanel } from "./ui/result-panel.js";
import { renderModelAnalysis } from "./ui/model-analysis.js";
import { bindDropTarget, renderShipMap } from "./ui/ship-map.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const memoryStorage = new Map();
const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStorage.get(key) ?? null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStorage.set(key, value);
    }
  },
};

let lang = storage.get("titanic-lang") || "en";
let game = new GameState("captain");
let timer = null;

const t = (key, values) => translate(lang, key, values);

function announce(text) {
  $("#game-message").textContent = text;
}

function saveScore() {
  if (!game.result || game.result.status !== "won") return;
  const list = JSON.parse(storage.get("titanic-scores") || "[]");
  list.push({ mode: game.mode, score: game.score, date: new Date().toLocaleDateString() });
  list.sort((a, b) => b.score - a.score);
  storage.set("titanic-scores", JSON.stringify(list.slice(0, 5)));
}

function renderLeaderboard() {
  const list = JSON.parse(storage.get("titanic-scores") || "[]");
  $("#leaderboard-list").innerHTML = list.length
    ? list.map((entry) => {
        const legacyCaptain = /Commander|指挥官/.test(entry.type || "");
        const type = entry.mode === "captain" || legacyCaptain
          ? t("captainMode")
          : t("passengerMode");
        return `<li>${type} · <b>${entry.score}</b></li>`;
      }).join("")
    : `<li>${t("noScores")}</li>`;
}

function renderMission() {
  const isCaptain = game.mode === "captain";
  $("#mission-objective").textContent = t(isCaptain ? "captainObjective" : "passengerObjective");
  const stepKeys = isCaptain
    ? ["captainStep1", "captainStep2", "captainStep3"]
    : ["passengerStep1", "passengerStep2", "passengerStep3"];
  let activeStep = 0;
  if (game.status === "running") activeStep = isCaptain && !game.selectedPassengerId ? 1 : 2;
  if (game.status === "won") activeStep = 3;
  if (!isCaptain && game.selectedPassengerId && game.status === "ready") activeStep = 1;
  $("#mission-steps").innerHTML = stepKeys.map((key, index) => `
    <li class="${index < activeStep ? "is-done" : ""} ${index === activeStep ? "is-active" : ""}">
      <span>${index < activeStep ? "✓" : index + 1}</span>${t(key)}
    </li>`).join("");
}

function currentPrompt() {
  if (game.status === "lost") return t("timeout");
  if (game.status === "won") return t("resultComplete");
  if (game.status === "ready") {
    if (game.mode === "passenger" && !game.selectedPassengerId) return t("choosePassengerFirst");
    return t("startGame");
  }
  if (game.mode === "captain") {
    return game.selectedPassengerId ? t("boardSelected") : t("captainStep2");
  }
  const target = nextRouteTarget(game.level.route, game.node);
  return target ? t({ stairs: "toStairs", deck: "toDeck", boat: "toBoat" }[target]) : t("resultComplete");
}

function renderMode() {
  document.body.classList.toggle("passenger-mode", game.mode === "passenger");
  $$(".mode-button").forEach((button) => {
    const active = button.dataset.mode === game.mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  const isCaptain = game.mode === "captain";
  $("#mode-title").textContent = t(isCaptain ? "captainModeTitle" : "passengerModeTitle");
  $("#mode-copy").textContent = t(isCaptain ? "captainModeCopy" : "passengerModeCopy");
}

function renderStats() {
  $("#timer").textContent = game.status === "running"
    ? `${t("time")} ${Math.max(0, Math.ceil(game.seconds))}s`
    : t("ready");
  $("#score").textContent = game.score;
  if (game.mode === "captain") {
    $("#capacity").textContent = `${game.boardedPassengerIds.length} / ${game.level.capacity}`;
  } else {
    const progress = routeProgress(game.level.route, game.node);
    $("#capacity").textContent = t("routeProgress", {
      current: progress.completed,
      total: progress.total,
    });
  }
  $("#map-prompt-text").textContent = currentPrompt();
  const startButton = $("#start-game");
  startButton.hidden = game.status === "running";
  startButton.disabled = game.status === "won" || game.status === "lost";

  const action = $("#primary-action");
  const showAction = game.mode === "captain" && game.status === "running";
  action.hidden = !showAction;
  action.disabled = !game.selectedPassengerId;
  action.textContent = game.selectedPassengerId ? t("boardSelected") : t("selectToBoard");
}

function render() {
  renderMode();
  renderMission();
  renderStats();
  renderPassengerPanel({
    container: $("#passenger-list"),
    passengers: PASSENGERS,
    state: game,
    lang,
    t,
    onSelect: selectPassenger,
    onBoard: boardPassenger,
  });
  renderShipMap({ map: $("#ship-map"), state: game, passengers: PASSENGERS, t });
  renderResultPanel({
    container: $("#result-panel"),
    result: game.result,
    passengers: PASSENGERS,
    t,
    onReplay: resetGame,
  });
  renderModelAnalysis({
    container: $("#model-analysis"),
    result: game.result,
    passengers: PASSENGERS,
    lang,
  });
  const locked = $("#model-locked");
  if (locked) locked.hidden = Boolean(game.result);
  renderLeaderboard();
}

function moveToAnalysis() {
  setTimeout(() => $("#model-room")?.scrollIntoView({ behavior: "smooth", block: "start" }), 450);
}

function selectPassenger(id, { quiet = false } = {}) {
  const passenger = getPassenger(id);
  const outcome = game.selectPassenger(id);
  if (!outcome.ok) {
    if (!quiet) announce(t("alreadyAboard"));
    return;
  }
  if (!quiet) {
    const key = game.mode === "passenger"
      ? "passengerSelectedMessage"
      : game.status === "running" ? "selectedRunningMessage" : "selectedMessage";
    announce(t(key, { name: passenger.name }));
  }
  render();
}

function startGame() {
  const outcome = game.start();
  if (!outcome.ok) {
    announce(t("choosePassengerFirst"));
    return;
  }
  clearInterval(timer);
  timer = setInterval(() => {
    const tick = game.tick();
    if (tick.code === "timeout") {
      clearInterval(timer);
      announce(t("timeout"));
    }
    render();
  }, 1000);
  announce(t(game.mode === "captain" ? "captainStarted" : "passengerStarted"));
  render();
}

function resetGame() {
  clearInterval(timer);
  game.reset();
  announce(
    game.mode === "passenger" && game.selectedPassengerId
      ? t("resetPassenger", { name: getPassenger(game.selectedPassengerId).name })
      : t("resetReady"),
  );
  render();
}

function boardPassenger(id = game.selectedPassengerId) {
  if (id && game.selectedPassengerId !== id) game.selectPassenger(id);
  const passenger = getPassenger(id ?? game.selectedPassengerId);
  const outcome = game.boardPassenger(passenger);
  if (!outcome.ok) {
    const messages = {
      "not-running": "startFirst",
      "choose-passenger": "choosePassengerFirst",
      "already-aboard": "alreadyAboard",
      "boat-full": "boatFull",
    };
    announce(t(messages[outcome.code] ?? "choosePassengerFirst"));
    render();
    return;
  }
  if (outcome.complete) {
    clearInterval(timer);
    saveScore();
    announce(t("captainResult", {
      count: game.result.passengerIds.length,
      score: game.score,
    }));
  } else {
    announce(t("passengerAboard", { name: passenger.name, remaining: outcome.remaining }));
  }
  render();
  if (outcome.complete) moveToAnalysis();
}

function movePassenger(target) {
  const outcome = game.moveTo(target);
  if (!outcome.ok) {
    if (outcome.code === "not-running") announce(t("startFirst"));
    if (outcome.code === "wrong-route") {
      announce(t("wrongRoute", { penalty: outcome.penalty }));
      if (outcome.complete) clearInterval(timer);
    }
    render();
    return;
  }
  const messages = { "reached-stairs": "reachedStairs", "reached-deck": "reachedDeck" };
  if (outcome.complete) {
    clearInterval(timer);
    saveScore();
    announce(t("passengerResult", {
      seconds: Math.ceil(game.seconds),
      score: game.score,
    }));
  } else {
    announce(t(messages[outcome.code]));
  }
  render();
  if (outcome.complete) moveToAnalysis();
}

function applyLanguage() {
  document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  $$('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  $("#language-toggle").textContent = lang === "en" ? "中文" : "EN";
  render();
}

function handleKeyboardClick(element, callback) {
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  });
}

$$(".mode-button").forEach((button) => button.addEventListener("click", () => {
  clearInterval(timer);
  game = new GameState(button.dataset.mode);
  announce(t("resetReady"));
  render();
}));
$("#start-game").addEventListener("click", startGame);
$("#reset-game").addEventListener("click", resetGame);
$("#primary-action").addEventListener("click", () => boardPassenger());

const lifeboat = $("#lifeboat");
bindDropTarget(lifeboat, (id) => {
  if (game.mode === "captain") boardPassenger(id || game.selectedPassengerId);
});
lifeboat.addEventListener("click", () => {
  if (game.mode === "captain") boardPassenger();
});
handleKeyboardClick(lifeboat, () => {
  if (game.mode === "captain") boardPassenger();
});

$$(".route-target").forEach((target) => {
  const move = () => {
    if (game.mode === "passenger") movePassenger(target.dataset.target);
  };
  target.addEventListener("click", move);
  bindDropTarget(target, move);
});
$("#player-token").addEventListener("dragstart", (event) => {
  event.dataTransfer?.setData("text/plain", "player");
});

$("#language-toggle").addEventListener("click", () => {
  lang = lang === "en" ? "zh" : "en";
  storage.set("titanic-lang", lang);
  applyLanguage();
});
$$("[data-scroll-game]").forEach((button) => button.addEventListener("click", () => {
  $("#game").scrollIntoView({ behavior: "smooth" });
}));

function closeIntro({ goToGame = true } = {}) {
  const intro = $("#intro");
  if (!intro) return;
  intro.classList.add("is-hidden");
  document.body.classList.add("js-ready");
  setTimeout(() => intro.remove(), 800);
  if (goToGame) setTimeout(() => $("#game")?.scrollIntoView({ behavior: "smooth" }), 850);
}

let storyIndex = 0;
const storySlides = $$("[data-story-slide]");

function renderStory() {
  storySlides.forEach((slide, index) => slide.classList.toggle("is-active", index === storyIndex));
  const progress = $("#story-progress");
  if (progress) {
    progress.innerHTML = storySlides.map((_, index) => `<i class="${index <= storyIndex ? "is-active" : ""}"></i>`).join("");
  }
  const previous = $("#story-prev");
  const next = $("#story-next");
  if (previous) previous.disabled = storyIndex === 0;
  if (next) next.hidden = storyIndex === storySlides.length - 1;
}

$("#story-next")?.addEventListener("click", () => {
  storyIndex = Math.min(storySlides.length - 1, storyIndex + 1);
  renderStory();
});
$("#story-prev")?.addEventListener("click", () => {
  storyIndex = Math.max(0, storyIndex - 1);
  renderStory();
});
$("#enter-game")?.addEventListener("click", () => closeIntro({ goToGame: true }));
$("#skip-intro")?.addEventListener("click", () => closeIntro({ goToGame: true }));

applyLanguage();
announce(t("resetReady"));
renderStory();
window.__titanicGameReady = true;
