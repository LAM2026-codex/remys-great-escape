import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import fs from "node:fs";
import * as world from "../src/world.js";
function harness(storage = new Map()) {
  const events = {},
    els = new Map(),
    context = new Proxy(
      { createLinearGradient: () => ({ addColorStop() {} }) },
      { get: (o, k) => o[k] || (() => {}) },
    );
  const element = () => ({
    style: {},
    classList: { add() {}, remove() {} },
    setAttribute() {},
    append() {},
    replaceChildren() {},
    addEventListener() {},
    focus() {},
    getBoundingClientRect: () => ({ width: 1100, height: 550 }),
    getContext: () => context,
  });
  const document = {
    querySelector: (s) => {
      if (!els.has(s)) els.set(s, element());
      return els.get(s);
    },
    querySelectorAll: () => [],
    createElement: element,
    addEventListener() {},
  };
  const sandbox = {
    ...world,
    document,
    window: { addEventListener: (n, f) => (events[n] = f) },
    localStorage: {
      getItem: (k) => storage.get(k),
      setItem: (k, v) => storage.set(k, v),
    },
    location: { search: "?test" },
    URLSearchParams,
    ResizeObserver: class {
      observe() {}
    },
    requestAnimationFrame: (f) => (sandbox.frame = f),
    console,
  };
  vm.createContext(sandbox);
  vm.runInContext(
    fs
      .readFileSync(new URL("../src/game.js", import.meta.url), "utf8")
      .replace(/^import[\s\S]*?from "\.\/world\.js";\s*/, ""),
    sandbox,
  );
  const key = (code, type = "keydown") =>
    events[type]({ code, target: { tagName: "CANVAS" }, preventDefault() {} });
  return {
    game: sandbox.window.__remy,
    key,
    els,
    storage,
    draw: () => sandbox.frame(100),
  };
}
test("all twelve authored routes can be finished with real simulation and collisions", () => {
  const h = harness();
  for (let i = 0; i < 12; i++) {
    h.game.loadLevel(i);
    h.key("ArrowRight");
    h.key("ShiftLeft");
    for (let t = 0; t < 120 * 70 && h.game.state === "playing"; t++) {
      const p = h.game.player;
      const footing = h.game.world.platforms.find(
        (r) =>
          Math.abs(p.y + p.h - r.y) < 2 && p.x + p.w > r.x && p.x < r.x + r.w,
      );
      const danger = h.game.world.enemies.some(
        (e) =>
          e.alive && e.x > p.x && e.x - p.x < 110 && Math.abs(e.y - p.y) < 70,
      );
      if (
        p.grounded &&
        ((footing && footing.x + footing.w - p.x < 105) || danger)
      ) {
        h.key("Space", "keyup");
        h.key("Space");
      }
      h.game.step(1 / 120);
    }
    assert.equal(
      h.game.state,
      "complete",
      `${world.LEVELS[i].name}: x=${h.game.player.x}, health=${h.game.player.health}`,
    );
    h.draw();
    h.game.start();
    assert.equal(h.game.level, i === 11 ? 0 : i + 1);
  }
  const saved = JSON.parse(h.storage.get("remy-adventure-v2"));
  assert.equal(saved.unlocked, 11);
  assert.equal(Object.keys(saved.records).length, 12);
});
test("retry stays on selected stage; checkpoints and power-ups function on every stage", () => {
  const h = harness();
  for (let i = 0; i < 12; i++) {
    h.game.loadLevel(i);
    const p = h.game.player,
      c = h.game.world.checkpoints[0];
    Object.assign(p, { x: c.x, y: 416, health: 1 });
    h.game.step(1 / 120);
    assert.equal(p.health, 3);
    p.y = 700;
    h.game.step(1 / 120);
    assert.equal(p.x, c.x);
    assert.equal(p.health, 2);
    const charm = h.game.world.charms[0];
    Object.assign(p, { x: charm.x, y: charm.y, vy: 0 });
    h.game.step(1 / 120);
    assert.ok(p.power > 9);
    Object.assign(p, { health: 1, y: 700 });
    h.game.step(1 / 120);
    assert.equal(h.game.state, "over");
    h.game.start();
    assert.equal(h.game.level, i);
    assert.equal(h.game.player.health, 3);
  }
});
test("pause freezes motion, progress survives reload, invalid storage is safe", () => {
  const h = harness();
  h.game.start();
  h.game.show("paused");
  const x = h.game.player.x;
  h.key("ArrowRight");
  h.game.step(1);
  assert.equal(h.game.player.x, x);
  h.game.loadLevel(0);
  h.game.player.x = 5185;
  h.game.step(1 / 120);
  const restored = harness(h.storage);
  assert.equal(
    JSON.parse(restored.storage.get("remy-adventure-v2")).unlocked,
    1,
  );
  assert.doesNotThrow(() =>
    harness(new Map([["remy-adventure-v2", "not json"]])),
  );
});
test("all stage layouts differ and checkpoints have ground underneath", () => {
  const layouts = new Set();
  for (let i = 0; i < 12; i++) {
    const w = world.createWorld(i);
    layouts.add(JSON.stringify(w.platforms));
    for (const c of w.checkpoints)
      assert.ok(
        w.platforms.some(
          (r) => r.ground && c.x >= r.x && c.x + c.w <= r.x + r.w,
        ),
      );
  }
  assert.equal(layouts.size, 12);
});
