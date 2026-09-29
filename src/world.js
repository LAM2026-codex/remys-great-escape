export const WIDTH = 5400,
  HEIGHT = 550;
export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function createWorld(index = 0) {
  if (index > 0) return addChallenges(buildLevel(index));
  const ground = [
    [0, 930],
    [1050, 770],
    [1960, 1070],
    [3170, 900],
    [4210, 1190],
  ].map(([x, w]) => ({ x, y: 450, w, h: 150, ground: true }));
  const ledges = [
    [410, 367, 150],
    [680, 294, 140],
    [1150, 360, 170],
    [1440, 292, 160],
    [1755, 358, 140],
    [2110, 360, 160],
    [2400, 290, 170],
    [2710, 350, 170],
    [3000, 340, 150],
    [3290, 370, 150],
    [3530, 295, 180],
    [3830, 360, 160],
    [4050, 338, 150],
    [4420, 350, 170],
    [4720, 290, 170],
  ].map(([x, y, w]) => ({ x, y, w, h: 22 }));
  const biscuits = [];
  for (let x = 230; x < 5110; x += 175)
    if (ground.some((g) => x > g.x + 20 && x < g.x + g.w - 20))
      biscuits.push({ x, y: 407, w: 20, h: 16, taken: false });
  for (const p of ledges)
    for (let i = 0; i < 3; i++)
      biscuits.push({
        x: p.x + 25 + i * 38,
        y: p.y - 42,
        w: 20,
        h: 16,
        taken: false,
      });
  const enemies = [
    { x: 740, min: 570, max: 880, type: "cat" },
    { x: 1480, min: 1330, max: 1720, type: "chicken" },
    { x: 2310, min: 2180, max: 2560, type: "cat" },
    { x: 2900, min: 2780, max: 3000, type: "wasp" },
    { x: 3650, min: 3420, max: 3920, type: "chicken" },
    { x: 4590, min: 4450, max: 4820, type: "cat" },
  ].map((e, i) => ({
    ...e,
    y: e.type === "wasp" ? 342 : 420,
    w: 34,
    h: 30,
    vx: i % 2 ? 55 : -50,
    alive: true,
  }));
  return addChallenges({
    definition: LEVELS[0],
    index: 0,
    platforms: [...ground, ...ledges],
    biscuits,
    enemies,
    charms: [
      { x: 1487, y: 250, w: 24, h: 30, taken: false },
      { x: 3570, y: 250, w: 24, h: 30, taken: false },
    ],
    checkpoints: [
      { x: 2050, y: 425, w: 40, h: 25, active: false },
      { x: 4280, y: 425, w: 40, h: 25, active: false },
    ],
  });
}
export function createPlayer(x = 100, y = 400) {
  return {
    x,
    y,
    w: 43,
    h: 34,
    vx: 0,
    vy: 0,
    grounded: false,
    coyote: 0,
    buffer: 0,
    facing: 1,
    health: 3,
    invincible: 0,
    power: 0,
  };
}
export function movePlayer(p, input, platforms, dt, environment = {}) {
  platforms = platforms.filter((r) => !r.inactive);
  const water = environment.water?.find((r) => overlap(p, r));
  p.swimming = !!water;
  const wind = environment.wind?.find((r) => overlap(p, r));
  p.coyote = p.grounded ? 0.11 : Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);
  if (input.jumpPressed) p.buffer = 0.13;
  const dir = Number(!!input.right) - Number(!!input.left),
    speed = (water ? 185 : input.run ? 330 : 245) * (p.power > 0 ? 1.22 : 1);
  const target = dir * speed,
    accel = p.grounded ? 1900 : 1200;
  p.vx += Math.max(-accel * dt, Math.min(accel * dt, target - p.vx));
  if (dir) p.facing = dir;
  if (!water && p.buffer > 0 && p.coyote > 0) {
    p.vy = -580;
    p.grounded = false;
    p.coyote = 0;
    p.buffer = 0;
    input.onJump?.();
  }
  if (water) {
    const swimTarget = input.jump ? -220 : input.down ? 175 : 55;
    p.vy += (swimTarget - p.vy) * Math.min(1, dt * 7);
    p.buffer = 0;
  } else {
    if (!input.jump && p.vy < -230) p.vy += 2200 * dt;
    p.vy = Math.min(850, p.vy + 1550 * dt);
  }
  p.x +=
    (p.vx +
      (water?.current || 0) +
      (wind && !p.grounded
        ? wind.force * Math.sin((environment.clock || 0) * 1.4)
        : 0)) *
    dt;
  p.x = Math.max(0, Math.min(WIDTH - p.w, p.x));
  for (const r of platforms)
    if (r.ground && overlap(p, r)) {
      if (p.vx > 0) p.x = r.x - p.w;
      else if (p.vx < 0) p.x = r.x + r.w;
      p.vx = 0;
    }
  const previousBottom = p.y + p.h;
  p.y += p.vy * dt;
  p.grounded = false;
  p.support = null;
  for (const r of platforms)
    if (
      p.vy >= 0 &&
      previousBottom <= r.y + 2 &&
      p.y + p.h >= r.y &&
      p.x + p.w > r.x &&
      p.x < r.x + r.w
    ) {
      p.y = r.y - p.h;
      p.vy = 0;
      p.grounded = true;
      p.support = r;
      if (r.kind === "spring") {
        p.vy = -850;
        p.grounded = false;
        p.support = null;
        input.onJump?.();
      }
    }
  for (const r of platforms)
    if (r.kind === "spring" && p.vy >= 0 && overlap(p, r)) {
      p.vy = -850;
      p.grounded = false;
      p.support = null;
      input.onJump?.();
    }
  p.invincible = Math.max(0, p.invincible - dt);
  p.power = Math.max(0, p.power - dt);
}

