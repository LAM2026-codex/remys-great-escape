# Remy’s Great Escape — World Tour

[Play free in your browser](https://LAM2026-codex.github.io/remys-great-escape/)

An original Canvas platformer starring a small white dog. Fifteen missions across **New Zealand → UK → France**, with five missions per country and a rising difficulty curve within each chapter. No accounts, backend or game libraries.

## Play locally

Run `npm start` (Python 3 required), then visit http://localhost:4173. Or use `python3 -m http.server 4173`. JavaScript modules require a server rather than opening the HTML file directly.

- Move: A/D or left/right arrows. Jump: Space, W or up; hold for height.
- Run: Shift. Pause: P, Escape or the pause button.
- Swim up: hold Jump. Dive: S/down or the touch Dive button.
- Phone: hold movement and Jump together. Tap RUN to toggle sprinting. Play expands automatically; ⛶ restores the page.
- Sound is optional; toggle it after interacting with the game.

Mobile controls are at least 64 pixels in both dimensions, with larger direction and Jump controls. Portrait uses two rows; landscape spreads the controls across the screen. CSS touch-callout/selection suppression and cancelled context-menu, selection, drag and touch-default events prevent long-press menus on the game surface. Physical phone feedback is still useful because browser behaviour varies.

## Missions

Each country builds from an introduction to a combined finale. The HUD and mission introduction show the country and local mission number. Later missions add objectives, hazards and combinations; enemy speeds rise and crumble delays shorten with chapter difficulty.

| Country | Mission | Challenge |
|---|---|---|
| New Zealand | 1. Harbour Hello — Auckland | Gentle run/jump introduction with one enemy |
| New Zealand | 2. Lake Log Leap — Rotorua | Moving platform crossing |
| New Zealand | 3. Rainforest Crossing — West Coast | Crumbling bridge |
| New Zealand | 4. Golden Bay Paddle — Abel Tasman | Swimming and underwater tags |
| New Zealand | 5. Fiordland Adventure | Moving platforms, swimming, water jets and three tags |
| UK | 1. Village Wander — Cotswolds | Gentle village route |
| UK | 2. Dales Spring Trail — Yorkshire | Spring-assisted high tag |
| UK | 3. Castle Lift — Northumberland | Ride a vertical lift to the balcony |
| UK | 4. Highland Gate Run | Leftward crumble crossing and an eight-second gate |
| UK | 5. Coastal Challenge — Cornwall | Moving platforms, swimming, jellyfish and water jets |
| France | 1. Village Tag Hunt — Provence | Leftward tag hunt |
| France | 2. Market Sprinkler Dash | Tag hunt plus pulsing sprinklers |
| France | 3. Mistral Leap — Calanques | Spring climb with wind gusts |
| France | 4. Harbour Current — Cassis | Leftward swimming against current and jellyfish |
| France | 5. Home Before Dinner — Provence | Combined finale with three tags and extra hazards |

Biscuits are optional; golden tags are required where shown. Biscuit placement is derived from final terrain and stays safely before the exit, including leftward missions. Blue platforms move, cracked boards crumble and return, and green pads spring. Three hearts protect Remy; water bowls refill them and save a checkpoint. Falls retain collected tags and biscuits. Game over restarts the current mission. A lavender charm protects Remy, increases running speed and attracts biscuits for ten seconds; falls still cost a heart.

Unlocks and best biscuit counts save on the current device. The older 12-stage campaign’s unlock progress is proportionally migrated; old scores are not assigned to different missions. No cloud save or mid-mission reload recovery.

## Checks and deployment

- `npm test`: full input-driven mission routes, physics, mechanics, every biscuit pickup, chapter progression and save migration.
- `npm run check`: JavaScript syntax checks.
- `npm run build`: creates `_site/` with content-versioned CSS/JavaScript URLs to prevent stale artwork.
- Optional browser smoke test: install Python Playwright, run `python -m playwright install chromium`, start the server, then `python tests/browser_test.py`.

GitHub Actions runs the Node and Chromium mobile/browser checks, builds the site and deploys GitHub Pages. Set **Settings → Pages → GitHub Actions** when deploying a fork. Paths are relative and support repository subdirectories.

## Files and development

`src/world.js` defines the country campaign, terrain, collectibles, challenges and physics. `src/game.js` handles input, state flow, camera, original procedural art and synthesized audio. `style.css` and `index.html` provide the responsive page. `scripts/build.js` versions assets. Tests live in `tests/`.

For development only, `?test` exposes the inspection bridge; `?test&stage=3&x=2300` previews the NZ swimming mission. Stage indices are zero-based. Normal visits respect saved unlocks.

All in-game graphics and sounds are original procedural assets; no Mario/Nintendo assets are used. Interface fonts use Google Fonts with system fallbacks. Country scenes are stylized illustrations, not geographical reproductions. No gamepad support; gameplay requires vision and real-time input.
