import test from "node:test";
import assert from "node:assert/strict";

import { ALL_PASSENGERS, embarkationRates, filterPassengers, missingness, sexClassRates, wilsonInterval } from "../data/analysis.js";

const emptyFilters = { pclass: "", sex: "", embarked: "", family: "", outcome: "", cabin: "", ageKnown: "", ageMin: "", ageMax: "", fareMax: "" };

test("passenger export contains all 891 rows and preserves unknown ages", () => {
  assert.equal(ALL_PASSENGERS.length, 891);
  assert.equal(ALL_PASSENGERS.filter((row) => row.age === null).length, 177);
});

test("sex by class values are calculated from passenger rows", () => {
  const thirdClassWomen = sexClassRates().find((row) => row.pclass === 3 && row.sex === "female");
  assert.deepEqual({ survived: thirdClassWomen.survived, total: thirdClassWomen.total }, { survived: 72, total: 144 });
  assert.equal(thirdClassWomen.rate, 0.5);
});

test("Wilson interval contains the observed proportion", () => {
  const interval = wilsonInterval(72, 144);
  assert.ok(interval.low < 0.5);
  assert.ok(interval.high > 0.5);
});

test("embarkation can be stratified by class", () => {
  const rawSouthampton = embarkationRates().find((row) => row.label === "S");
  const thirdSouthampton = embarkationRates(ALL_PASSENGERS, 3).find((row) => row.label === "S");
  assert.notEqual(rawSouthampton.rate, thirdSouthampton.rate);
  assert.equal(thirdSouthampton.total, 353);
});

test("cabin missingness stays explicit and filterable", () => {
  const cabin = missingness().find((item) => item.field === "Cabin");
  assert.equal(cabin.missing, 687);
  assert.equal(filterPassengers(ALL_PASSENGERS, { ...emptyFilters, cabin: "unknown" }).length, 687);
});
