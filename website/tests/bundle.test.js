import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const website = dirname(dirname(fileURLToPath(import.meta.url)));

test("index uses the classic bundle so it can be opened from file URLs", () => {
  const html = readFileSync(join(website, "index.html"), "utf8");
  assert.match(html, /<script src="\.\/game\.bundle\.js"><\/script>/);
  assert.doesNotMatch(html, /<script type="module"/);
});

test("browser bundle contains no module import or export statements", () => {
  const bundle = readFileSync(join(website, "game.bundle.js"), "utf8");
  assert.doesNotMatch(bundle, /^\s*import\s/m);
  assert.doesNotMatch(bundle, /^\s*export\s/m);
  assert.match(bundle, /window\.__titanicGameReady = true/);
});
