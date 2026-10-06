import { PROVENANCE } from "../data/provenance.js";
import { escapeHtml } from "./format.js";

export function renderProvenance(root) {
  root.innerHTML = PROVENANCE.map((item) => `
    <details class="source-record">
      <summary><span>${item.status.toUpperCase()}</span><strong>${escapeHtml(item.source)}</strong></summary>
      <dl><div><dt>Reference</dt><dd>${escapeHtml(item.reference)}</dd></div><div><dt>Retrieved</dt><dd>${escapeHtml(item.retrieved)}</dd></div><div><dt>Information</dt><dd>${escapeHtml(item.fields)}</dd></div><div><dt>Transformations</dt><dd>${escapeHtml(item.transformations)}</dd></div><div><dt>Join method</dt><dd>${escapeHtml(item.join)}</dd></div><div><dt>Confidence</dt><dd>${escapeHtml(item.confidence)}</dd></div><div><dt>Reuse notes</dt><dd>${escapeHtml(item.licensing)}</dd></div></dl>
      <a href="${item.url}" target="_blank" rel="noreferrer">Open source record</a>
    </details>`).join("");
}
