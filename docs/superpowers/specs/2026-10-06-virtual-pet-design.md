# Virtual Pet (Tamagotchi-style) — Design

## Goal
A browser game that recreates the 90s handheld virtual pet: an egg hatches, grows through life stages, needs feeding, play, cleaning, medicine, sleep and discipline, and can die from neglect. Vanilla JS, no framework, no build step beyond the test runner.

## Architecture
Three layers with one-way dependencies: `ui -> engine`, `storage -> engine`. The engine depends on nothing.

### Engine (`src/engine/`) — pure logic, no DOM, no timers, no `Date.now()`
- `createPet()` returns the initial state (an egg).
- `tick(state, rng)` advances one game minute and returns a new state. Never mutates.
- `act(state, action)` applies a player action: `feed-meal`, `feed-snack`, `play`, `clean`, `medicine`, `discipline`, `toggle-light`.
- `advance(state, minutes, rng)` calls `tick` repeatedly (used for offline catch-up).
- `rng` is an injected function returning a float in [0,1). A seeded implementation (`mulberry32`) is used in tests and the game, so behavior is repeatable.

**State:** `stage` (egg | baby | child | teen | adult | dead), `character` (id once teen/adult), `ageMinutes`, `hunger` (0–4 hearts), `happiness` (0–4), `discipline` (0–4), `weight`, `poop` (count), `sick`, `asleep`, `lightOn`, `careMistakes`, `needsAttention`, `neglectMinutes`.

**Rules (initial tuning, constants in one file so they are easy to adjust):**
- Hunger and happiness each lose one heart on a fixed interval per stage.
- Poop appears on an interval; each uncleaned poop raises the sickness chance per tick.
- Sick pets need `medicine` (two doses); untreated illness counts toward neglect.
- A care mistake is recorded when hunger or happiness sits at zero past a grace period, or a call is ignored.
- Sleeping pets recover while the light is off; leaving the light on during sleep is a care mistake.
- Stage transitions by age thresholds; teen and adult characters are chosen from `careMistakes` and `discipline` across 4 characters (best care → worst care).
- Death occurs after sustained neglect (hunger zero and/or sickness untreated) or old age.

### Mini-game (`src/engine/guess.js`)
"Left or right": the player guesses a direction. `playGuess(choice, rng)` returns `{ won, direction }`. Three rounds; two or more wins raises happiness. Pure and tested.

### Storage (`src/storage/`)
`save(state, nowMs)` and `load(nowMs)` over localStorage. On load, elapsed real minutes since the last save are replayed through `advance`, capped (for example 3 days) so a long absence results in a fair outcome. Corrupt or missing data starts a fresh egg.

### UI (`src/ui/`, `index.html`, `styles.css`)
- Plastic egg-shaped shell in CSS with a 32×16 LCD `<canvas>` scaled by integer factors, and three buttons A/B/C.
- `sprites.js`: 1-bit bitmaps as string arrays for each stage/character/animation frame, plus the attention icon. Teen and adult share one sprite per character. The icon row (feed, light, play, medicine, clean, status, discipline) is HTML in the shell, not canvas.
- `render.js`: draws a state to the canvas (no logic).
- `controller.js`: maps buttons to menu navigation and engine actions. A cycles the icon, B selects, C cancels. Runs a 1-second interval that ticks the engine on a game-minute schedule and saves. A `?speed=N` debug query param multiplies game speed (N game minutes per tick) for manual testing.
- `sound.js`: Web Audio synthesized beeps (attention call, button, win/lose). Muted until the first user interaction, and has a mute toggle.

## Testing
- Vitest unit tests (run with `yarn test`) for engine rules, character selection, mini-game, storage replay and corruption handling. Written test-first, one red-green-refactor cycle per behavior.
- Playwright smoke test: load page, hatch egg, feed pet, reload and confirm state persisted.
- Security: run Snyk code scan on first-party code before finishing.

## Out of scope (YAGNI)
Multiplayer or "connection" features, accounts, backend, multiple save slots, additional mini-games beyond the guess game.

## Workflow
Branch `feature/virtual-pet`, a commit per red-green-refactor cycle, squashed into a single meaningful commit before finishing. Package manager: `yarn`.
