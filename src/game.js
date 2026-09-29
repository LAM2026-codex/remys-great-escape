import {
  WIDTH,
  HEIGHT,
  LEVELS,
  createWorld,
  createPlayer,
  movePlayer,
  updateWorld,
  goalReached,
  overlap,
} from "./world.js";
const $ = (s) => document.querySelector(s),
  canvas = $("#game"),
  ctx = canvas.getContext("2d");
let level = 0,
  unlocked = 0,
  records = {};
try {
  let saved = JSON.parse(localStorage.getItem("remy-world-tour-v3") || "null");
  if (!saved) {
    const old = JSON.parse(localStorage.getItem("remy-adventure-v2") || "null");
    if (old)
      saved = {
        unlocked: Math.min(
          14,
          Math.round(((Number(old.unlocked) || 0) * 14) / 11),
        ),
        records: {},
      };
  }
  if (saved) {
    unlocked = Math.max(
      0,
      Math.min(LEVELS.length - 1, Number(saved.unlocked) || 0),
    );
    records = saved.records || {};
  }
} catch {}
let world = createWorld(),
  p = createPlayer(),
  state = "start",
  camera = 0,
  time = 0,
  elapsed = 0,
  score = 0,
  respawn = { x: 100, y: 400 },
  audio = null,
  sound = false,
  toastTimer = 0,
  viewW = 1100;
const keys = new Set(),
  pointers = new Map();
let jumpPressed = false,
  touchRun = false;
const held = (name) =>
  keys.has(name) ||
  (name === "run" && touchRun) ||
  [...pointers.values()].includes(name);
function releaseTouch() {
  pointers.clear();
  touchRun = false;
  $('[data-control="run"]').setAttribute("aria-pressed", "false");
}
let focusedGame = false;
function focusGame(value) {
  focusedGame = value;
  if (value) canvas.focus({ preventScroll: true });
  $(".game-shell").classList[value ? "add" : "remove"]("is-focused");
  $("#focus-game").setAttribute("aria-pressed", String(value));
  $("#focus-game").setAttribute(
    "aria-label",
    value ? "Restore page" : "Expand game",
  );
}
$("#focus-game").onclick = () => focusGame(!focusedGame);
function tone(freq, duration = 0.12, type = "sine", volume = 0.045) {
  if (!sound || !audio) return;
  const o = audio.createOscillator(),
    g = audio.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audio.currentTime);
  o.frequency.exponentialRampToValueAtTime(
    freq * 0.65,
    audio.currentTime + duration,
  );
  g.gain.setValueAtTime(volume, audio.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  o.connect(g).connect(audio.destination);
  o.start();
  o.stop(audio.currentTime + duration);
}
function unlock() {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audio = new AC();
  }
  audio?.resume();
}
function toast(t) {
  $("#toast").textContent = t;
  toastTimer = 3;
  $("#toast").classList.add("show");
}
function saveProgress() {
  try {
    localStorage.setItem(
      "remy-world-tour-v3",
      JSON.stringify({ unlocked, records }),
    );
  } catch {}
}
function levelMenu() {
  const menu = $("#level-list");
  menu.replaceChildren();
  LEVELS.forEach((l, i) => {
    if (i % 5 === 0) {
      const title = document.createElement("h3");
      title.textContent = l.country;
      title.className = "country-heading";
      menu.append(title);
    }
    const b = document.createElement("button");
    b.disabled = i > unlocked;
    b.className = i === level ? "selected" : "";
    b.textContent =
      String(i + 1).padStart(2, "0") +
      " · " +
      l.name +
      (Object.prototype.hasOwnProperty.call(records, i) ? " ✓" : "");
    b.onclick = () => {
      level = i;
      resetLevel();
      show("start");
    };
    menu.append(b);
  });
}
function resetLevel() {
  world = createWorld(level);
  p = createPlayer(world.spawn.x, world.spawn.y);
  p.facing = world.direction;
  score = 0;
  elapsed = 0;
  camera = Math.max(0, Math.min(WIDTH - viewW, p.x - viewW * 0.5));
  respawn = { ...world.spawn };
  keys.clear();
  releaseTouch();
  jumpPressed = false;
  toastTimer = 0;
  $("#toast").classList.remove("show");
  updateHud();
  levelMenu();
}
function show(kind) {
  state = kind;
  keys.clear();
  releaseTouch();
  jumpPressed = false;
  $("#overlay").hidden = false;
  const last = level === LEVELS.length - 1;
  const data = {
    start: [
      `STAGE ${level + 1} / ${LEVELS.length} · ${world.definition.country}`,
      world.definition.name,
      `${world.definition.country} · Mission ${world.definition.mission}/5 · Difficulty ${world.definition.difficulty}/5<br>${world.challenge[1]}`,
      "Let’s go, Remy",
    ],
    paused: [
      "A MOMENT IN THE SHADE",
      "Catch your breath.",
      `${world.definition.country} · Mission ${world.definition.mission}/5 · Difficulty ${world.definition.difficulty}/5<br>${world.challenge[1]}`,
      "Keep exploring",
    ],
    over: [
      "EVERY DOG HAS AN OFF DAY",
      "One more<br>little adventure?",
      "Try this stage again. Your unlocked levels are safe.",
      "Try again",
    ],
    complete: [
      last ? "HOME BEFORE DINNER" : "ANOTHER TRAIL EXPLORED",
      last ? "Good dog, Remy!" : "Lovely work, Remy!",
      `You found ${score} of ${world.biscuits.length} biscuits in ${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}.<br>` +
        (last
          ? "All fifteen missions complete. Dinner is waiting!"
          : "Next stop: " +
            LEVELS[Math.min(LEVELS.length - 1, level + 1)].name),
      last ? "Play from the beginning" : "Next adventure",
    ],
  }[kind];
  $("#panel-kicker").textContent = data[0];
  $("#panel-title").innerHTML = data[1];
  $("#panel-copy").innerHTML = data[2];
  $("#play").innerHTML =
    data[3] + (world.direction === -1 ? " <span>←</span>" : " <span>→</span>");
  $("#panel-hint").textContent =
    kind === "complete"
      ? "YOUR PROGRESS IS SAVED ON THIS DEVICE."
      : `${world.direction === -1 ? "← HEAD LEFT" : "HEAD RIGHT →"} · ${world.challenge[0]}`;
  $("#pause").setAttribute(
    "aria-label",
    kind === "paused" ? "Resume game" : "Pause game",
  );
  levelMenu();
}
function start() {
  unlock();
  if (state === "complete") {
    level = level === LEVELS.length - 1 ? 0 : level + 1;
    resetLevel();
    show("start");
    return;
  }
  if (state !== "paused") resetLevel();
  state = "playing";
  $("#overlay").hidden = true;
  $("#pause").setAttribute("aria-label", "Pause game");
  if (window.matchMedia?.("(max-width: 900px), (pointer: coarse)")?.matches)
    focusGame(true);
  canvas.focus({ preventScroll: true });
  updateHud();
}
$("#play").onclick = start;
$("#pause").onclick = () => {
  if (state === "playing") show("paused");
  else if (state === "paused") start();
};
$("#sound").onclick = () => {
  unlock();
  sound = !sound;
  $("#sound").textContent = sound ? "Sound on ♫" : "Sound off ♫";
  $("#sound").setAttribute("aria-pressed", String(sound));
  tone(660);
};
const mapping = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "jump",
  ArrowUp: "jump",
  KeyW: "jump",
  ArrowDown: "down",
  KeyS: "down",
  ShiftLeft: "run",
  ShiftRight: "run",
};
window.addEventListener("keydown", (e) => {
  if (mapping[e.code]) {
    if (e.target.tagName === "BUTTON" && e.code === "Space") return;
    e.preventDefault();
    if (!e.repeat && mapping[e.code] === "jump") jumpPressed = true;
    keys.add(mapping[e.code]);
  }
  if ((e.code === "Escape" || e.code === "KeyP") && !e.repeat) {
    if (state === "playing") show("paused");
    else if (state === "paused") start();
  }
  if (
    e.code === "Enter" &&
    e.target.tagName !== "BUTTON" &&
    state !== "playing"
  )
    start();
});
window.addEventListener("keyup", (e) => {
  if (mapping[e.code]) {
    keys.delete(mapping[e.code]);
    e.preventDefault();
  }
});
$(".touch-controls").addEventListener("touchstart", (e) => e.preventDefault(), {
  passive: false,
});
for (const event of ["contextmenu", "selectstart", "dragstart"])
  $(".game-shell").addEventListener(event, (e) => e.preventDefault());