// Each route has its own authored gaps and elevated biscuit trail.
export const LEVELS = [
  {
    name: "The Garden Gate",
    region: "Aix countryside",
    scene: "garden",
    sky: "#d8e9df",
    horizon: "#f4edd0",
    hills: "#9fb79a",
    ground: "#c6b78d",
    gaps: [],
  },
  {
    name: "Lavender Lanes",
    region: "Valensole",
    scene: "lavender",
    sky: "#dce3f2",
    horizon: "#f4e2d8",
    hills: "#b2a6c5",
    ground: "#c6b29b",
    gaps: [
      [820, 110],
      [1700, 120],
      [2640, 130],
      [3740, 140],
    ],
    trail: [350, 600, 1170, 1420, 2100, 2390, 3010, 3290, 4110, 4460],
  },
  {
    name: "The Olive Grove",
    region: "Les Alpilles",
    scene: "olive",
    sky: "#e0e9ce",
    horizon: "#f9e9bd",
    hills: "#8f9f72",
    ground: "#b9b086",
    gaps: [
      [1050, 120],
      [1950, 130],
      [2950, 120],
      [4070, 140],
    ],
    trail: [400, 710, 1380, 1680, 2270, 2600, 3340, 3670, 4400, 4710],
  },
  {
    name: "Vineyard Hop",
    region: "Luberon",
    scene: "vineyard",
    sky: "#d5e5df",
    horizon: "#f3dfb7",
    hills: "#8ba888",
    ground: "#b9a38b",
    gaps: [
      [750, 110],
      [1550, 120],
      [2450, 130],
      [3380, 140],
      [4310, 135],
    ],
    trail: [320, 560, 1040, 1300, 1880, 2170, 2800, 3070, 3720, 4000, 4630],
  },
  {
    name: "Market Day",
    region: "Gordes",
    scene: "market",
    sky: "#f4dfcf",
    horizon: "#faefc7",
    hills: "#b1ac91",
    ground: "#cbb39d",
    gaps: [
      [980, 130],
      [2070, 140],
      [3160, 130],
      [4210, 140],
    ],
    trail: [390, 690, 1320, 1640, 1860, 2420, 2740, 3540, 3820, 4600],
  },
  {
    name: "The Old Aqueduct",
    region: "Pont du Gard",
    scene: "aqueduct",
    sky: "#cfe2ea",
    horizon: "#ebefcd",
    hills: "#95afa5",
    ground: "#bbbca2",
    gaps: [
      [700, 130],
      [1420, 140],
      [2180, 145],
      [3010, 140],
      [3830, 145],
      [4610, 135],
    ],
    trail: [
      320, 540, 1020, 1210, 1770, 2000, 2530, 2780, 3390, 3580, 4160, 4410,
    ],
  },
  {
    name: "Salt & Sea",
    region: "Cassis",
    scene: "beach",
    sky: "#c5e4ed",
    horizon: "#f9efcc",
    hills: "#77b8bf",
    ground: "#e0c796",
    gaps: [
      [940, 140],
      [1860, 145],
      [2810, 140],
      [3760, 145],
      [4560, 140],
    ],
    trail: [340, 650, 1280, 1570, 2210, 2500, 3160, 3460, 4090, 4380],
  },
  {
    name: "Harbour Hounds",
    region: "La Ciotat",
    scene: "harbour",
    sky: "#cbdfe7",
    horizon: "#f5dfca",
    hills: "#83a6b3",
    ground: "#bdafa0",
    gaps: [
      [780, 135],
      [1620, 145],
      [2520, 140],
      [3430, 145],
      [4330, 140],
    ],
    trail: [300, 540, 1110, 1370, 1960, 2250, 2870, 3130, 3780, 4020, 4650],
  },
  {
    name: "Calanque Climb",
    region: "The limestone coast",
    scene: "cliffs",
    sky: "#c7e2e6",
    horizon: "#eef0d8",
    hills: "#b5beb5",
    ground: "#d0cabb",
    gaps: [
      [860, 140],
      [1790, 145],
      [2710, 145],
      [3650, 140],
      [4530, 145],
    ],
    trail: [330, 590, 1190, 1460, 2110, 2380, 3040, 3300, 3980, 4260],
  },
  {
    name: "Pinecone Path",
    region: "Sainte-Victoire",
    scene: "forest",
    sky: "#c9d9d3",
    horizon: "#e8e5bd",
    hills: "#729785",
    ground: "#aaa58c",
    gaps: [
      [1050, 145],
      [2070, 145],
      [3060, 140],
      [4060, 145],
    ],
    trail: [360, 690, 1450, 1760, 2400, 2710, 3420, 3740, 4460, 4740],
  },
  {
    name: "Golden Hour",
    region: "The hilltop villages",
    scene: "sunset",
    sky: "#e5c0bc",
    horizon: "#f5d59c",
    hills: "#9e92a5",
    ground: "#bda294",
    gaps: [
      [780, 140],
      [1670, 145],
      [2580, 145],
      [3530, 145],
      [4470, 145],
    ],
    trail: [310, 560, 1100, 1410, 2020, 2300, 2930, 3220, 3870, 4170],
  },
  {
    name: "Home Before Dinner",
    region: "Remy’s village",
    scene: "home",
    sky: "#bec8df",
    horizon: "#efd8b9",
    hills: "#8b92ac",
    ground: "#b4aa9e",
    gaps: [
      [920, 140],
      [1900, 145],
      [2890, 145],
      [3850, 145],
      [4660, 140],
    ],
    trail: [340, 640, 1260, 1550, 2250, 2530, 3250, 3530, 4190, 4420],
  },
];
function buildLevel(index) {
  const definition = LEVELS[index];
  if (!definition) throw new RangeError("Unknown level");
  const ground = [];
  let start = 0;
  for (const [x, gap] of definition.gaps) {
    ground.push({ x: start, y: 450, w: x - start, h: 150, ground: true });
    start = x + gap;
  }
  ground.push({ x: start, y: 450, w: WIDTH - start, h: 150, ground: true });
  const ledges = definition.trail.map((x, i) => ({
    x,
    y: [367, 292, 350, 278][(i + index) % 4],
    w: 150 + (i % 3) * 15,
    h: 22,
  }));
  // A lower stepping stone makes every high trail reachable from the ground.
  for (const a of [...ledges])
    if (
      a.y < 330 &&
      !ledges.some((b) => b !== a && b.x < a.x && a.x - b.x < 260 && b.y >= 330)
    )
      ledges.push({ x: a.x - 150, y: 370, w: 105, h: 22 });
  const biscuits = [];
  for (const g of ground)
    for (let x = g.x + 140; x < g.x + g.w - 60; x += 175)
      biscuits.push({ x, y: 407, w: 20, h: 16, taken: false });
  for (const a of ledges)
    for (let j = 0; j < 3; j++)
      biscuits.push({
        x: a.x + 15 + j * 35,
        y: a.y - 38,
        w: 20,
        h: 16,
        taken: false,
      });
  const enemies = ground.slice(0, -1).map((g, i) => ({
    x: g.x + g.w * 0.65,
    y: 420,
    w: 34,
    h: 30,
    min: g.x + 160,
    max: g.x + g.w - 75,
    type: ["cat", "chicken", "wasp"][(index + i) % 3],
    vx: (i % 2 ? 1 : -1) * (45 + index * 2),
    alive: true,
  }));
  const checkpoints = [
    ground[Math.floor(ground.length / 3)],
    ground[Math.floor((ground.length * 2) / 3)],
  ].map((g) => ({ x: g.x + 60, y: 425, w: 40, h: 25, active: false }));
  const charms = [ledges[2], ledges[Math.floor(ledges.length * 0.7)]].map(
    (a) => ({ x: a.x + 45, y: a.y - 38, w: 24, h: 30, taken: false }),
  );
  return {
    definition,
    index,
    platforms: [...ground, ...ledges],
    biscuits,
    enemies,
    checkpoints,
    charms,
  };
}

