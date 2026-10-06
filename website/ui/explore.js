import { ALL_PASSENGERS, filterPassengers, survivalSummary } from "../data/analysis.js";
import { classLabel, escapeHtml, pct, portLabel, recorded } from "./format.js";

const defaultFilters = () => ({ pclass: "", sex: "", embarked: "", family: "", outcome: "", cabin: "", ageKnown: "", ageMin: "", ageMax: "", fareMax: "" });

function filterValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setForm(form, values) {
  Object.entries(values).forEach(([name, value]) => {
    if (form.elements[name]) form.elements[name].value = value;
  });
}

function passengerPlot(rows, selectedId) {
  const width = 820;
  const height = 410;
  const x = (age) => 45 + (Math.min(80, age) / 80) * 640;
  const y = (fare) => 350 - (Math.log1p(fare) / Math.log1p(520)) * 290;
  return `<svg class="explore-plot" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="explore-plot-title explore-plot-desc"><title id="explore-plot-title">Selected passenger cohort by recorded age and fare</title><desc id="explore-plot-desc">Filled marks survived and hollow marks did not. Unknown ages are placed in a separate lane. Use the passenger list after the chart for keyboard selection.</desc><line x1="45" y1="350" x2="685" y2="350"/><line x1="45" y1="60" x2="45" y2="350"/><line x1="720" y1="45" x2="720" y2="370" class="unknown-rule"/><text x="45" y="390">Age 0</text><text x="650" y="390">80+</text><text x="730" y="390">Age unknown</text>${rows.map((row) => {
    const px = row.age === null ? 765 : x(row.age);
    const py = row.age === null ? 70 + (row.id % 260) : y(row.fare);
    return `<g data-svg-passenger="${row.id}"><circle class="${row.survived ? "is-survived" : "is-lost"} ${row.id === selectedId ? "is-selected" : ""}" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${row.id === selectedId ? 6 : 3.5}"><title>${escapeHtml(row.name)} · ${row.age ?? "age not recorded"} · £${row.fare.toFixed(2)}</title></circle></g>`;
  }).join("")}</svg>`;
}

function dossier(passenger) {
  if (!passenger) return `<p class="dossier-empty">Select a passenger mark or name to open an archival-style record.</p>`;
  const warnings = [
    passenger.age === null ? "Age not recorded; explanatory views do not median-fill it." : null,
    passenger.cabin === null ? "Cabin not recorded; no deck location is inferred." : null,
  ].filter(Boolean);
  return `<div class="dossier-heading"><span>PASSENGER DOSSIER · KAGGLE ROW ${passenger.id}</span><h3>${escapeHtml(passenger.name)}</h3></div><dl class="dossier-fields">
    <div><dt>Age</dt><dd>${recorded(passenger.age)}</dd></div><div><dt>Sex</dt><dd>${passenger.sex}</dd></div>
    <div><dt>Class</dt><dd>${classLabel(passenger.pclass)}</dd></div><div><dt>Family record</dt><dd>${passenger.isAlone ? "Travelling alone" : `${passenger.familySize} people`}</dd></div>
    <div><dt>Ticket</dt><dd>${escapeHtml(passenger.ticket)}</dd></div><div><dt>Ticket group</dt><dd>${passenger.ticketGroupSize} sharing this ticket number</dd></div>
    <div><dt>Fare</dt><dd>£${passenger.fare.toFixed(2)}</dd></div><div><dt>Embarked</dt><dd>${portLabel(passenger.embarked)}</dd></div>
    <div><dt>Cabin</dt><dd>${recorded(passenger.cabin)}</dd></div><div><dt>Recorded outcome</dt><dd>${passenger.survived ? "Survived" : "Did not survive"}</dd></div>
    <div><dt>Logistic model</dt><dd>${pct(passenger.modelProbability)} out-of-fold estimate</dd></div><div><dt>Random forest</dt><dd>${pct(passenger.forestProbability)} out-of-fold estimate</dd></div>
  </dl>${warnings.length ? `<div class="dossier-warning"><strong>Data-quality notes</strong>${warnings.map((warning) => `<p>${warning}</p>`).join("")}</div>` : ""}<p class="dossier-limit">Model probabilities are associations learned from recorded fields. They are not causal explanations or reconstructed personal histories.</p>`;
}

export function createExplore({ form, plot, count, list, dossierRoot, comparisonRoot, resetButton, undoButton, saveAButton, saveBButton }) {
  let filterHistory = [];
  let selectedId = null;
  let cohortA = null;
  let cohortB = null;

  function currentRows() {
    return filterPassengers(ALL_PASSENGERS, filterValues(form));
  }

  function selectPassenger(id) {
    selectedId = Number(id);
    const passenger = ALL_PASSENGERS.find((row) => row.id === selectedId);
    dossierRoot.innerHTML = dossier(passenger);
    plot.querySelectorAll("[data-svg-passenger]").forEach((node) => node.classList.toggle("is-selected", Number(node.dataset.svgPassenger) === selectedId));
  }

  function render({ pushHistory = false } = {}) {
    const filters = filterValues(form);
    if (pushHistory) {
      filterHistory.push(filters);
      if (filterHistory.length > 20) filterHistory.shift();
    }
    const rows = filterPassengers(ALL_PASSENGERS, filters);
    const summary = survivalSummary(rows);
    count.innerHTML = `<strong>${rows.length}</strong> of ${ALL_PASSENGERS.length} passengers · ${summary.survived} survived · ${rows.length ? pct(summary.rate) : "—"}<small>${rows.length ? `95% CI ${pct(summary.low)}–${pct(summary.high)}` : "No passengers match these filters"}${summary.smallSample ? " · small sample" : ""}</small>`;
    plot.innerHTML = passengerPlot(rows, selectedId);
    plot.querySelectorAll("[data-svg-passenger]").forEach((node) => node.addEventListener("click", () => selectPassenger(node.dataset.svgPassenger)));
    list.innerHTML = rows.slice(0, 40).map((row) => `<button type="button" data-list-passenger="${row.id}"><span>${String(row.id).padStart(3, "0")}</span><strong>${escapeHtml(row.name)}</strong><small>${row.age ?? "age not recorded"} · ${classLabel(row.pclass)} · ${row.survived ? "survived" : "did not survive"}</small></button>`).join("") || `<p>No passenger records match this cohort.</p>`;
    list.querySelectorAll("[data-list-passenger]").forEach((button) => button.addEventListener("click", () => selectPassenger(button.dataset.listPassenger)));
    undoButton.disabled = filterHistory.length < 2;
    updateUrl(filters);
  }

  function updateUrl(filters) {
    try {
      const url = new URL(window.location.href);
      [...url.searchParams.keys()].filter((key) => key.startsWith("f_")).forEach((key) => url.searchParams.delete(key));
      Object.entries(filters).filter(([, value]) => value !== "").forEach(([key, value]) => url.searchParams.set(`f_${key}`, value));
      window.history.replaceState(null, "", url);
    } catch { /* file URLs and privacy modes may reject history state */ }
  }

  function renderComparison() {
    if (!cohortA && !cohortB) {
      comparisonRoot.innerHTML = "<p>Save a filtered cohort as A or B to compare historical survival rates.</p>";
      return;
    }
    comparisonRoot.innerHTML = [cohortA, cohortB].map((cohort, index) => cohort ? `<div><span>COHORT ${index ? "B" : "A"}</span><strong>${cohort.summary.survived} / ${cohort.summary.total}</strong><b>${pct(cohort.summary.rate)}</b><small>95% CI ${pct(cohort.summary.low)}–${pct(cohort.summary.high)}</small><p>${escapeHtml(cohort.description)}</p></div>` : `<div><span>COHORT ${index ? "B" : "A"}</span><p>Not saved yet.</p></div>`).join("");
  }

  function saveCohort(which) {
    const rows = currentRows();
    const filters = filterValues(form);
    const active = Object.entries(filters).filter(([, value]) => value !== "").map(([key, value]) => `${key}: ${value}`).join(" · ") || "All passenger records";
    const cohort = { summary: survivalSummary(rows), description: active };
    if (which === "A") cohortA = cohort; else cohortB = cohort;
    renderComparison();
  }

  form.addEventListener("change", () => render({ pushHistory: true }));
  resetButton.addEventListener("click", () => { filterHistory.push(filterValues(form)); setForm(form, defaultFilters()); render({ pushHistory: true }); });
  undoButton.addEventListener("click", () => {
    if (filterHistory.length < 2) return;
    filterHistory.pop();
    setForm(form, filterHistory.at(-1));
    render();
  });
  saveAButton.addEventListener("click", () => saveCohort("A"));
  saveBButton.addEventListener("click", () => saveCohort("B"));

  const params = new URLSearchParams(location.search);
  const initial = defaultFilters();
  Object.keys(initial).forEach((key) => { if (params.has(`f_${key}`)) initial[key] = params.get(`f_${key}`); });
  setForm(form, initial);
  filterHistory = [initial];
  renderComparison();
  render();

  return {
    focusPassenger(passenger) {
      setForm(form, { ...defaultFilters(), pclass: String(passenger.pclass), sex: passenger.sex, family: passenger.isAlone ? "alone" : "family" });
      render({ pushHistory: true });
      selectPassenger(passenger.id);
      document.querySelector("#explore")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    },
  };
}
