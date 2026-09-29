# Challenge-campaign verification

- 16 Node tests pass, including a full input-driven traversal of all 12 redesigned stages with actual movement, collision, tag collection, health, and gate rules. Route tests use waypoints and normal keyboard input; they do not teleport Remy to complete the stages.
- Moving-platform carry, spring activation, crumbling/respawning boards, swim/dive/current physics, reverse exits, required tags, timed gate expiration and safe closing, sprinkler states, retries and checkpoint recovery have focused coverage.
- New moving-platform and swimming visuals inspected in the in-app browser. No browser console errors in these inspections.
- The optional Python browser smoke test checks keyboard/touch controls, stage rendering, transitions, saved unlocks and swimming. Its explicit state setup checks transitions, not route traversability; Node tests cover full routes.
- Physical-phone, Safari and Firefox playthroughs remain unverified.

- Each biscuit has a simulated pickup from a supporting surface/water route and is checked to be safely before the exit.
- Browser checks now include two-finger sprint/jump, run toggle, released-input stopping, minimum 44-pixel touch targets, portrait/landscape fit, swim/dive touch control and restoring the page.