export const CHALLENGES = [
  [
    "Find your paws",
    "Learn to run, jump and bounce past the garden animals. Follow the biscuits to the exit.",
  ],
  [
    "Catch a ride",
    "Ride the blue moving platforms across the long lavender ditch. Wait for one to come close before jumping.",
  ],
  [
    "Keep moving",
    "The cracked wooden bridge crumbles a moment after you step on it. Keep hopping; missing boards return after 3 seconds.",
  ],
  [
    "Spring into the vines",
    "Green spring pads launch you higher. Bounce up to collect the golden tag, then reach the exit.",
  ],
  [
    "Wrong-way market",
    "Start on the right and travel LEFT. Find both golden tags around the market stalls before leaving.",
  ],
  [
    "Up the aqueduct",
    "Ride the blue lift to the upper balcony and collect its golden tag. Step off at the top.",
  ],
  [
    "Doggy paddle",
    "Swim through the bay: hold JUMP to paddle up, release to sink, or hold DOWN to dive. Find both underwater tags.",
  ],
  [
    "Against the current",
    "Swim LEFT against the harbour current. Find the two underwater tags and avoid the pink jellyfish.",
  ],
  [
    "Ride the breeze",
    "Spring pads and gusts carry you through the cliffs. Watch the wind arrows and collect the high golden tag.",
  ],
  [
    "Watch the rhythm",
    "Garden sprinklers pulse on and off. Orange means a burst is coming; jump over them or wait for blue.",
  ],
  [
    "Beat the gate",
    "Travel LEFT. Step on the brass switch to open the gate for 8 seconds, then run through before it closes.",
  ],
  [
    "The final stretch",
    "Ride moving platforms, swim for a tag and time the sprinklers. Collect all three golden tags to bring Remy home.",
  ],
];
function addChallenges(w) {
  const n = w.index;
  if (n > 0)
    w.platforms = [
      { x: 0, y: 450, w: WIDTH, h: 150, ground: true },
      ...w.platforms.filter((r) => !r.ground),
    ];
  w.challenge = CHALLENGES[n];
  w.clock = 0;
  w.direction = [4, 7, 10].includes(n) ? -1 : 1;
  w.spawn = { x: 100, y: 400 };
  w.goal = { x: 5180, y: 340, w: 100, h: 110 };
  w.water = [];
  w.wind = [];
  w.hazards = [];
  w.tokens = [];
  w.switches = [];
  const cut = (a, b) => {
    const result = [];
    for (const r of w.platforms) {
      if (r.x + r.w <= a || r.x >= b) {
        result.push(r);
        continue;
      }
      if (r.ground) {
        if (r.x < a) result.push({ ...r, w: a - r.x });
        if (r.x + r.w > b) result.push({ ...r, x: b, w: r.x + r.w - b });
      }
    }
    w.platforms = result;
    for (const key of ["biscuits", "enemies", "charms", "checkpoints"])
      w[key] = w[key].filter((r) => r.x < a - 50 || r.x > b + 50);
  };
  const tag = (x, y, ride) =>
    w.tokens.push({ x, y, w: 24, h: 24, taken: false, ride });
  const bridge = (a, b, kind) => {
    cut(a, b);
    for (let x = a + 60, i = 0; x < b - 20; x += 165, i++)
      w.platforms.push({
        x,
        y: 425,
        w: 110,
        h: 20,
        kind,
        baseX: x,
        baseY: 425,
        axis: "x",
        range: kind === "moving" ? 35 : 0,
        phase: i * 0.5,
        speed: 0.85,
      });
  };
  const spring = (x) =>
    w.platforms.push({ x, y: 432, w: 65, h: 18, kind: "spring" });
  const pool = (a, b, current = 0) => {
    cut(a, b);
    w.water.push({ x: a, y: 320, w: b - a, h: 230, current });
    w.platforms.push({ x: a, y: 515, w: b - a, h: 50, ground: true });
    // Exit steps below the waterline allow a gentle climb back onto either bank.
    w.platforms.push(
      { x: a, y: 480, w: 70, h: 18 },
      { x: b - 70, y: 480, w: 70, h: 18 },
    );
    for (let x = a + 80; x < b - 40; x += 130)
      w.biscuits.push({ x, y: 410 + (x % 3) * 20, w: 20, h: 16, taken: false });
  };
  const sprinkler = (x, phase = 0) =>
    w.hazards.push({
      x,
      y: 382,
      w: 36,
      h: 68,
      kind: "sprinkler",
      phase,
      active: false,
    });
  if (n === 1) bridge(2100, 3060, "moving");
  if (n === 2) bridge(2180, 3140, "crumble");
  if (n === 3 || n === 8) {
    // A tall prize balcony cannot be reached with an ordinary jump.
    const x = n === 3 ? 2250 : 3150;
    cut(x - 100, x + 650);
    w.platforms.push({ x: x - 100, y: 450, w: 750, h: 150, ground: true });
    spring(x);
    w.platforms.push({ x: x + 80, y: 240, w: 220, h: 22 });
    tag(x + 165, 202);
    if (n === 8) w.wind.push({ x: 700, y: 0, w: 4050, h: 450, force: 80 });
  }
  if (n === 4) {
    tag(1640, 245);
    tag(3540, 325);
  }
  if (n === 5) {
    cut(2050, 2900);
    w.platforms.push({ x: 2050, y: 450, w: 850, h: 150, ground: true });
    const lift = {
      x: 2330,
      y: 430,
      w: 150,
      h: 22,
      kind: "moving",
      baseX: 2330,
      baseY: 325,
      axis: "y",
      range: 105,
      phase: Math.PI / 2,
      speed: 0.65,
    };
    w.platforms.push(lift, { x: 2490, y: 220, w: 260, h: 22 });
    tag(2580, 182);
  }
  if (n === 6 || n === 7) {
    pool(1500, 3750, n === 7 ? 65 : 0);
    tag(2050, 463);
    tag(3200, 450);
    if (n === 7)
      for (const x of [2400, 2900, 3470])
        w.hazards.push({
          x,
          y: 390,
          baseY: 390,
          w: 32,
          h: 38,
          kind: "jellyfish",
          phase: x / 100,
          active: true,
        });
  }
  if (n === 9)
    for (const x of [600, 1550, 2500, 3550, 4600]) sprinkler(x, x / 400);
  if (n === 10) {
    cut(4200, 5100);
    w.platforms.push({ x: 4200, y: 450, w: 900, h: 150, ground: true });
    const gate = {
      x: 4920,
      y: 200,
      w: 35,
      h: 250,
      ground: true,
      kind: "gate",
      inactive: false,
    };
    w.platforms.push(gate);
    w.switches.push({ x: 4290, y: 430, w: 65, h: 20, remaining: 0, gate });
  }
  if (n === 11) {
    bridge(1250, 2070, "moving");
    pool(2750, 3600, 30);
    tag(1680, 342);
    tag(3160, 460);
    tag(4590, 380);
    for (const x of [2370, 4070, 4640]) sprinkler(x, x / 400);
  }
  // Put safe checkpoint islands immediately before/after the central challenge.
  if (n > 0) {
    w.checkpoints = [
      { x: 1100, y: 425, w: 40, h: 25, active: false },
      { x: 3900, y: 425, w: 40, h: 25, active: false },
    ];
    for (const c of w.checkpoints) {
      if (
        !w.platforms.some(
          (r) =>
            r.ground && r.y === 450 && c.x >= r.x && c.x + c.w <= r.x + r.w,
        )
      )
        w.platforms.push({ x: c.x - 50, y: 450, w: 150, h: 150, ground: true });
    }
  }
  if (w.direction === -1) {
    for (const key of [
      "platforms",
      "biscuits",
      "enemies",
      "charms",
      "checkpoints",
      "water",
      "wind",
      "hazards",
      "tokens",
      "switches",
    ])
      for (const r of w[key]) {
        r.x = WIDTH - r.x - r.w;
        if (r.baseX !== undefined) r.baseX = WIDTH - r.baseX - r.w;
        if (r.min !== undefined) {
          const min = r.min;
          r.min = WIDTH - r.max - r.w;
          r.max = WIDTH - min - r.w;
          r.vx = -r.vx;
        }
        // Positive current deliberately opposes leftward swimmers.
      }
    w.spawn = { x: WIDTH - 143, y: 400 };
    w.goal.x = 100;
  }
  return w;
}
export function updateWorld(w, p, dt) {
  w.clock += dt;
  for (const r of w.platforms) {
    const oldX = r.x,
      oldY = r.y;
    if (r.kind === "moving") {
      const offset = Math.sin(w.clock * r.speed + r.phase) * r.range;
      r.x = r.baseX + (r.axis === "x" ? offset : 0);
      r.y = r.baseY + (r.axis === "y" ? offset : 0);
    }
    if (r.kind === "crumble") {
      if (r.cooldown > 0) {
        r.cooldown -= dt;
        r.inactive = r.cooldown > 0;
        if (!r.inactive) r.crack = 0;
      } else if (p.support === r || r.crack > 0) {
        r.crack = (r.crack || 0) + dt;
        if (r.crack > 0.7) {
          r.inactive = true;
          r.cooldown = 3;
        }
      }
    }
    if (p.support === r && p.grounded && !r.inactive) {
      p.x += r.x - oldX;
      p.y += r.y - oldY;
    }
  }
  for (const h of w.hazards) {
    if (h.kind === "sprinkler") {
      const phase = (w.clock + h.phase) % 3.6;
      h.active = phase > 1.8;
      h.warning = phase > 1.3 && !h.active;
    } else h.y = h.baseY + Math.sin(w.clock * 1.6 + h.phase) * 45;
  }
  for (const s of w.switches) {
    s.remaining = Math.max(0, s.remaining - dt);
    if (overlap(p, s)) s.remaining = 8;
    // A closing gate never traps Remy inside its collision box.
    s.gate.inactive = s.remaining > 0 || overlap(p, s.gate);
  }
}
export function goalReached(w, p) {
  return overlap(p, w.goal) && w.tokens.every((t) => t.taken);
}
