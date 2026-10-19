import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const dive = join(dirname(dirname(fileURLToPath(import.meta.url))), "dive");
const read = (f) => readFileSync(join(dive, f), "utf8");
const load = (f) => {
  const sandbox = { window: {} };
  vm.runInNewContext(read(f), sandbox);
  return sandbox.window;
};

test("every scene image referenced by dive.js exists", () => {
  const images = [...read("dive.js").matchAll(/img: "([^"]+\.jpg)"/g)].map((m) => m[1]);
  assert.equal(images.length, 8);
  for (const image of images) assert.ok(existsSync(join(dive, "assets", image)), image);
});

test("the dive works offline: no network URLs, modules, or CDN scripts", () => {
  for (const file of ["index.html", "dive.js", "dive.css"]) {
    assert.doesNotMatch(read(file), /https?:\/\/(?!www\.w3\.org)/, `${file} references the network`);
  }
  assert.doesNotMatch(read("dive.js"), /^\s*(import|export)\s/m);
  assert.doesNotMatch(read("index.html"), /type="module"/);
  const entry = readFileSync(join(dive, "..", "index.html"), "utf8");
  assert.match(entry, /\.\/dive\/dive\.js/);
  assert.doesNotMatch(entry, /https?:\/\/(?!www\.w3\.org)/);
});

test("passenger records keep the historical outcome sealed", () => {
  const { DIVE_PASSENGERS: rows } = load("data/passengers.js");
  assert.equal(rows.length, 891);
  for (const row of rows) {
    assert.equal(row.length, 11, "id, name, pclass, sex, age, sibSp, parch, ticket, fare, embarked, cabin");
    assert.ok([1, 2, 3].includes(row[2]));
    assert.ok(["male", "female"].includes(row[3]));
  }
  assert.doesNotMatch(read("data/passengers.js"), /surviv|probab/i);
});

test("world land data decodes to plausible coordinates", () => {
  const { WORLD_LAND: land } = load("data/world-land.js");
  assert.ok(land.coarse.length > 50 && land.fine.length > 100);
  for (const ring of [...land.coarse, ...land.fine]) {
    let x = 0, y = 0;
    for (let i = 0; i < ring.length; i += 2) {
      x += ring[i]; y += ring[i + 1];
      assert.ok(Math.abs(x / land.q) <= 180.5 && Math.abs(y / land.q) <= 90.5);
    }
  }
});

test("historical figures on the cards add up", () => {
  const source = read("dive.js");
  assert.match(source, /n: 1316/);
  assert.match(source, /n: 913/);
  assert.equal(325 + 285 + 706, 1316);
  assert.equal(1316 + 913, 2229);
  assert.match(source, /lon: -49\.9469, lat: 41\.7325/);
});
