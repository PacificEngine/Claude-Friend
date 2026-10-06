# Clade Pets

A browser Tamagotchi-style virtual pet. An egg hatches, grows through baby, child, teen and adult stages, and needs feeding, play, cleaning, medicine, sleep and discipline. Neglect it and it dies. It is vanilla JavaScript (ES modules) with no framework and no build step.

**Play it:** https://pacificengine.github.io/Claude-Friend/

## How to play

Use the three buttons under the screen, or the **A**, **B** and **C** keys on your keyboard:

- **A** cycles the menu selection (the highlighted icon above the screen). Inside a choice, A toggles between options.
- **B** selects: it runs the highlighted icon, confirms a choice, or dismisses a result.
- **C** cancels and returns to the main screen.

You can also click, tap or Tab to a menu icon and press Enter or Space. That only moves the selection; press B to run it.

### Menu icons

| Icon | Action |
| --- | --- |
| 🍙 Feed | Choose a meal or a snack. |
| 💡 Light | Turn the light on or off (only matters at night). |
| 🎮 Play | Left-or-right guessing mini-game: three rounds, win two or more to raise happiness. |
| 💉 Medicine | Treat a sick pet. It needs two doses. |
| 🚽 Clean | Clean up poop. |
| 📊 Status | Show hearts for hunger (F), happiness (H) and discipline (D). |
| 📣 Discipline | Scold a pet that is misbehaving. |

### Calls and warnings

- A blinking **!** means the pet wants attention. Ignoring calls counts as a care mistake.
- A **cross** means it is sick.
- An **empty heart** on the left means it is starving (hunger is zero).
- Each **poop** pile adds to the chance of illness; clean them up.

### Night

Game time runs on a 24-hour clock. The pet sleeps from 22:00 to 07:00. Turn the light off at bedtime (you get until 22:30) so it sleeps well; leaving it on counts as a care mistake. A sleeping pet cannot be fed or played with.

### Death

Sustained neglect or old age ends the pet's life. Press **B** to start over with a new egg.

## How time works

The game runs in real time by default: one game minute passes per real minute, so a game day is a real day. The egg hatches after about 5 minutes, a baby loses a heart roughly every 30 minutes, and the pet grows to a child after 6 hours, a teen after 1 day and an adult after 3 days. Add `?speed=N` to the URL to multiply the rate: `?speed=60` is a fast mode (one game minute per real second), `?speed=600` is very fast.

Progress is saved in your browser (localStorage) and catches up while the tab is closed or hidden, capped at 3 real days (at the default speed) so a long absence is not instantly fatal.

## Run locally

```sh
yarn install
yarn start
```

Then open http://localhost:4173.

## Tests

```sh
yarn test        # unit tests (vitest)
yarn test:e2e    # browser test (Playwright); starts the server itself
```

The first time, install the browser Playwright uses: `yarn playwright install chromium`.

## Project layout

- `src/engine/`: pure game rules (no DOM, timers or clock). State, tick, actions, offline catch-up, the mini-game.
- `src/storage/`: saving and loading the pet in localStorage.
- `src/ui/`: canvas rendering, sprites, button and menu logic, sound.
- `tests/`: unit tests.
- `e2e/`: Playwright browser test.
- `docs/superpowers/`: design specs and implementation plans.

## Deployment

The game is plain static files. `.github/workflows/pages.yml` publishes it to GitHub Pages on every push to `main`.
