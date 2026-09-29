# Remy’s Great Escape

[Play free in your browser](https://LAM2026-codex.github.io/remys-great-escape/)

A small **white dog**, a sunny afternoon, and the long way home. An original, 12-level browser platformer set in a storybook Provence, built with Canvas, CSS and vanilla JavaScript. No game libraries, accounts, or backend. Local play needs no build; GitHub Pages uses a small build step to version file URLs and prevent stale cached artwork.

## Play locally

From this directory, run `npm start` (requires Python 3), then open http://localhost:4173. Alternatively run `python3 -m http.server 4173`. Use a local server rather than opening the HTML file directly because the game uses JavaScript modules. Node is only required for the optional checks.

- **Move:** A/D or left/right arrows.
- **Jump:** Space, W or up arrow. Hold for height; release for a short hop.
- **Run:** hold Shift.
- **Pause/resume:** P, Escape or the pause button. Leaving the tab automatically pauses.
- **Touch:** hold direction and Jump together. Tap RUN to toggle sprinting; tap again to turn it off. Dive uses the down button. Play automatically expands on phones; use the ⛶ button to restore the page. Portrait and landscape both work; landscape gives a wider view.
- **Sound:** opt in with the sound button. All sound effects are synthesized locally after interaction.

Follow the biscuit trails to Remy’s house at the far right. Biscuits are optional. Golden tags are required on the stages that introduce them. Jump on cats, chickens, or wasps to bounce them out of the way, or avoid them. Three hearts protect you from mistakes. Falls cost one heart and return you to the latest checkpoint. Blue water bowls save a checkpoint and refill health once per attempt. Lavender charms grant ten seconds of protection, faster running and a biscuit magnet. Falling still costs a heart. Game over restarts the current stage; checkpoints are retained only during that attempt. The finish screen reports biscuits and time and continues to the next stage. Completed-stage unlocks and best biscuit counts persist after reload; mid-level positions do not.

## GitHub Pages

1. Create an empty GitHub repository, for example `remys-great-escape`.
2. Push this entire project to its `main` branch (or upload the files via GitHub).
3. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. Run the included **Deploy game to GitHub Pages** workflow from Actions, or push a new commit. The workflow checks the code, runs physics tests, and publishes only the game files.
5. Your game will be available at `https://LAM2026-codex.github.io/remys-great-escape/`.

All game paths are relative, so a repository subdirectory works. You may also select “Deploy from a branch”, `main`, `/ (root)` for an Actions-free deployment.

## Development

`npm test` runs the dependency-free Node physics/level checks. `npm run check` checks JavaScript syntax. The simulation uses a fixed 120 Hz step and caps catch-up time after stalls. Art scales to device pixel ratio (capped at 2); portrait displays a narrower camera view without stretching.

- `index.html`: accessible page, overlays, controls and HUD.
- `style.css`: responsive visual design and touch layout.
- `src/world.js`: level data, collision rules and movement physics.
- `src/game.js`: state flow, input, camera, original procedural artwork and audio.
- `tests/world.test.js`: movement, jump buffering, gap clearance and state isolation.

For browser automation only, `?test` exposes `window.__remy` with state, player and world inspection. Normal play does not expose this bridge.

## Art & scope

All in-game dog, landscape, enemy and collectible graphics are original vector shapes drawn in Canvas; all sounds are original oscillator effects. No Nintendo/Mario assets, characters, music or level layouts are included. Interface fonts load from Google Fonts (DM Sans and Fraunces); system fonts provide an offline fallback. Gameplay itself needs no external services or assets.

The campaign contains twelve distinct 5,400-unit stages, three enemy types, two water checkpoints and two power-ups per stage, and a homecoming ending. Completed stages unlock the next one. Use “The journey” below the game to replay unlocked stages. Unlocks and best biscuit totals are saved in local storage on the current device. There is no gamepad support or cloud save. Touch controls and HUD have accessible names; the action gameplay itself requires vision and real-time input.

## Browser smoke test

Optional: install Python Playwright (`python3 -m pip install playwright` and `python3 -m playwright install chromium`), start the local server on port 4173, then run `python3 tests/browser_test.py`. This exercises keyboard input, jump, pause/resume, checkpoints, fall recovery, charms, win/retry/game-over, a complete traversal using actual keyboard events, and touch input at 390 px width. Screenshots go to the ignored `test-results/` folder.

## The twelve stages

1. The Garden Gate
2. Lavender Lanes
3. The Olive Grove
4. Vineyard Hop
5. Market Day
6. The Old Aqueduct
7. Salt & Sea
8. Harbour Hounds
9. Calanque Climb
10. Pinecone Path
11. Golden Hour
12. Home Before Dinner

`tests/campaign.test.js` executes all twelve complete routes against the game logic, checks progression/retry/checkpoints/power-ups, and exercises drawing with a mock canvas. This complements visual browser checks; it is not a browser rendering test.

## Challenge campaign

Every stage now has its own introduction. “Next adventure” opens those instructions before the next stage begins. Existing saved unlocks remain available.

| Stage | Main challenge |
| --- | --- |
| 1 — The Garden Gate | Run, jump and bounce: the introductory route |
| 2 — Lavender Lanes | Moving platforms across a wide ditch |
| 3 — The Olive Grove | Crumbling boards: 0.7 seconds before falling, 3 seconds to return |
| 4 — Vineyard Hop | Spring launch to a required high golden tag |
| 5 — Market Day | Right-to-left travel and two tag pickups |
| 6 — The Old Aqueduct | Vertical lift to a high tag balcony |
| 7 — Salt & Sea | Swimming and two underwater tags |
| 8 — Harbour Hounds | Leftward swimming against a current, with jellyfish |
| 9 — Calanque Climb | Wind gusts and a spring-assisted climb |
| 10 — Pinecone Path | Pulsing sprinklers with warning and safe intervals |
| 11 — Golden Hour | Leftward switch-and-gate race; 8 seconds to pass |
| 12 — Home Before Dinner | Moving platforms, swimming, sprinklers and three required tags |

In water, hold **Space / W / up / touch Jump** to paddle upwards. Release to sink gently; use **S / down / touch Dive** to dive faster. There is no drowning timer. Checkpoint recovery retains collected tags. Blue platforms move, cracked brown boards crumble, and green pads spring. Water currents have arrow marks; sprinklers show an orange warning before the pink spray becomes harmful. The HUD indicates travel direction and required tags. The gate stays open if closing would trap Remy inside it.

`npm run build` creates `_site/` with content-versioned CSS and JavaScript URLs. For scene inspection only, `?test&stage=6&x=2300` starts a water-level preview; stage indices are zero-based. These test URLs do not unlock the campaign by themselves.

## Collectibles and mobile play

Biscuit positions are rebuilt from the final terrain, after level cuts and leftward mirroring. They sit on supported ground, reachable low ledges, bridge boards, or swimming routes. Every biscuit stays before the automatic exit trigger, with room for Remy’s collision box. Placement avoids spring pads, gate columns, and hazard centres. The biscuit counter uses this rebuilt set; totals differ from earlier releases.

The reachability test checks every biscuit in all twelve stages by simulating a pickup from its route surface or water segment. Full-level route tests separately verify traversal. These are not exhaustive human 100% collection playthroughs.

Phones use an expanded in-page play view with safe-area padding, large touch buttons and simultaneous movement/jump support. RUN is a touch toggle, so sprint-jumping needs only two fingers. Pause and stage changes clear held controls. Landscape crops some sky to keep Remy readable. The browser suite checks actual multi-touch events in mobile Chromium emulation, portrait and landscape geometry, swimming/diving and restoring the page; physical iOS/Android testing remains outstanding.
