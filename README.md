# Clade Pets

A browser Tamagotchi-style virtual pet. An egg hatches, grows through baby, child, teen and adult stages (each adult has its own art), and needs feeding, play, cleaning, medicine, sleep and discipline. Neglect it and it dies. It is vanilla JavaScript (ES modules) with no framework and no build step.

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
| 🎮 Play | Choose a mini-game (see below). Win two of three rounds to raise happiness. |
| 💉 Medicine | Treat a sick pet. It needs two doses. |
| 🚽 Clean | Clean up poop. |
| 📊 Status | Show hearts for hunger (F), happiness (H) and discipline (D). |
| 📣 Discipline | Scold a pet that is misbehaving. |

Every action shows a short message under the screen (for example "Yum!", "Not hungry", "Nothing to clean", "Still an egg…"), so you can tell when a button did nothing and why. While it is still an egg, nothing can be done except wait for it to hatch.

### Mini-games

Press **B** on the Play icon, then **A** to switch between the two games and **B** to start. **C** goes back.

- **Left or Right:** each round, pick a side with **A** and press **B**; you win the round if you picked the direction the game chose.
- **Higher or Lower:** a number from 1 to 9 is shown. Pick Higher or Lower with **A** and press **B**; you win the round if the next number goes that way. A tie loses. The new number is the one to beat next round.

Both games have three rounds; win two or more to make the pet happier. An egg, a sleeping pet or a sick pet will not play.

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

Each episode counts once. Which of four characters your pet becomes is decided when it reaches the teen stage and again as an adult, from its care mistakes **per day of life** (total mistakes divided by its age in days, counting any age under one day as one day) and its discipline:

| Character | Needs |
| --- | --- |
| Sparky | at most 1 care mistake per day and discipline of 3 or more |
| Bubbles | at most 4 care mistakes per day |
| Mochi | at most 10 care mistakes per day |
| Grumble | anything worse |

### Death

The pet dies if hunger is zero or it is sick for 12 game hours (720 minutes) in a row while awake, or of old age: an adult dies at 10 game days old. Press **B** to start over with a new egg. You can also press the **New egg** button under the controls at any time; it asks you to confirm first, because your current pet is lost.

### Sound

The game beeps when the pet calls, when you press a button and when you win or lose a mini-game. Sound starts only after your first click or key press, and the **Sound** button under the controls mutes it.

**Music:** an original soundtrack is synthesized in the browser (no audio files, nothing downloaded). While the pet is awake it plays a 64-bar, 2 minute 40 second loop (96 BPM) in six sections: a main theme in C major (A), a decorated repeat (A2), a contrasting second theme on new chords (B), the main theme again with a counter-melody (A3), a quiet bridge with no drums (C), and a final lift that moves the theme up a whole step to D major (D) before turning back into the start. Voices: a 25% pulse-wave lead, a triangle bass, a soft arpeggio, a counter-melody, light percussion (a noise hi-hat and a sine kick) and a subtle shared echo. While the pet sleeps it switches to a 2 minute lullaby (32 bars at 60 BPM): slow triangle arpeggios over sustained bass notes with a gentle low melody and no drums. It is silent while the pet is an egg or dead. Like the effects, it starts only after your first click or key press, and it pauses while the tab is hidden. The **Music** button toggles it independently of **Sound**. (The **New egg** button sits beside them; it does not affect either.) Both choices are saved in your browser (`virtual-pet-prefs` in localStorage); the default is both on.

To tweak the sound, edit the named constants: `TEMPO_AWAKE` and `TEMPO_SLEEP` in `src/ui/music-score.js` (BPM; the loop length follows), and `MUSIC_GAIN`, `ECHO_MIX`, `ECHO_SECONDS`, `ECHO_FEEDBACK` in `src/ui/music.js` (master level and echo). Per-voice gains are in `GAINS` in the score, and the chords and motifs are plain data there too.

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

### Balance notes

Besides survival and lifespan, `yarn simulate` prints, per bot, the mean care mistakes by cause (light, ignored call, zero hearts), the mean mistakes and age at the moment the pet becomes a teen and an adult, and the characters reached. The character thresholds are tuned against it. The target outcomes are: the attentive bot becomes Sparky (at least 95% of lives); the casual bot (three short daily check-ins, never touches the light, about 7 mistakes a day) mostly becomes Bubbles or Mochi (at least 70% combined, at most 25% Grumble); and the neglectful bot dies before it gets a character. `tests/simulate.test.js` checks these over a fixed range of seeds.

## Project layout

- `src/engine/`: pure game rules (no DOM, timers or clock). State, tick, actions, offline catch-up, the mini-games.
- `src/storage/`: saving and loading the pet in localStorage.
- `src/ui/`: canvas rendering, sprites and digits, button and menu logic, screen-reader descriptions, sound, music, saved preferences.
- `scripts/`: dev tools (the balance simulation).
- `tests/`: unit tests.
- `e2e/`: Playwright browser tests.
- `docs/superpowers/`: design specs and implementation plans.

## Deployment

The game is plain static files. `.github/workflows/pages.yml` publishes it to GitHub Pages on every push to `main`.
