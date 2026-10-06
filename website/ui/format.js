export const pct = (value, digits = 1) => `${(value * 100).toFixed(digits)}%`;

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const recorded = (value, fallback = "Not recorded") => value === null || value === undefined || value === "" ? fallback : value;

export const classLabel = (value) => ({ 1: "First class", 2: "Second class", 3: "Third class" }[value] ?? `Class ${value}`);

export const portLabel = (value) => ({ S: "Southampton", C: "Cherbourg", Q: "Queenstown" }[value] ?? "Not recorded");
