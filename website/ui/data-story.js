import { ALL_PASSENGERS, embarkationRates, familyRates, missingness, sexClassRates, ticketGroupRates } from "../data/analysis.js";
import { escapeHtml, pct } from "./format.js";

function rateLine(item, label) {
  const left = item.low * 100;
  const width = Math.max(0.6, (item.high - item.low) * 100);
  return `<div class="rate-line">
    <span class="rate-line__label">${escapeHtml(label)}</span>
    <span class="rate-line__measure" aria-hidden="true"><i style="inset-inline-start:${left}%;width:${width}%"></i><b style="inset-inline-start:${item.rate * 100}%"></b></span>
    <strong>${item.survived} / ${item.total}</strong><em>${pct(item.rate)}</em>
    <small>95% CI ${pct(item.low)}–${pct(item.high)}${item.smallSample ? " · small sample" : ""}</small>
  </div>`;
}

function sexClassScene() {
  const rows = sexClassRates();
  return `<div class="visual-document"><h3>Survival by sex within passenger class</h3><p>Recorded association, not a causal estimate.</p>${[1, 2, 3].map((pclass) => `<section class="rate-group"><h4>${["", "First", "Second", "Third"][pclass]} class</h4>${rows.filter((row) => row.pclass === pclass).map((row) => rateLine(row, row.sex === "female" ? "Female" : "Male")).join("")}</section>`).join("")}</div>`;
}

function passengerScene() {
  const width = 760;
  const height = 430;
  const known = ALL_PASSENGERS.filter((row) => row.age !== null);
  const x = (age) => 45 + (Math.min(80, age) / 80) * 590;
  const y = (fare) => 370 - (Math.log1p(fare) / Math.log1p(520)) * 310;
  const points = ALL_PASSENGERS.map((row) => {
    const px = row.age === null ? 705 : x(row.age);
    const py = row.age === null ? 80 + (row.id % 260) : y(row.fare);
    const shape = row.sex === "female"
      ? `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.2" />`
      : `<rect x="${(px - 3).toFixed(1)}" y="${(py - 3).toFixed(1)}" width="6" height="6" />`;
    return `<g class="passenger-mark ${row.survived ? "is-survived" : "is-lost"}" data-passenger-id="${row.id}"><title>${escapeHtml(row.name)} · age ${row.age ?? "not recorded"} · fare £${row.fare.toFixed(2)} · class ${row.pclass} · ${row.survived ? "survived" : "did not survive"}</title>${shape}</g>`;
  }).join("");
  return `<div class="visual-document"><h3>Each mark is one passenger record</h3><p>${known.length} recorded ages; ${ALL_PASSENGERS.length - known.length} ages not recorded. Fare uses a logarithmic vertical scale.</p><svg class="passenger-plot" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="passenger-plot-title passenger-plot-desc"><title id="passenger-plot-title">Passenger age and fare distribution</title><desc id="passenger-plot-desc">Filled marks survived; hollow marks did not. Circles represent female records and squares male records. Unknown ages occupy a separate right-hand lane.</desc><line x1="45" y1="370" x2="635" y2="370"/><line x1="45" y1="60" x2="45" y2="370"/><line x1="665" y1="45" x2="665" y2="390" class="unknown-rule"/><text x="45" y="410">Age 0</text><text x="600" y="410">80+</text><text x="676" y="410">Age not recorded</text><text x="48" y="48">Higher fare (£, log scale)</text>${points}</svg><div class="chart-key"><span><i class="key-fill"></i>Survived</span><span><i class="key-outline"></i>Did not survive</span><span>○ female</span><span>□ male</span></div></div>`;
}

function familyScene() {
  const families = familyRates();
  const tickets = ticketGroupRates();
  return `<div class="visual-document"><h3>Family size and ticket-party size are related—not identical</h3><div class="paired-rates"><section><h4>Recorded family size</h4>${families.map((row) => rateLine(row, `${row.label} ${row.label === "1" ? "person" : "people"}`)).join("")}</section><section><h4>Passengers sharing a ticket</h4>${tickets.map((row) => rateLine(row, `${row.label} per ticket`)).join("")}</section></div><p class="chart-note">Family size is constructed from siblings/spouses and parents/children. Ticket group size counts repeated ticket numbers; neither perfectly identifies a travelling household.</p></div>`;
}

function embarkationScene(pclass = null) {
  const rows = embarkationRates(ALL_PASSENGERS, pclass);
  const names = { C: "Cherbourg", Q: "Queenstown", S: "Southampton", "Not recorded": "Not recorded" };
  return `<div class="visual-document"><h3>${pclass ? `Survival by port within class ${pclass}` : "Raw survival by embarkation port"}</h3><div class="stratify-control" role="group" aria-label="Stratify embarkation rates by class"><button type="button" data-port-class="" aria-pressed="${pclass === null}">All classes</button>${[1, 2, 3].map((value) => `<button type="button" data-port-class="${value}" aria-pressed="${pclass === value}">Class ${value}</button>`).join("")}</div>${rows.map((row) => rateLine(row, names[row.label] ?? row.label)).join("")}<p class="chart-note">The raw port relationship changes after stratifying by class. Port is not presented as a cause of survival.</p></div>`;
}

function missingScene() {
  const items = missingness();
  return `<div class="visual-document missing-document"><h3>Absence is part of the record</h3>${items.map((item) => `<div class="missing-line"><div><strong>${item.field}</strong><span>${item.missing} of ${item.total} records missing</span></div><b>${pct(item.rate)}</b><i><span style="width:${item.rate * 100}%"></span></i></div>`).join("")}<p>“Not recorded” is not a deck, age, or port. Cabin missingness is especially extensive and is related to which passengers were documented; it cannot be treated as a neutral location category.</p></div>`;
}

const renderers = { disparity: sexClassScene, passengers: passengerScene, family: familyScene, embarkation: () => embarkationScene(), missingness: missingScene };

export function createDataStory({ stage, scenes }) {
  let active = "disparity";
  const render = (name) => {
    active = name;
    stage.innerHTML = renderers[name]();
    if (name === "embarkation") bindEmbarkation(stage);
    document.querySelectorAll(`[data-mobile-visual="${name}"]`).forEach((node) => {
      node.innerHTML = renderers[name]();
      if (name === "embarkation") bindEmbarkation(node);
    });
    if (window.gsap && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.gsap.fromTo(stage.firstElementChild, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.32, ease: "power1.out", clearProps: "transform,opacity,visibility" });
    }
  };
  const bindEmbarkation = (container) => container.querySelectorAll("[data-port-class]").forEach((button) => button.addEventListener("click", () => {
    const value = button.dataset.portClass ? Number(button.dataset.portClass) : null;
    container.innerHTML = embarkationScene(value);
    bindEmbarkation(container);
  }));

  scenes.forEach((scene) => {
    const mobile = scene.querySelector("[data-mobile-visual]");
    if (mobile) mobile.innerHTML = renderers[scene.dataset.scene]();
  });
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible && visible.target.dataset.scene !== active) render(visible.target.dataset.scene);
  }, { rootMargin: "-25% 0px -50%", threshold: [0.2, 0.6] });
  scenes.forEach((scene) => observer.observe(scene));
  render(active);
}
