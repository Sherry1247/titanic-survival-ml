import { ALL_PASSENGERS } from "./data/analysis.js";
import { createDataStory } from "./ui/data-story.js";
import { createExplore } from "./ui/explore.js";
import { createGameExperience } from "./ui/game-experience.js";
import { createModelLab } from "./ui/model-lab.js";
import { renderProvenance } from "./ui/provenance.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let lang = "en";
try { lang = localStorage.getItem("titanic-lang") || "en"; } catch { /* storage may be unavailable */ }

let explore;
const gameExperience = createGameExperience({
  root: $("#game-root"),
  passengers: ALL_PASSENGERS,
  getLanguage: () => lang,
  onExplore(passenger) { explore?.focusPassenger(passenger); },
});

createDataStory({ stage: $("#story-visual"), scenes: $$("[data-scene]") });
explore = createExplore({
  form: $("#explore-filters"),
  plot: $("#explore-plot"),
  count: $("#cohort-count"),
  list: $("#passenger-index"),
  dossierRoot: $("#passenger-dossier"),
  comparisonRoot: $("#cohort-comparison"),
  resetButton: $("#filters-reset"),
  undoButton: $("#filters-undo"),
  saveAButton: $("#save-cohort-a"),
  saveBButton: $("#save-cohort-b"),
});
createModelLab({ root: $("#model-lab-root") });
renderProvenance($("#provenance-root"));

function applyLanguage() {
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  $$('[data-en][data-zh]').forEach((element) => {
    element.textContent = element.dataset[lang];
  });
  $("#language-toggle").textContent = lang === "en" ? "中文" : "EN";
  gameExperience.rerender();
}

$("#language-toggle").addEventListener("click", () => {
  lang = lang === "en" ? "zh" : "en";
  try { localStorage.setItem("titanic-lang", lang); } catch { /* keep session language */ }
  applyLanguage();
});

const intro = $("#intro");
let storyIndex = 0;
const storySlides = $$("[data-story-slide]");
let storyTimeline = null;

function animateStory(slide) {
  if (!window.gsap || reducedMotion()) return;
  storyTimeline = window.gsap.timeline({ defaults: { ease: "power1.out" } });
  const copy = slide.querySelector(".story-slide__copy");
  if (copy) storyTimeline.fromTo(copy, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.36, clearProps: "transform,opacity,visibility" });
  const impact = slide.querySelector(".impact-line");
  if (impact) storyTimeline.fromTo(impact, { scaleY: 0, transformOrigin: "top" }, { scaleY: 1, duration: 0.55, clearProps: "transform" }, "<");
}

function renderStory() {
  storyTimeline?.kill();
  storyTimeline = null;
  storySlides.forEach((slide, index) => {
    slide.removeAttribute("style");
    slide.querySelector(".story-slide__copy")?.removeAttribute("style");
    slide.querySelector(".impact-line")?.removeAttribute("style");
    slide.classList.toggle("is-active", index === storyIndex);
    slide.setAttribute("aria-hidden", String(index !== storyIndex));
  });
  $("#story-progress").innerHTML = storySlides.map((_, index) => `<i class="${index <= storyIndex ? "is-active" : ""}"></i>`).join("");
  $("#story-prev").disabled = storyIndex === 0;
  $("#story-next").hidden = storyIndex === storySlides.length - 1;
  animateStory(storySlides[storyIndex]);
}

function closeIntro(target = "#top") {
  if (!intro || intro.classList.contains("is-hidden")) return;
  intro.classList.add("is-hidden");
  document.body.classList.remove("intro-open");
  $(".masthead")?.removeAttribute("inert");
  $("#main")?.removeAttribute("inert");
  const finish = () => {
    intro.hidden = true;
    const destination = $(target);
    destination?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    destination?.setAttribute("tabindex", "-1");
    destination?.focus({ preventScroll: true });
  };
  if (reducedMotion()) finish(); else setTimeout(finish, 500);
}

$("#story-next").addEventListener("click", () => { storyIndex = Math.min(storyIndex + 1, storySlides.length - 1); renderStory(); });
$("#story-prev").addEventListener("click", () => { storyIndex = Math.max(storyIndex - 1, 0); renderStory(); });
$("#skip-intro").addEventListener("click", () => closeIntro("#top"));
$("#enter-story").addEventListener("click", () => closeIntro("#experience"));
$("#intro-explore").addEventListener("click", () => closeIntro("#explore"));
intro.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeIntro("#top");
  if (event.key !== "Tab") return;
  const focusable = [...intro.querySelectorAll("button:not([hidden]):not([disabled])")];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

document.body.classList.add("intro-open");
$(".masthead")?.setAttribute("inert", "");
$("#main")?.setAttribute("inert", "");
renderStory();
applyLanguage();
setTimeout(() => $("#story-next")?.focus(), 0);
window.__titanicGameReady = true;