for (const b of document.querySelectorAll("[data-control]")) {
  b.addEventListener("contextmenu", (e) => e.preventDefault());
  b.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (b.dataset.control === "run") {
      touchRun = !touchRun;
      b.setAttribute("aria-pressed", String(touchRun));
      return;
    }
    b.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, b.dataset.control);
    if (b.dataset.control === "jump") jumpPressed = true;
  });
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    b.addEventListener(event, (e) => pointers.delete(e.pointerId));
}
window.addEventListener("blur", () => {
  keys.clear();
  releaseTouch();
  if (state === "playing") show("paused");
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") show("paused");
});
function updateHud() {
  $("#health").textContent = "♥ ".repeat(p.health) + "♡ ".repeat(3 - p.health);
  $("#health").setAttribute("aria-label", p.health + " hearts");
  $("#score").textContent = String(score).padStart(2, "0");
  $("#total").textContent = "/ " + world.biscuits.length;
  $(".level-label").textContent =
    String(level + 1).padStart(2, "0") +
    " / " +
    world.definition.country.toUpperCase() +
    " · " +
    world.definition.mission +
    "/5";
  const progress = Math.max(
    0,
    Math.min(
      100,
      Math.floor(
        ((world.direction === 1 ? p.x - 100 : WIDTH - 143 - p.x) / 5080) * 100,
      ),
    ),
  );
  const tags = world.tokens.filter((t) => t.taken).length;
  $("#area").textContent =
    `${world.direction === -1 ? "←" : "→"} ${progress}% · ${world.tokens.length ? `Tags ${tags}/${world.tokens.length}` : world.challenge[0]}`;
  const gate = world.switches[0];
  $("#challenge-status").textContent =
    gate?.remaining > 0
      ? `GATE OPEN · ${Math.ceil(gate.remaining)}s`
      : p.swimming
        ? "SWIMMING · Hold jump to paddle up"
        : world.direction === -1
          ? "← EXIT TO THE LEFT"
          : world.challenge[0];
  $("#power").hidden = p.power <= 0;
  $("#power span").style.transform = `scaleX(${p.power / 10})`;
}
function hurt(fall = false) {
  if (!fall && (p.invincible > 0 || p.power > 0)) return;
  p.health--;
  tone(130, 0.3, "triangle");
  if (p.health <= 0) {
    show("over");
    return;
  }
  if (fall) {
    p.x = respawn.x;
    p.y = respawn.y;
    p.vx = p.vy = 0;
    p.support = null;
    p.grounded = false;
    camera = Math.max(0, p.x - viewW * 0.3);
    toast("Back to your water bowl. You’ve got this!");
  } else {
    p.vx = -p.facing * 270;
    p.vy = -270;
  }
  p.invincible = 2;
}
function step(dt) {
  time += dt;
  if (state !== "playing") return;
  elapsed += dt;
  toastTimer -= dt;
  if (toastTimer <= 0) $("#toast").classList.remove("show");
  updateWorld(world, p, dt);
  const oldY = p.y + p.h;
  movePlayer(
    p,
    {
      left: held("left"),
      right: held("right"),
      run: held("run"),
      jump: held("jump"),
      down: held("down"),
      jumpPressed,
      onJump: () => tone(440, 0.13, "triangle"),
    },
    world.platforms,
    dt,
    world,
  );
  jumpPressed = false;
  if (p.y > HEIGHT + 90) hurt(true);
  if (state !== "playing") {
    updateHud();
    return;
  }
  for (const t of world.tokens)
    if (!t.taken && overlap(p, t)) {
      t.taken = true;
      tone(1200, 0.25);
      toast(
        `Golden tag ${world.tokens.filter((a) => a.taken).length}/${world.tokens.length}!`,
      );
    }
  for (const h of world.hazards) if (h.active && overlap(p, h)) hurt();
  if (state !== "playing") {
    updateHud();
    return;
  }
  if (
    overlap(p, world.goal) &&
    !world.tokens.every((t) => t.taken) &&
    toastTimer <= 0
  )
    toast("Find the remaining golden tags to open the exit.");
  for (const b of world.biscuits) {
    if (b.taken) continue;
    if (p.power > 0 && Math.hypot(b.x - p.x, b.y - p.y) < 145) {
      b.x += (p.x - b.x) * dt * 7;
      b.y += (p.y - b.y) * dt * 7;
    }
    if (overlap(p, b)) {
      b.taken = true;
      score++;
      tone(840 + (score % 4) * 90, 0.08);
    }
  }
  for (const c of world.charms)
    if (!c.taken && overlap(p, c)) {
      c.taken = true;
      p.power = 10;
      tone(1100, 0.4);
      toast("Lavender Zoom! A shield + a biscuit magnet for 10 seconds.");
    }
  for (const c of world.checkpoints)
    if (!c.active && overlap(p, c)) {
      c.active = true;
      respawn = { x: c.x, y: 400 };
      p.health = 3;
      tone(660, 0.3);
      toast("Water break! Checkpoint saved. Hearts refilled.");
    }
  for (const e of world.enemies) {
    if (!e.alive) continue;
    e.x += e.vx * dt;
    if (e.x < e.min || e.x > e.max) {
      e.x = Math.max(e.min, Math.min(e.max, e.x));
      e.vx *= -1;
    }
    if (e.type === "wasp") e.y = 333 + Math.sin(time * 3) * 24;
    if (overlap(p, e)) {
      if (p.power > 0 || (p.vy > 30 && oldY < e.y + 14)) {
        e.alive = false;
        p.vy = -360;
        tone(300, 0.14, "triangle");
      } else hurt();
    }
  }
  if (goalReached(world, p) && state === "playing") {
    unlocked = Math.max(unlocked, Math.min(LEVELS.length - 1, level + 1));
    records[level] = Math.max(records[level] || 0, score);
    saveProgress();
    show("complete");
    tone(880, 0.5);
  }
  camera +=
    (Math.max(
      0,
      Math.min(
        WIDTH - viewW,
        p.x - viewW * (world.direction === 1 ? 0.32 : 0.68),
      ),
    ) -
      camera) *
    Math.min(1, dt * 6);
  updateHud();
}
function rect(x, y, w, h, c, r = 0) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}
function ellipse(x, y, rx, ry, c) {
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function line(x, y, a, b, c, w = 2) {
  ctx.strokeStyle = c;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(a, b);
  ctx.stroke();
}
function text(t, x, y, size, c, font = "sans-serif") {
  ctx.fillStyle = c;
  ctx.font = `${size}px ${font}`;
  ctx.fillText(t, x, y);
}
function hill(x, y, rx, ry, c) {
  ellipse(x, y, rx, ry, c);
}
function tree(x, y, s = 1) {
  rect(x - 5 * s, y - 60 * s, 10 * s, 70 * s, "#797b53");
  ellipse(x, y - 83 * s, 40 * s, 40 * s, "#769571");
  ellipse(x - 27 * s, y - 67 * s, 28 * s, 28 * s, "#819e78");
  ellipse(x + 26 * s, y - 75 * s, 28 * s, 33 * s, "#90a780");
  line(x, y - 20 * s, x + 20 * s, y - 65 * s, "#797b53", 4 * s);
}
function house(x, y, s = 1) {
  rect(x, y - 105 * s, 97 * s, 105 * s, "#e7d4a7", 3);
  ctx.fillStyle = "#bc8268";
  ctx.beginPath();
  ctx.moveTo(x - 12 * s, y - 104 * s);
  ctx.lineTo(x + 44 * s, y - 147 * s);
  ctx.lineTo(x + 110 * s, y - 104 * s);
  ctx.fill();
  rect(x + 17 * s, y - 76 * s, 18 * s, 27 * s, "#82998b", 2);
  rect(x + 60 * s, y - 76 * s, 18 * s, 27 * s, "#82998b", 2);
  rect(x + 38 * s, y - 40 * s, 24 * s, 40 * s, "#a19471", 10);
}
function lavender(x, y, s = 1) {
  if (world.definition.country === "New Zealand") {
    for (let j = -2; j <= 2; j++)
      line(
        x,
        y,
        x + j * 7 * s,
        y - (26 - Math.abs(j) * 4) * s,
        "#668e72",
        2 * s,
      );
    return;
  }
  if (world.definition.country === "UK") {
    line(x, y, x, y - 18 * s, "#789663", 2 * s);
    ellipse(x, y - 20 * s, 5 * s, 4 * s, "#fff4d2");
    ellipse(x, y - 20 * s, 2 * s, 2 * s, "#d6b469");
    return;
  }
  for (let j = -1; j <= 1; j++) {
    const sw = Math.sin(time * 1.8 + x) * 2;
    line(x, y, x + j * 9 * s + sw, y - 28 * s, "#85966b", 1.5);
    for (let k = 0; k < 3; k++)
      ellipse(
        x + j * 9 * s + sw,
        y - (19 + k * 5) * s,
        3 * s,
        4 * s,
        ["#a193bd", "#9182ad", "#b5a6cb"][k],
      );
  }
}
function biscuit(x, y) {
  ctx.save();
  ctx.translate(x + 10, y + 8);
  ctx.rotate(-0.22);
  rect(-8, -4, 16, 8, "#c99351", 3);
  for (const a of [-8, 8])
    for (const b of [-4, 4]) ellipse(a, b, 4, 4, "#dbaf69");
  ellipse(-3, 0, 1, 1, "#ab804d");
  ellipse(3, 0, 1, 1, "#ab804d");
  ctx.restore();
}
function dog(x, y, scale = 1) {
  ctx.save();
  ctx.translate(x + 21, y + 12);
  ctx.scale(p.facing * scale, scale);
  if (p.power > 0) {
    ellipse(0, 0, 33 + Math.sin(time * 9) * 2, 30, "#c3a6e354");
  }
  if (p.invincible > 0 && Math.floor(time * 12) % 2) ctx.globalAlpha = 0.45;
  const running = state === "playing" && (Math.abs(p.vx) > 20 || p.swimming);
  const stride = running
    ? Math.sin(time * Math.max(5, Math.abs(p.vx) * 0.08))
    : 0;
  const airborne = state === "playing" && !p.grounded;
  // Four separate hips and paws: far-side legs behind the body, near-side in front.
  // Keep the swing small enough that the two pairs never collapse into one silhouette.
  function leg(hip, phase, far) {
    const footX = hip + phase * (p.swimming ? 4 : 2);
    const footY =
      (far ? 21 : 24) -
      (p.swimming ? 7 + phase * 2 : airborne ? 4 : Math.max(0, phase) * 2);
    const fur = far ? "#cfd5ce" : "#fffef8";
    line(hip, 7, footX, footY - 2, fur, far ? 5 : 6);
    ellipse(footX + 1, footY, far ? 3.5 : 4, 2.7, fur);
  }
  leg(-7, -stride, true);
  leg(15, stride, true);
  ellipse(-1, 1, 22, 10, "#fdfcf3");
  line(-18, 0, -27, -10 + Math.sin(time * 12) * 3, "#fffef7", 7);
  leg(-18, stride, false);
  leg(4, -stride, false);
  // Body fluff and collar must stay behind the head, never over the muzzle.
  for (let i = 0; i < 5; i++) ellipse(-16 + i * 8, -3, 5, 5, "#fffef8");
  rect(6, 8, 16, 4, "#cf8067", 2);
  ellipse(11, 15, 3, 3, "#ddb666");
  // Draw the far ear first so it cannot cover the eye on that side.
  ellipse(24, -12, 5, 9, "#e5e7e0");
  ellipse(14, -6, 15, 15, "#fffef8");
  ellipse(1, -7, 6, 12, "#dedfd9");
  ellipse(1, -9, 4, 10, "#f5f5ef");
  for (const [fx, fy] of [
    [5, -18],
    [11, -21],
    [17, -20],
    [21, -17],
  ])
    ellipse(fx, fy, 4, 5, "#fffef8");
  const blink = Math.sin(time * 0.8) > 0.996;
  for (const [ex, ey] of [
    [11, -8],
    [23, -8],
  ]) {
    ellipse(ex, ey, 3.3, blink ? 0.7 : 4.1, "#34453f");
    if (!blink) ellipse(ex + 1, ey - 1.5, 1.1, 1.3, "#fff");
  }
  ellipse(17, 0, 10, 7, "#eceee6");
  ellipse(14, 0, 6, 5, "#fffef9");
  ellipse(23, 0, 6, 5, "#fffef9");
  ellipse(19, -2, 4, 3, "#2e403b");
  ellipse(18, -3, 1.4, 0.8, "#7c8b81");
  line(19, 1, 19, 4, "#657067", 1);
  line(19, 4, 23, 3, "#657067", 1);
  if (Math.abs(p.vx) > 60 || state === "start" || state === "complete") {
    ellipse(22, 7, 3, 4, "#e7a19b");
    line(22, 6, 22, 9, "#c78281", 0.7);
  }
  ctx.restore();
}
function enemy(e) {
  ctx.save();
  ctx.translate(e.x + 17, e.y + 16);
  ctx.scale(e.vx < 0 ? -1 : 1, 1);
  if (e.type === "cat") {
    ellipse(0, 3, 17, 10, "#ac8671");
    ellipse(12, -6, 10, 10, "#bd9480");
    ctx.fillStyle = "#bd9480";
    ctx.beginPath();
    ctx.moveTo(3, -10);
    ctx.lineTo(5, -23);
    ctx.lineTo(12, -13);
    ctx.lineTo(20, -22);
    ctx.lineTo(22, -8);
    ctx.fill();
    line(-12, 1, -23, -10, "#ac8671", 5);
    ellipse(15, -7, 2, 2, "#3b4940");
    line(-9, 10, -9, 16, "#82634f", 4);
    line(9, 10, 9, 16, "#82634f", 4);
  } else if (e.type === "chicken") {
    ellipse(0, 1, 16, 12, "#e9bc7c");
    ellipse(11, -9, 9, 10, "#fae1a2");
    ellipse(11, -18, 4, 5, "#c77760");
    rect(17, -9, 8, 4, "#c79043", 2);
    ellipse(13, -11, 2, 2, "#334f47");
    line(-5, 11, -7, 16, "#ab8045");
    line(7, 11, 8, 16, "#ab8045");
    ellipse(-4, 0, 8, 7, "#d4a46b");
  } else {
    ellipse(-4, -12, 10, 6 + Math.sin(time * 40) * 3, "#ffffffb8");
    ellipse(8, -12, 10, 6, "#ffffffb8");
    ellipse(0, 1, 18, 10, "#d9b66f");
    rect(-7, -8, 5, 18, "#6c6653");
    rect(3, -8, 5, 18, "#6c6653");
    ellipse(13, -2, 2, 2, "#344c42");
  }
  ctx.restore();
}
function draw() {
  ctx.clearRect(0, 0, viewW, HEIGHT);
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, world.definition.sky);
  sky.addColorStop(1, world.definition.horizon);
  rect(0, 0, viewW, HEIGHT, sky);
  ellipse(viewW * 0.77, 90, 43, 43, "#fff3c9");
  for (let i = 0; i < 7; i++) {
    const x = i * 390 - camera * 0.12;
    ellipse(x + 70, 89 + (i % 3) * 27, 55, 12, "#fffbee9c");
    ellipse(x + 100, 80 + (i % 3) * 27, 35, 18, "#fffbee9c");
  }
  for (let i = -1; i < 10; i++) {
    hill(i * 450 - camera * 0.18, 380, 360, 190 + (i % 3) * 25, "#b4c8ad");
    hill(
      i * 380 - camera * 0.3,
      435,
      280,
      150 + (i % 2) * 40,
      world.definition.hills,
    );
  }
  ctx.save();
  ctx.translate(-camera * 0.45, 0);
  for (let i = 0; i < 18; i++) {
    if (i % 4 === 0) house(i * 340 + 80, 342, 0.65);
    if (i % 3 === 0) tree(i * 340 + 190, 360, 0.8);
  }
  ctx.restore();
  rect(0, 367, viewW, 180, "#bcc49d");
  for (let row = 0; row < 4; row++) {
    for (let i = -1; i < 35; i++) {
      let x = i * 70 - ((camera * (0.48 + row * 0.07)) % 70);
      ellipse(x, 390 + row * 19, 37, 9, "#aaa0b5");
      lavender(x, 400 + row * 19, 0.55 + row * 0.07);
    }
  }
  drawScenery();
  ctx.save();
  ctx.translate(-camera, 0);
  drawChallenges();
  for (const r of world.platforms) {
    if (r.inactive) continue;
    if (r.x + r.w < camera - 30 || r.x > camera + viewW + 30) continue;
    if (r.kind === "gate") {
      rect(r.x, r.y, r.w, r.h, "#a6805c", 4);
      for (let y = r.y + 10; y < r.y + r.h; y += 28)
        line(r.x, y, r.x + r.w, y, "#e4bd82", 4);
      continue;
    }
    if (r.ground) {
      rect(r.x, r.y, r.w, r.h, world.definition.ground);
      rect(r.x, r.y + 8, r.w, 12, "#b1ad77");
      rect(r.x, r.y, r.w, 9, "#7d996c", 3);
      for (let xx = r.x + 15; xx < r.x + r.w; xx += 39) {
        rect(xx, r.y + 38 + (Math.floor(xx) % 3) * 15, 17, 4, "#b4a67e", 2);
        if (Math.floor(xx) % 4 === 0) lavender(xx, r.y, 1);
      }
    } else {
      rect(
        r.x,
        r.y,
        r.w,
        r.h,
        r.kind === "moving"
          ? "#6b9fad"
          : r.kind === "crumble"
            ? "#ba9574"
            : r.kind === "spring"
              ? "#72aa71"
              : "#c9bb99",
        5,
      );
      if (r.kind === "moving")
        text(
          r.axis === "y" ? "↕" : "↔",
          r.x + r.w / 2 - 7,
          r.y + 17,
          18,
          "#fff8db",
        );
      if (r.kind === "crumble") {
        for (let x = r.x + 15; x < r.x + r.w; x += 25)
          line(x, r.y + 4, x + 8, r.y + 18, r.crack ? "#ae504a" : "#786757", 2);
      }
      if (r.kind === "spring") text("↑ ↑", r.x + 10, r.y + 15, 17, "#fff8db");
      rect(r.x, r.y, r.w, 6, "#8b9b77", 3);
      for (let xx = r.x + 20; xx < r.x + r.w; xx += 35)
        line(xx, r.y + 8, xx, r.y + 20, "#b3a482", 1);
    }
  }
  for (const x of [80, 520, 1270, 2180, 2630, 3400, 4480, 4930])
    if (
      world.platforms.some(
        (r) => r.ground && r.y === 450 && x >= r.x && x <= r.x + r.w,
      )
    )
      tree(x, 450, x === 80 ? 1.6 : 1.1);
  for (const c of world.checkpoints) {
    rect(c.x - 2, 432, 44, 15, c.active ? "#6d9eae" : "#91b3b9", 5);
    ellipse(c.x + 20, 433, 21, 5, "#c9e8e9");
    rect(c.x + 42, 389, 4, 60, "#9c9271");
    rect(c.x + 32, 382, 53, 24, "#f5ecd0", 4);
    text(c.active ? "SAVED" : "WATER", c.x + 38, 398, 9, "#58776a");
  }
  for (const b of world.biscuits)
    if (!b.taken && b.x > camera - 30 && b.x < camera + viewW + 30)
      biscuit(b.x, b.y + Math.sin(time * 3 + b.x) * 3);
  for (const c of world.charms)
    if (!c.taken) {
      ellipse(c.x + 12, c.y + 14, 23, 23, "#f5edf6a0");
      lavender(c.x + 12, c.y + 30, 1.2);
      ellipse(c.x + 12, c.y + 30, 8, 3, "#ad87b9");
    }
  for (const e of world.enemies) if (e.alive) enemy(e);
  const gx = world.goal.x;
  if (level === LEVELS.length - 1) house(gx + 10, 450, 1.65);
  rect(gx + 35, 373, 5, 77, "#9c9271");
  rect(gx - 15, 351, 130, 34, "#f5ecd0", 5);
  text(
    level === LEVELS.length - 1
      ? "CHEZ REMY"
      : world.direction === -1
        ? "← EXIT"
        : "EXIT →",
    gx - 3,
    373,
    16,
    "#58776a",
  );
  if (world.tokens.some((t) => !t.taken))
    text("TAGS NEEDED", gx - 5, 404, 12, "#936746");
  if (state === "start") {
    const save = p.facing;
    p.facing = 1;
    dog(camera + Math.min(760, viewW - 90), 403, 1.7);
    p.facing = save;
  } else dog(p.x, p.y);
  ctx.restore();
  const vignette = ctx.createLinearGradient(0, 490, 0, 550);
  vignette.addColorStop(0, "#70894c00");
  vignette.addColorStop(1, "#70894c33");
  rect(0, 490, viewW, 60, vignette);
}
function resize() {
  const box = canvas.getBoundingClientRect();
  viewW = (HEIGHT * box.width) / box.height;
  const renderHeight = box.height < 320 ? 400 : HEIGHT;
  viewW = (renderHeight * box.width) / box.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(viewW * dpr);
  canvas.height = renderHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, -(HEIGHT - renderHeight) * dpr);
}
new ResizeObserver(resize).observe(canvas);
resize();
updateHud();
levelMenu();
show("start");
let last = 0,
  accumulator = 0;
