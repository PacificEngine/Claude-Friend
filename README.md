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

Every action shows a short message under the screen (for example "Yum!", "Not hungry", "Nothing to clean", "Still an egg…"), so you can tell when a button did nothing and why. While it is still an egg, nothing can be done except wait for it to hatch.

### Calls and warnings

- A blinking **!** means the pet wants attention: it is sick, misbehaving, has two or more poop piles, is at zero hunger or happiness, or (at night) the light is still on.
- A **cross** means it is sick, and the pet shivers. Medicine takes two doses, and a sick pet will not play.
- An **empty heart** on the left means it is starving (hunger is zero).
- Each **poop** pile adds to the chance of illness; clean them up.
- Discipline only works while the pet is misbehaving; scolding a well-behaved pet does nothing.

### Night

Game time runs on a 24-hour clock, starting at 08:00 when the egg is new. The pet sleeps from 22:00 to 07:00. Turn the light off at bedtime (you get until 22:30) so it sleeps well. A sleeping pet cannot be fed, played with or cleaned up after, and while it sleeps in the dark its hearts, poop and neglect all pause.

### Care mistakes and characters

A **care mistake** is recorded when:

- hunger or happiness stays at zero for 60 game minutes,
- a sickness, two or more poop piles, or misbehaving goes unattended for 60 game minutes, or
- the light is still on at 22:30.

Each episode counts once. Care mistakes and discipline decide which of four characters your pet becomes when it reaches the teen stage and again as an adult:

| Character | Needs |
| --- | --- |
| Sparky | at most 1 care mistake and discipline of 3 or more |
| Bubbles | at most 3 care mistakes |
| Mochi | at most 6 care mistakes |
| Grumble | anything worse |

### Death

The pet dies if hunger is zero or it is sick for 12 game hours (720 minutes) in a row while awake, or of old age: an adult dies at 10 game days old. Press **B** to start over with a new egg.

### Sound

The game beeps when the pet calls, when you press a button and when you win or lose the mini-game. Sound starts only after your first click or key press, and the **Sound** button under the controls mutes it.

## How time works

The game runs in real time by default: one game minute passes per real minute, so a game day is a real day. The egg hatches after about 5 minutes, a baby loses a heart roughly every 30 minutes, and the pet grows to a child after 6 hours, a teen after 1 day and an adult after 3 days. Add `?speed=N` to the URL to multiply the rate: `?speed=60` is a fast mode (one game minute per real second), `?speed=600` is very fast.

Progress is saved in your browser (localStorage) every game minute, whenever you press a button, and when the tab is hidden or closed. When you come back, the game replays the time you were away, up to 3 game days, so a long absence is not instantly fatal. While you are away:

- hunger, happiness, poop, sickness, neglect, care mistakes and growth all keep going, and the pet can die if left starving or sick for 12 awake hours;
- the light is assumed to have been turned off at night, so being away overnight never costs a light care mistake, and neglect pauses while the pet sleeps in the dark.

Saves are per browser: a different browser, device or private window starts a new egg.

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

The first time, install the browser Playwright uses: `yarn playwright install chromium`. This project has no CI, so run both commands locally before opening a pull request.

## Balance simulation

`yarn simulate` is a dev tool, not part of the game. It plays three bot caretakers (attentive, casual, neglectful) through the pure engine for 200 seeded lives each and prints a table: how many reach teen and adult, how they die, lifespan, care mistakes and which characters appear. Use `yarn simulate --runs=N` to change the number of lives per bot. It never changes game numbers; edit `src/engine/constants.js` and re-run it to see the effect of a tweak.

## Project layout

- `src/engine/`: pure game rules (no DOM, timers or clock). State, tick, actions, offline catch-up, the mini-game.
- `src/storage/`: saving and loading the pet in localStorage.
- `src/ui/`: canvas rendering, sprites, button and menu logic, sound.
- `scripts/`: dev tools (the balance simulation).
- `tests/`: unit tests.
- `e2e/`: Playwright browser test.
- `docs/superpowers/`: design specs and implementation plans.

## Deployment

The game is plain static files. `.github/workflows/pages.yml` publishes it to GitHub Pages on every push to `main`.
