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
  const pressed = new Set();
  const key = (code, type = "keydown") => {
    const repeat = pressed.has(code);
    if (type === "keydown") pressed.add(code);
    else pressed.delete(code);
    events[type]({
      code,
      repeat,
      target: { tagName: "CANVAS" },
      preventDefault() {},
    });
  };
  return {
    game: sandbox.window.__remy,
    key,
    els,
    storage,
    draw: () => sandbox.frame(100),
  };
}
test("all fifteen authored routes can be finished with real simulation and collisions", () => {
  const h = harness();
  for (let i = 0; i < world.LEVELS.length; i++) {
    h.game.loadLevel(i);
    const w = h.game.world;
    const n = w.definition.route;
    const points = [];
    const tx = (x) => (w.direction === 1 ? x : world.WIDTH - x - 43);
    if (n === 3)
      points.push(
        { x: tx(2270), spring: true },
        { x: w.tokens[0].x, y: w.tokens[0].y },
      );
    if (n === 4)
      points.push(
        { x: tx(1520), y: 330 },
        { x: w.tokens[0].x, y: w.tokens[0].y },
        { x: w.tokens[1].x, y: w.tokens[1].y },
      );
    if (n === 5)
      points.push(
        { x: tx(2380), lift: true },
        { x: w.tokens[0].x, y: w.tokens[0].y },
      );
    if (n === 6 || n === 7)
      for (const token of w.tokens) {
        if (n === 7)
          points.push({ x: token.x - 100 * w.direction, y: 285, water: true });
        points.push({ x: token.x, y: token.y, water: true });
      }
    if (n === 8)
      points.push(
        { x: tx(3170), spring: true },
        { x: w.tokens[0].x, y: w.tokens[0].y },
      );
    if (n === 10) points.push({ x: w.switches[0].x, y: 416 });
    if (n === 11)
      for (const token of w.tokens) {
        if (token.y > 440)
          points.push({ x: token.x - 100 * w.direction, y: 285, water: true });
        points.push({ x: token.x, y: token.y, water: token.y > 440 });
      }
    points.push({ x: w.goal.x + 20, y: 400 });
    let waypoint = 0;
    for (let t = 0; t < 120 * 150 && h.game.state === "playing"; t++) {
      const p = h.game.player,
        target = points[waypoint];
      const lift = w.platforms.find(
        (r) => r.kind === "moving" && r.axis === "y",
      );
      const near = Math.abs(p.x - target.x) < 30;
      if (
        near &&
        ((target.spring && p.vy < -600) ||
          (target.lift && p.support === lift && lift.y < 255) ||
          (!target.spring && !target.lift && Math.abs(p.y - target.y) < 34)) &&
        waypoint < points.length - 1
      )
        waypoint++;
      const next = points[waypoint],
        dx = next.x - p.x;
      const dir = Math.abs(dx) < 8 ? 0 : Math.sign(dx);
      const footing = p.support;
      const edge =
        footing &&
        (dir > 0 ? footing.x + footing.w - p.x < 70 : p.x - footing.x < 70);
      const danger =
        w.enemies.some(
          (e) =>
            e.alive &&
            (e.x - p.x) * dir > 0 &&
            Math.abs(e.x - p.x) < 110 &&
            Math.abs(e.y - p.y) < 70,
        ) ||
        w.hazards.some(
          (e) =>
            e.active &&
            (e.x - p.x) * dir > 0 &&
            Math.abs(e.x - p.x) < 100 &&
            Math.abs(e.y - p.y) < 90,
        );
      let jump =
        p.grounded &&
        (edge ||
          danger ||
          (!next.spring &&
            next.y !== undefined &&
            p.y > next.y + 20 &&
            Math.abs(dx) < 130));
      if (next.lift)
        jump =
          p.grounded &&
          p.support !== lift &&
          lift.y > 370 &&
          Math.abs(dx) < 100;
      const swimming = w.water.some((r) => world.overlap(p, r));
      if (swimming) jump = next.water ? p.y > next.y + 5 : true;
      if (!p.grounded && !swimming) jump = true;
      for (const [code, on] of [
        ["ArrowRight", dir > 0],
        ["ArrowLeft", dir < 0],
        ["ShiftLeft", !next.water],
        ["ArrowDown", swimming && next.water && p.y < next.y - 5],
      ])
        h.key(code, on ? "keydown" : "keyup");
      // Retrigger only a grounded jump; held Space maintains jump height or paddles.
      if (jump && p.grounded) h.key("Space", "keyup");
      h.key("Space", jump ? "keydown" : "keyup");
      h.game.step(1 / 120);
    }
    assert.equal(
      h.game.state,
      "complete",
      `${world.LEVELS[i].name}: x=${h.game.player.x}, y=${h.game.player.y}, health=${h.game.player.health}, waypoint=${waypoint}, tags=${w.tokens.map((t) => t.taken)}`,
    );
    h.draw();
    h.game.start();
    assert.equal(h.game.level, i === world.LEVELS.length - 1 ? 0 : i + 1);
  }
  const saved = JSON.parse(h.storage.get("remy-world-tour-v3"));
  assert.equal(saved.unlocked, 14);
  assert.equal(Object.keys(saved.records).length, 15);
});
test("retry stays on selected stage; checkpoints and power-ups function on every stage", () => {
  const h = harness();
  for (let i = 0; i < world.LEVELS.length; i++) {
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
    JSON.parse(restored.storage.get("remy-world-tour-v3")).unlocked,
    1,
  );
  assert.doesNotThrow(() =>
    harness(new Map([["remy-world-tour-v3", "not json"]])),
  );
});
test("all stage layouts differ and checkpoints have ground underneath", () => {
  const layouts = new Set();
  for (let i = 0; i < world.LEVELS.length; i++) {
    const w = world.createWorld(i);
    layouts.add(JSON.stringify([w.platforms, w.hazards, w.enemies]));
    for (const c of w.checkpoints)
      assert.ok(
        w.platforms.some(
          (r) => r.ground && c.x >= r.x && c.x + c.w <= r.x + r.w,
        ),
      );
  }
  assert.equal(layouts.size, 15);
});

test("three countries have five ordered missions and rising difficulty", () => {
  assert.equal(world.LEVELS.length, 15);
  for (const [chapter, country] of ["New Zealand", "UK", "France"].entries()) {
    const missions = world.LEVELS.slice(chapter * 5, chapter * 5 + 5);
    assert.ok(missions.every((l) => l.country === country));
    assert.deepEqual(
      missions.map((l) => l.difficulty),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(
      missions.map((l) => l.mission),
      [1, 2, 3, 4, 5],
    );
    assert.ok(world.createWorld(chapter * 5 + 4).tokens.length >= 3);
  }
});
test("old campaign unlocks migrate without applying scores to different missions", () => {
  const h = harness(
    new Map([
      [
        "remy-adventure-v2",
        JSON.stringify({ unlocked: 11, records: { 0: 42 } }),
      ],
    ]),
  );
  h.game.loadLevel(0);
  h.game.player.x = 5185;
  h.game.step(1 / 120);
  const saved = JSON.parse(h.storage.get("remy-world-tour-v3"));
  assert.equal(saved.unlocked, 14);
  assert.equal(saved.records[0], 0);
});
