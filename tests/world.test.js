import test from "node:test";
import assert from "node:assert/strict";
import {
  createWorld,
  createPlayer,
  movePlayer,
  overlap,
} from "../src/world.js";
const dt = 1 / 120;
const tick = (p, input, platforms, n = 1) => {
  for (let i = 0; i < n; i++) movePlayer(p, input, platforms, dt);
};
test("lands on garden ground and never sinks", () => {
  let p = createPlayer();
  tick(p, {}, createWorld().platforms, 240);
  assert.equal(p.y, 416);
  assert.equal(p.grounded, true);
});
test("held jumps rise higher than taps", () => {
  const w = createWorld(),
    a = createPlayer(),
    b = createPlayer();
  tick(a, {}, w.platforms, 30);
  tick(b, {}, w.platforms, 30);
  tick(a, { jump: true, jumpPressed: true }, w.platforms);
  tick(b, { jump: true, jumpPressed: true }, w.platforms);
  tick(a, { jump: true }, w.platforms, 25);
  tick(b, {}, w.platforms, 25);
  assert.ok(a.y < b.y - 30);
});
test("jump buffer fires when landing", () => {
  const w = createWorld(),
    p = createPlayer(100, 410);
  p.vy = 130;
  tick(p, { jumpPressed: true, jump: true }, w.platforms);
  tick(p, { jump: true }, w.platforms, 8);
  assert.ok(p.vy < 0);
});
test("all ground gaps can be crossed with ordinary held jumps", () => {
  const w = createWorld(),
    g = w.platforms.filter((x) => x.ground);
  for (let i = 0; i < g.length - 1; i++) {
    const a = g[i],
      b = g[i + 1],
      p = createPlayer(a.x + a.w - 60, 416);
    p.grounded = true;
    p.vx = 245;
    tick(p, { right: true, jump: true, jumpPressed: true }, [a, b]);
    tick(p, { right: true, jump: true }, [a, b], 105);
    assert.ok(p.x > b.x, `gap ${i}`);
    assert.ok(p.y <= 416, `land ${i}`);
  }
});
test("world objects are independent per attempt", () => {
  const a = createWorld(),
    b = createWorld();
  a.biscuits[0].taken = true;
  assert.equal(b.biscuits[0].taken, false);
  assert.equal(b.biscuits.length, a.biscuits.length);
});
test("overlap uses actual rectangle bounds", () => {
  assert.equal(
    overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }),
    false,
  );
});