function frame(now) {
  if (!last) last = now;
  accumulator += Math.min((now - last) / 1000, 0.05);
  last = now;
  while (accumulator >= 1 / 120) {
    step(1 / 120);
    accumulator -= 1 / 120;
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Opt-in inspection bridge for browser smoke tests; absent in normal play.
if (new URLSearchParams(location.search).has("test"))
  window.__remy = {
    get level() {
      return level;
    },
    loadLevel(i) {
      level = i;
      resetLevel();
      state = "playing";
      $("#overlay").hidden = true;
    },
    get state() {
      return state;
    },
    get player() {
      return p;
    },
    get world() {
      return world;
    },
    get score() {
      return score;
    },
    start,
    step,
    show,
  };

function drawScenery() {
  if (world.definition.country !== "France") {
    drawCountryScenery();
    return;
  }
  const scene = world.definition.scene;
  ctx.save();
  ctx.translate(-camera * 0.55, 0);
  for (let i = 0; i < 20; i++) {
    const x = i * 310;
    if (["beach", "harbour", "cliffs"].includes(scene)) {
      rect(x, 345, 310, 100, "#83bbc3");
      for (let j = 0; j < 4; j++)
        line(
          x + 20 + j * 63,
          365 + j * 12,
          x + 60 + j * 63,
          365 + j * 12,
          "#cce4df",
          2,
        );
      if (scene === "harbour") {
        rect(x + 35, 384, 100, 15, "#8c7770", 8);
        line(x + 80, 384, x + 80, 300, "#6b7f78", 3);
        ctx.fillStyle = "#f3e8cf";
        ctx.beginPath();
        ctx.moveTo(x + 84, 306);
        ctx.lineTo(x + 84, 371);
        ctx.lineTo(x + 130, 371);
        ctx.fill();
      }
      if (scene === "cliffs") {
        ctx.fillStyle = "#d9d8c1";
        ctx.beginPath();
        ctx.moveTo(x, 450);
        ctx.lineTo(x + 80, 280);
        ctx.lineTo(x + 150, 307);
        ctx.lineTo(x + 250, 450);
        ctx.fill();
      }
      if (scene === "beach") {
        rect(x, 425, 310, 25, "#e1cb9e");
        line(x + 130, 430, x + 130, 375, "#9b8869", 3);
        ellipse(x + 130, 374, 38, 10, "#cb8c78");
      }
    }
    if (scene === "vineyard") {
      for (let j = 0; j < 4; j++) {
        rect(x + j * 70, 373, 4, 65, "#9c9470");
        line(x, 397, x + 280, 397, "#9c9470");
        ellipse(x + j * 70, 385, 27, 17, "#789b71");
        for (let k = 0; k < 3; k++)
          ellipse(x + j * 70 + k * 5, 402, 4, 5, "#8f7a9f");
      }
    }
    if (scene === "olive") {
      tree(x + 100, 437, 1.1);
      for (let j = 0; j < 5; j++)
        ellipse(x + 75 + j * 10, 353 + (j % 2) * 13, 3, 4, "#546b51");
    }
    if (scene === "forest") {
      for (let j = 0; j < 2; j++) {
        const tx = x + j * 150;
        rect(tx, 310, 10, 140, "#847d62");
        ctx.fillStyle = j ? "#668874" : "#527764";
        ctx.beginPath();
        ctx.moveTo(tx - 45, 390);
        ctx.lineTo(tx + 5, 250);
        ctx.lineTo(tx + 55, 390);
        ctx.fill();
      }
    }
    if (scene === "aqueduct") {
      rect(x, 295, 310, 24, "#c4c5ad");
      for (let j = 0; j < 3; j++) {
        rect(x + j * 105, 315, 24, 130, "#bebfa6");
        ctx.strokeStyle = "#c4c5ad";
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.arc(x + j * 105 + 63, 363, 40, Math.PI, 0);
        ctx.stroke();
      }
    }
    if (["market", "sunset", "home"].includes(scene)) {
      house(x + 30, 430, 0.95);
      if (scene === "market") {
        rect(x + 153, 376, 108, 15, i % 2 ? "#b28480" : "#839d8b", 4);
        rect(x + 156, 390, 4, 48, "#9f8a6b");
        rect(x + 254, 390, 4, 48, "#9f8a6b");
        rect(x + 151, 426, 115, 14, "#b79975");
      }
      if (scene === "home") {
        ellipse(x + 58, 367, 7, 10, "#f6d78e");
        ellipse(x + 99, 367, 7, 10, "#f6d78e");
      }
    }
  }
  ctx.restore();
}

function drawChallenges() {
  for (const w of world.water) {
    rect(w.x, w.y, w.w, w.h, "#69b8d6b8");
    line(w.x, w.y, w.x + w.w, w.y, "#e5faff", 3);
    for (let x = w.x + 20; x < w.x + w.w; x += 65) {
      ellipse(x, w.y + Math.sin(time * 3 + x) * 3, 17, 3, "#caedf1");
      for (let j = 0; j < 3; j++)
        ellipse(
          x + Math.sin(time + j) * 8,
          w.y + 30 + ((j * 67 + time * 16) % 150),
          2,
          3,
          "#d3f5f09c",
        );
    }
    if (w.current)
      for (let x = w.x + 60; x < w.x + w.w; x += 170)
        text(w.current > 0 ? "→" : "←", x, w.y + 100, 24, "#d8f3f1");
  }
  for (const w of world.wind)
    for (let x = w.x + 30; x < w.x + w.w; x += 200)
      text(
        Math.sin(world.clock * 1.4) > 0 ? "→ →" : "← ←",
        x,
        215,
        20,
        "#ffffff99",
      );
  for (const h of world.hazards) {
    if (h.kind === "sprinkler") {
      rect(h.x, h.y + h.h - 8, h.w, 8, h.warning ? "#daa351" : "#709daa", 4);
      if (h.active)
        for (let j = 0; j < 4; j++)
          line(
            h.x + 4 + j * 8,
            h.y + h.h,
            h.x + 3 + j * 8,
            h.y + Math.sin(time * 15 + j) * 5,
            "#cf7d899e",
            5,
          );
      if (h.warning) text("!", h.x + 13, h.y + h.h - 17, 22, "#b67b30");
    } else {
      ellipse(h.x + 16, h.y + 13, 19, 14, "#d896b5");
      for (let j = 0; j < 4; j++)
        line(
          h.x + j * 9,
          h.y + 16,
          h.x + j * 9 + Math.sin(time * 5 + j) * 5,
          h.y + 35,
          "#c17f9e",
          3,
        );
    }
  }
  for (const t of world.tokens)
    if (!t.taken) {
      ellipse(t.x + 12, t.y + 12, 15, 15, "#fff2b94d");
      rect(t.x + 2, t.y + 2, 20, 20, "#dba94e", 6);
      ellipse(t.x + 12, t.y + 12, 5, 5, "#fff3be");
    }
  for (const s of world.switches) {
    rect(s.x, s.y, s.w, s.h, s.remaining > 0 ? "#81b88a" : "#d3a45b", 5);
    text(
      s.remaining > 0 ? `${Math.ceil(s.remaining)}s` : "STEP",
      s.x + 10,
      s.y + 14,
      12,
      "#fff8e4",
    );
  }
}

// A reproducible scene preview for development; normal visits keep saved unlocks.
const previewParams = new URLSearchParams(location.search);
if (previewParams.has("test") && previewParams.has("stage")) {
  const stage = Number(previewParams.get("stage"));
  if (Number.isInteger(stage) && stage >= 0 && stage < LEVELS.length) {
    level = stage;
    resetLevel();
    show("start");
  }
}
if (previewParams.has("test") && previewParams.has("x")) {
  const x = Number(previewParams.get("x"));
  if (Number.isFinite(x)) {
    p.x = Math.max(0, Math.min(WIDTH - p.w, x));
    p.y = 360;
    camera = Math.max(0, Math.min(WIDTH - viewW, p.x - viewW * 0.5));
    state = "playing";
    $("#overlay").hidden = true;
  }
}

function drawCountryScenery() {
  const nz = world.definition.country === "New Zealand",
    scene = world.definition.scene;
  ctx.save();
  ctx.translate(-camera * 0.5, 0);
  for (let i = 0; i < 20; i++) {
    const x = i * 330;
    if (nz) {
      ctx.fillStyle = "#849f9a";
      ctx.beginPath();
      ctx.moveTo(x - 80, 385);
      ctx.lineTo(x + 125, 155 + (i % 3) * 28);
      ctx.lineTo(x + 320, 385);
      ctx.fill();
      ctx.fillStyle = "#e7eeea";
      ctx.beginPath();
      ctx.moveTo(x + 84, 205 + (i % 3) * 28);
      ctx.lineTo(x + 125, 155 + (i % 3) * 28);
      ctx.lineTo(x + 165, 205 + (i % 3) * 28);
      ctx.lineTo(x + 129, 192 + (i % 3) * 28);
      ctx.fill();
      if (
        scene === "nz-coast" ||
        scene === "nz-lake" ||
        scene === "nz-mountains"
      ) {
        rect(x, 370, 330, 70, "#87bdc6");
        for (let j = 0; j < 4; j++)
          line(
            x + 30 + j * 70,
            391 + j * 9,
            x + 65 + j * 70,
            391 + j * 9,
            "#d0e8dc",
            2,
          );
      }
      if (scene === "nz-forest") {
        rect(x + 85, 315, 9, 130, "#867e64");
        for (let j = -2; j <= 2; j++) {
          line(
            x + 90,
            322,
            x + 90 + j * 23,
            302 + Math.abs(j) * 10,
            "#507c62",
            5,
          );
        }
      }
      if (i % 2 === 0) {
        ellipse(x + 225, 424, 20, 11, "#fff7e6");
        ellipse(x + 246, 425, 7, 7, "#69796a");
        line(x + 213, 431, x + 213, 444, "#69796a", 3);
        line(x + 234, 431, x + 234, 444, "#69796a", 3);
      }
    } else {
      rect(x, 419, 330, 24, "#929b7b");
      for (let j = 0; j < 8; j++)
        rect(x + j * 43, 404 + (j % 2) * 4, 40, 17, "#a5ab91", 3);
      if (scene === "uk-castle") {
        rect(x + 70, 310, 125, 100, "#a1a89c");
        for (let j = 0; j < 5; j++)
          rect(x + 65 + j * 29, 295, 20, 25, "#969f94");
        rect(x + 115, 356, 32, 55, "#6b8276", 14);
      } else {
        rect(x + 70, 340, 90, 77, "#c8c6ae");
        ctx.fillStyle = "#828c85";
        ctx.beginPath();
        ctx.moveTo(x + 55, 343);
        ctx.lineTo(x + 115, 300);
        ctx.lineTo(x + 175, 343);
        ctx.fill();
        rect(x + 88, 362, 16, 21, "#718e89");
        rect(x + 130, 362, 16, 21, "#718e89");
        rect(x + 110, 385, 18, 33, "#806f61");
      }
      if (i % 3 === 0) {
        rect(x + 230, 372, 24, 49, "#b47567", 4);
        rect(x + 234, 381, 16, 24, "#d4e5dc", 2);
      }
      if (scene === "uk-coast") {
        rect(x, 430, 330, 20, "#8ab7c2");
      }
    }
  }
  ctx.restore();
}
