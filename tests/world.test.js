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
  assert.ok(b.biscuits.length > 50);
});
test("overlap uses actual rectangle bounds", () => {
  assert.equal(
    overlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 }),
    false,
  );
});
