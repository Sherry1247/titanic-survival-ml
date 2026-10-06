import { PASSENGER_DATA } from "./passenger-data.js";

export const ALL_PASSENGERS = PASSENGER_DATA;

export function wilsonInterval(successes, total, z = 1.96) {
  if (!total) return { low: 0, high: 0 };
  const p = successes / total;
  const denominator = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / denominator;
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total) / denominator;
  return { low: Math.max(0, centre - margin), high: Math.min(1, centre + margin) };
}

export function survivalSummary(rows) {
  const total = rows.length;
  const survived = rows.reduce((sum, row) => sum + row.survived, 0);
  const interval = wilsonInterval(survived, total);
  return { total, survived, rate: total ? survived / total : 0, low: interval.low, high: interval.high, smallSample: total > 0 && total < 20 };
}

export function groupRates(rows, key) {
  const groups = new Map();
  rows.forEach((row) => {
    const value = typeof key === "function" ? key(row) : row[key];
    const label = value ?? "Not recorded";
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(row);
  });
  return [...groups.entries()].map(([label, members]) => ({ label, ...survivalSummary(members) }));
}

export function sexClassRates(rows = ALL_PASSENGERS) {
  return [1, 2, 3].flatMap((pclass) => ["female", "male"].map((sex) => ({
    pclass,
    sex,
    ...survivalSummary(rows.filter((row) => row.pclass === pclass && row.sex === sex)),
  })));
}

export function familyRates(rows = ALL_PASSENGERS) {
  return groupRates(rows, (row) => row.familySize >= 6 ? "6+" : String(row.familySize)).sort((a, b) => Number.parseInt(a.label, 10) - Number.parseInt(b.label, 10));
}

export function ticketGroupRates(rows = ALL_PASSENGERS) {
  return groupRates(rows, (row) => row.ticketGroupSize >= 6 ? "6+" : String(row.ticketGroupSize)).sort((a, b) => Number.parseInt(a.label, 10) - Number.parseInt(b.label, 10));
}

export function embarkationRates(rows = ALL_PASSENGERS, pclass = null) {
  const scoped = pclass ? rows.filter((row) => row.pclass === pclass) : rows;
  return groupRates(scoped, (row) => row.embarked ?? "Not recorded").sort((a, b) => String(a.label).localeCompare(String(b.label)));
}

export function missingness(rows = ALL_PASSENGERS) {
  return [
    { field: "Cabin", missing: rows.filter((row) => row.cabin === null).length },
    { field: "Age", missing: rows.filter((row) => row.age === null).length },
    { field: "Embarkation", missing: rows.filter((row) => row.embarked === null).length },
  ].map((item) => ({ ...item, total: rows.length, rate: rows.length ? item.missing / rows.length : 0 }));
}

export function filterPassengers(rows, filters) {
  return rows.filter((row) => {
    if (filters.pclass && row.pclass !== Number(filters.pclass)) return false;
    if (filters.sex && row.sex !== filters.sex) return false;
    if (filters.embarked && (row.embarked ?? "unknown") !== filters.embarked) return false;
    if (filters.family === "alone" && !row.isAlone) return false;
    if (filters.family === "family" && row.isAlone) return false;
    if (filters.outcome !== "" && row.survived !== Number(filters.outcome)) return false;
    if (filters.cabin === "known" && row.cabin === null) return false;
    if (filters.cabin === "unknown" && row.cabin !== null) return false;
    if (filters.ageKnown === "known" && row.age === null) return false;
    if (filters.ageKnown === "unknown" && row.age !== null) return false;
    if (row.age !== null && filters.ageMin !== "" && row.age < Number(filters.ageMin)) return false;
    if (row.age !== null && filters.ageMax !== "" && row.age > Number(filters.ageMax)) return false;
    if (filters.fareMax !== "" && row.fare > Number(filters.fareMax)) return false;
    return true;
  });
}

export function comparableCohorts(passenger, rows = ALL_PASSENGERS) {
  const familyLabel = passenger.isAlone ? "travelling alone" : "travelling with family";
  const cohorts = [
    { label: `${passenger.sex === "female" ? "Women" : "Men"} in class ${passenger.pclass}`, rows: rows.filter((row) => row.sex === passenger.sex && row.pclass === passenger.pclass) },
    { label: `Class ${passenger.pclass}, ${familyLabel}`, rows: rows.filter((row) => row.pclass === passenger.pclass && row.isAlone === passenger.isAlone) },
  ];
  if (passenger.age !== null) {
    const low = Math.max(0, Math.floor(passenger.age / 10) * 10);
    cohorts.push({ label: `Recorded age ${low}–${low + 9}`, rows: rows.filter((row) => row.age !== null && row.age >= low && row.age < low + 10) });
  }
  return cohorts.map((cohort) => ({ label: cohort.label, ...survivalSummary(cohort.rows) }));
}

export function passengerById(id) {
  return ALL_PASSENGERS.find((row) => row.id === Number(id)) ?? null;
}
