import { ALL_PASSENGERS } from "../data/analysis.js";
import { MODEL_REPORT } from "../data/model-results.js";
import { pct } from "./format.js";

function metricValue(report, key) {
  return report.metrics[key]?.mean ?? 0;
}

function calibrationSvg(calibration) {
  const width = 560;
  const height = 330;
  const point = (item) => ({ x: 55 + item.predicted * 250, y: 285 - item.observed * 230 });
  const circles = calibration.map((item) => {
    const p = point(item);
    return `<g><circle cx="${p.x}" cy="${p.y}" r="${Math.max(5, Math.sqrt(item.count))}"/><text x="${p.x + 12}" y="${p.y - 8}">${item.count} records</text></g>`;
  }).join("");
  return `<svg class="calibration-chart" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="cal-title cal-desc"><title id="cal-title">Logistic regression calibration by probability band</title><desc id="cal-desc">Points compare mean predicted survival probability with observed survival rate. The diagonal represents perfect calibration.</desc><line x1="55" y1="285" x2="305" y2="55" class="calibration-reference"/><line x1="55" y1="285" x2="305" y2="285"/><line x1="55" y1="55" x2="55" y2="285"/>${circles}<text x="55" y="315">Lower predicted probability</text><text x="330" y="90">Observed survival</text><text x="330" y="118">Circle area reflects sample size</text></svg>`;
}

function confusionAt(threshold) {
  return ALL_PASSENGERS.reduce((acc, passenger) => {
    const predicted = passenger.modelProbability >= threshold ? 1 : 0;
    if (predicted === 1 && passenger.survived === 1) acc.tp += 1;
    else if (predicted === 1) acc.fp += 1;
    else if (passenger.survived === 1) acc.fn += 1;
    else acc.tn += 1;
    return acc;
  }, { tp: 0, fp: 0, fn: 0, tn: 0 });
}

function subgroupPerformance() {
  const groups = [
    ["Women", (passenger) => passenger.sex === "female"],
    ["Men", (passenger) => passenger.sex === "male"],
    ["First class", (passenger) => passenger.pclass === 1],
    ["Second class", (passenger) => passenger.pclass === 2],
    ["Third class", (passenger) => passenger.pclass === 3],
  ];
  return groups.map(([label, predicate]) => {
    const records = ALL_PASSENGERS.filter(predicate);
    const cells = records.reduce((acc, passenger) => {
      const predicted = passenger.modelProbability >= 0.5 ? 1 : 0;
      if (predicted === passenger.survived) acc.correct += 1;
      if (predicted === 1 && passenger.survived === 1) acc.tp += 1;
      if (predicted === 0 && passenger.survived === 1) acc.fn += 1;
      return acc;
    }, { correct: 0, tp: 0, fn: 0 });
    return {
      label,
      count: records.length,
      accuracy: cells.correct / records.length,
      recall: cells.tp / Math.max(1, cells.tp + cells.fn),
    };
  });
}

export function createModelLab({ root }) {
  const reports = MODEL_REPORT.model.evaluation;
  const logistic = reports["Logistic regression"];
  const forest = reports["Random forest"];
  const baseline = reports["Majority baseline"];
  root.innerHTML = `
    <div class="model-question"><h3>Could a model predict survival from recorded passenger information?</h3><p>Five-fold stratified cross-validation gives every passenger an out-of-fold prediction. This reduces optimism compared with scoring the same rows used for fitting, but it is still not prospective validation.</p></div>
    <div class="model-comparison" role="table" aria-label="Cross-validated model comparison">
      <div role="row" class="model-comparison__head"><span role="columnheader">Model</span><span role="columnheader">ROC–AUC</span><span role="columnheader">F1</span><span role="columnheader">Brier ↓</span><span role="columnheader">Precision</span><span role="columnheader">Recall</span></div>
      ${[["Logistic regression", logistic], ["Random forest", forest], ["Majority baseline", baseline]].map(([name, report]) => `<div role="row"><strong role="cell">${name}</strong><span role="cell">${metricValue(report, "roc_auc").toFixed(3)}${report.metrics.roc_auc.std ? ` ± ${report.metrics.roc_auc.std.toFixed(3)}` : ""}</span><span role="cell">${metricValue(report, "f1").toFixed(3)}</span><span role="cell">${metricValue(report, "brier").toFixed(3)}</span><span role="cell">${metricValue(report, "precision").toFixed(3)}</span><span role="cell">${metricValue(report, "recall").toFixed(3)}</span></div>`).join("")}
    </div>
    <div class="model-evidence-split"><section><h4>Calibration</h4>${calibrationSvg(logistic.calibration)}</section><section><h4>Threshold changes the errors</h4><label for="model-threshold">Decision threshold <output id="threshold-output">0.50</output></label><input id="model-threshold" type="range" min="0.2" max="0.8" step="0.05" value="0.5"/><div id="confusion-output"></div></section></div>
    <section class="subgroup-check"><h4>Performance is not uniform across recorded groups</h4><p>Out-of-fold logistic-regression results at the 0.50 threshold. These checks reveal differences; they do not establish fairness or explain their causes.</p><div class="model-comparison" role="table" aria-label="Model performance by recorded subgroup"><div role="row" class="model-comparison__head"><span role="columnheader">Recorded group</span><span role="columnheader">n</span><span role="columnheader">Accuracy</span><span role="columnheader">Recall</span></div>${subgroupPerformance().map((group) => `<div role="row"><strong role="cell">${group.label}</strong><span role="cell">${group.count}</span><span role="cell">${pct(group.accuracy)}</span><span role="cell">${pct(group.recall)}</span></div>`).join("")}</div></section>
    <div class="model-boundary"><strong>Association, not cause.</strong><p>The model uses overlapping representations such as family size with siblings/parents, and age with a child indicator. Contributions describe how this fitted system changes a prediction; they are not independent causal effects.</p></div>`;

  const slider = root.querySelector("#model-threshold");
  const output = root.querySelector("#threshold-output");
  const confusion = root.querySelector("#confusion-output");
  const renderThreshold = () => {
    const value = Number(slider.value);
    const cells = confusionAt(value);
    const precision = cells.tp / Math.max(1, cells.tp + cells.fp);
    const recall = cells.tp / Math.max(1, cells.tp + cells.fn);
    output.value = value.toFixed(2);
    output.textContent = value.toFixed(2);
    confusion.innerHTML = `<dl class="confusion-matrix"><div><dt>True positive</dt><dd>${cells.tp}</dd></div><div><dt>False positive</dt><dd>${cells.fp}</dd></div><div><dt>False negative</dt><dd>${cells.fn}</dd></div><div><dt>True negative</dt><dd>${cells.tn}</dd></div></dl><p>Precision ${pct(precision)} · Recall ${pct(recall)}</p>`;
  };
  slider.addEventListener("input", renderThreshold);
  renderThreshold();
}