test("moving platforms carry a standing player horizontally and vertically", async () => {
  const { updateWorld } = await import("../src/world.js");
  for (const i of [1, 5]) {
    const w = createWorld(i),
      r = w.platforms.find((r) => r.kind === "moving"),
      p = createPlayer(r.x + 20, r.y - 34);
    p.grounded = true;
    p.support = r;
    const relative = p.x - r.x;
    updateWorld(w, p, 0.02);
    assert.ok(Math.abs(p.x - r.x - relative) < 0.001);
    assert.ok(Math.abs(p.y + p.h - r.y) < 0.001);
  }
});
test("crumbling boards disappear and return; springs work when walked onto", async () => {
  const { updateWorld } = await import("../src/world.js");
  const w = createWorld(2),
    r = w.platforms.find((r) => r.kind === "crumble"),
    p = createPlayer(r.x, r.y - 34);
  p.grounded = true;
  p.support = r;
  for (let i = 0; i < 90; i++) updateWorld(w, p, 1 / 120);
  assert.equal(r.inactive, true);
  p.support = null;
  for (let i = 0; i < 370; i++) updateWorld(w, p, 1 / 120);
  assert.equal(r.inactive, false);
  const s = createWorld(3),
    pad = s.platforms.find((r) => r.kind === "spring"),
    dog = createPlayer(pad.x, 416);
  movePlayer(dog, {}, s.platforms, 1 / 120, s);
  assert.ok(dog.vy < -800);
});
test("swimming supports paddle, dive, currents and safe bank exits", () => {
  const w = createWorld(7),
    water = w.water[0],
    p = createPlayer(water.x + 200, 390);
  for (let i = 0; i < 60; i++)
    movePlayer(p, { jump: true }, w.platforms, 1 / 120, w);
  assert.ok(p.y < 350);
  assert.ok(p.x > water.x + 200);
  for (let i = 0; i < 140; i++)
    movePlayer(p, { down: true }, w.platforms, 1 / 120, w);
  assert.ok(p.y > 400);
});
test("reverse exits require tags and gate switch expires without crushing", async () => {
  const { goalReached, updateWorld } = await import("../src/world.js");
  const w = createWorld(4),
    p = createPlayer(w.goal.x, 400);
  assert.equal(w.direction, -1);
  assert.ok(w.spawn.x > 5000);
  assert.equal(goalReached(w, p), false);
  w.tokens.forEach((t) => (t.taken = true));
  assert.equal(goalReached(w, p), true);
  const g = createWorld(10),
    sw = g.switches[0],
    dog = createPlayer(sw.x, 416);
  updateWorld(g, dog, 0.01);
  assert.equal(sw.gate.inactive, true);
  dog.x = g.spawn.x;
  updateWorld(g, dog, 9);
  assert.equal(sw.gate.inactive, false);
  dog.x = sw.gate.x;
  updateWorld(g, dog, 0.01);
  assert.equal(sw.gate.inactive, true);
});
test("sprinklers have safe, warning and active intervals", async () => {
  const { updateWorld } = await import("../src/world.js");
  const w = createWorld(9),
    p = createPlayer(),
    h = w.hazards[0];
  h.phase = 0;
  updateWorld(w, p, 0.1);
  assert.equal(h.active, false);
  updateWorld(w, p, 1.4);
  assert.equal(h.warning, true);
  updateWorld(w, p, 0.5);
  assert.equal(h.active, true);
});

test("every biscuit in all twelve stages is reachable from its route surface before the exit", async () => {
  const { updateWorld, goalReached, WIDTH } = await import("../src/world.js");
  for (let level = 0; level < 12; level++) {
    const template = createWorld(level);
    assert.ok(template.biscuits.length > 20);
    for (let i = 0; i < template.biscuits.length; i++) {
      const w = createWorld(level),
        b = w.biscuits[i];
      assert.ok(
        w.direction === 1
          ? b.x + b.w < w.goal.x - 43
          : b.x > w.goal.x + w.goal.w + 43,
        `stage ${level + 1}: biscuit beyond exit`,
      );
      const water = w.water.find((r) => overlap(b, r));
      let p;
      if (water) p = createPlayer(b.x - 10, b.y + 20);
      else {
        // Find the real route support, including moving or crumbling boards.
        const support = w.platforms
          .filter(
            (r) =>
              r.kind !== "gate" &&
              r.x <= b.x &&
              r.x + r.w >= b.x + b.w &&
              r.y >= b.y + b.h,
          )
          .sort((a, b) => a.y - b.y)[0];
        assert.ok(support, `stage ${level + 1}: unsupported biscuit ${i}`);
        const base =
          support.ground || support.kind
            ? support
            : w.platforms.find(
                (r) =>
                  r.ground &&
                  r.y === 450 &&
                  r.x <= b.x &&
                  r.x + r.w >= b.x + b.w,
              );
        assert.ok(base, `stage ${level + 1}: no launch surface`);
        p = createPlayer(b.x - 10, base.y - 34);
        p.grounded = true;
        p.support = base;
      }
      let picked = overlap(p, b);
      for (let step = 0; step < 180 && !picked; step++) {
        updateWorld(w, p, 1 / 120);
        movePlayer(
          p,
          { jump: !water || p.y > b.y, jumpPressed: step === 0 },
          w.platforms,
          1 / 120,
          w,
        );
        assert.equal(
          goalReached(w, p),
          false,
          "collection must not trigger completion",
        );
        picked = overlap(p, b);
      }
      assert.ok(
        picked,
        `stage ${level + 1}: unreachable biscuit ${i} (${b.x},${b.y})`,
      );
    }
  }
});
