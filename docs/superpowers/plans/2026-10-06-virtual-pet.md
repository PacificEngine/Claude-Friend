# Virtual Pet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser Tamagotchi-style virtual pet: egg, growth stages, care actions, sleep, sickness, death, 4 character lines, a mini-game, sound, and persistence that keeps ticking while the tab is closed.

**Architecture:** A pure-logic engine (`src/engine`, no DOM, no timers, no `Date.now()`, injected RNG) is driven by a thin UI layer (`src/ui`) and a storage layer (`src/storage`). Dependencies are one-way: `ui -> engine`, `storage -> engine`. The UI controller is itself a pure state machine so it is unit-testable; only canvas drawing and the DOM wiring are covered by the Playwright smoke test.

**Tech Stack:** Vanilla JS (ES modules), HTML/CSS, `<canvas>`, Web Audio, Vitest (unit), Playwright (smoke), `serve` (static server), `yarn`.

**Spec:** `docs/superpowers/specs/2026-10-06-virtual-pet-design.md`

## Global Constraints

- Package manager is `yarn` only. Never npm, pnpm or bun.
- Vanilla JS ES modules. No framework and no bundler.
- The engine never touches the DOM, timers or `Date.now()`. Randomness comes only from an injected `rng()` returning a float in [0,1).
- State updates are immutable: `tick` and `act` return new objects.
- Game time is in minutes: one engine `tick` is one game minute. A real game minute is 60000 ms. A `?speed=N` URL param divides that, for debugging and e2e only.
- Hearts range 0–4 (`MAX_HEARTS`). Four characters: `sparky`, `bubbles`, `mochi`, `grumble`.
- LCD is a 32×32 pixel canvas scaled by CSS. 1-bit sprites are arrays of `#`/`.` strings.
- TDD: write the failing test, watch it fail, then implement. Commit after each green cycle, with messages that explain *why*. No Claude signature or co-author lines on commits.
- Work stays on branch `feature/virtual-pet`. Never commit to `main`.
- Spec deviations adopted by this plan (Task 1 amends the spec): `createPet()` and `act(state, action)` take no `rng`. The icon row is HTML in the shell rather than canvas sprites. Teen and adult share one sprite per character. A `?speed=N` debug param exists.

## File Structure

```
package.json, vitest.config.js, playwright.config.js, .gitignore
index.html, styles.css
src/main.js                  # wiring: loop, buttons, save, sound
src/engine/constants.js      # all tuning numbers
src/engine/rng.js            # mulberry32
src/engine/pet.js            # createPet, clamp, stageForAge, isNight, withAttention
src/engine/characters.js     # chooseCharacter
src/engine/tick.js           # tick
src/engine/act.js            # act
src/engine/advance.js        # advance (offline catch-up)
src/engine/guess.js          # mini-game
src/storage/storage.js       # save, load
src/ui/sprites.js            # bitmaps
src/ui/render.js             # canvas drawing
src/ui/controller.js         # menu/screens state machine
src/ui/sound.js              # Web Audio beeps
tests/helpers.js, tests/*.test.js
e2e/smoke.spec.js
```

---

### Task 1: Scaffold, tooling and seeded RNG

**Files:**
- Create: `package.json`, `.gitignore`, `vitest.config.js`, `src/engine/rng.js`, `tests/rng.test.js`
- Modify: `docs/superpowers/specs/2026-10-06-virtual-pet-design.md`

**Interfaces:**
- Produces: `mulberry32(seed: number): () => number` in `src/engine/rng.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "clade-pets",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "serve -l 4173 .",
    "test": "vitest run",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules
test-results
playwright-report
.worktrees
.DS_Store
```

- [ ] **Step 3: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['tests/**/*.test.js'] } });
```

- [ ] **Step 4: Install dependencies**

Run: `yarn --version`. If it prints 2.x or higher, also create `.yarnrc.yml` containing `nodeLinker: node-modules` so tools resolve normally.
Run: `yarn add -D vitest serve @playwright/test`
Expected: installs without errors; `yarn.lock` created.

- [ ] **Step 5: Write the failing test `tests/rng.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/engine/rng.js';

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('produces different sequences for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('returns floats in [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const n = rng();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 6: Run it, expect FAIL**

Run: `yarn test`
Expected: FAIL, cannot resolve `../src/engine/rng.js`.

- [ ] **Step 7: Implement `src/engine/rng.js`**

```js
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Step 8: Run, expect PASS**

Run: `yarn test`
Expected: 3 passed.

- [ ] **Step 9: Amend the spec for the deviations listed in Global Constraints**

In the spec, change `createPet(rng)` to `createPet()`, change `act(state, action, rng)` to `act(state, action)`, change the sprites bullet so the icon row is HTML in the shell, note that teen and adult share one sprite per character, and add a line about the `?speed=N` debug param.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "Scaffold yarn/vitest tooling and seeded RNG so game randomness is repeatable in tests"
```

---

### Task 2: Constants, `createPet`, attention flag

**Files:**
- Create: `src/engine/constants.js`, `src/engine/pet.js`, `tests/helpers.js`, `tests/pet.test.js`

**Interfaces:**
- Produces from `constants.js`: `STAGE_START` (`{egg:0, baby:5, child:360, teen:1440, adult:4320}`), `OLD_AGE` (14400), `HEART_INTERVAL` (`{baby:30, child:45, teen:60, adult:60}`), `HAPPY_OFFSET` (15), `POOP_INTERVAL` (90), `MAX_POOP` (4), `MAX_HEARTS` (4), `SICK_BASE` (0.0005), `SICK_PER_POOP` (0.002), `SICK_WHEN_STARVING` (0.01), `MISBEHAVE_CHANCE` (0.005), `CARE_MISTAKE_GRACE` (60), `DEATH_NEGLECT` (720), `START_CLOCK` (480), `BEDTIME` (1320), `WAKETIME` (420), `LIGHT_GRACE_CLOCK` (1350), `MINUTES_PER_DAY` (1440), `MAX_OFFLINE_MINUTES` (4320), `MEDICINE_DOSES` (2)
- Produces from `pet.js`: `createPet()`, `clamp(n)`, `stageForAge(age)`, `isNight(clock)`, `withAttention(state)`
- Produces from `tests/helpers.js`: `never` (`() => 0.999`), `always` (`() => 0`), `petAt(stage, overrides)`, `ticks(state, n, rng = never)`

- [ ] **Step 1: Create `src/engine/constants.js`**

```js
export const STAGE_START = { egg: 0, baby: 5, child: 360, teen: 1440, adult: 4320 };
export const OLD_AGE = 14400;
export const HEART_INTERVAL = { baby: 30, child: 45, teen: 60, adult: 60 };
export const HAPPY_OFFSET = 15;
export const POOP_INTERVAL = 90;
export const MAX_POOP = 4;
export const MAX_HEARTS = 4;
export const SICK_BASE = 0.0005;
export const SICK_PER_POOP = 0.002;
export const SICK_WHEN_STARVING = 0.01;
export const MISBEHAVE_CHANCE = 0.005;
export const CARE_MISTAKE_GRACE = 60;
export const DEATH_NEGLECT = 720;
export const START_CLOCK = 480;
export const BEDTIME = 1320;
export const WAKETIME = 420;
export const LIGHT_GRACE_CLOCK = 1350;
export const MINUTES_PER_DAY = 1440;
export const MAX_OFFLINE_MINUTES = 4320;
export const MEDICINE_DOSES = 2;
```

- [ ] **Step 2: Write the failing test `tests/pet.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createPet, stageForAge, isNight, withAttention, clamp } from '../src/engine/pet.js';

describe('createPet', () => {
  it('starts as a healthy, fed egg in the morning', () => {
    const pet = createPet();
    expect(pet).toMatchObject({
      stage: 'egg', character: null, ageMinutes: 0, hunger: 4, happiness: 4,
      discipline: 0, poop: 0, sick: false, asleep: false, lightOn: true,
      careMistakes: 0, needsAttention: false,
    });
  });
});

describe('stageForAge', () => {
  it('maps age thresholds to stages', () => {
    expect(stageForAge(0)).toBe('egg');
    expect(stageForAge(4)).toBe('egg');
    expect(stageForAge(5)).toBe('baby');
    expect(stageForAge(360)).toBe('child');
    expect(stageForAge(1440)).toBe('teen');
    expect(stageForAge(4320)).toBe('adult');
  });
});

describe('isNight', () => {
  it('is night from 22:00 until 07:00', () => {
    expect(isNight(1319)).toBe(false);
    expect(isNight(1320)).toBe(true);
    expect(isNight(0)).toBe(true);
    expect(isNight(419)).toBe(true);
    expect(isNight(420)).toBe(false);
  });
});

describe('clamp', () => {
  it('keeps hearts within 0..4', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(9)).toBe(4);
    expect(clamp(2)).toBe(2);
  });
});

describe('withAttention', () => {
  const base = { ...createPet(), stage: 'child' };
  it('flags hunger, unhappiness, sickness, poop and misbehaving', () => {
    expect(withAttention({ ...base, hunger: 0 }).needsAttention).toBe(true);
    expect(withAttention({ ...base, happiness: 0 }).needsAttention).toBe(true);
    expect(withAttention({ ...base, sick: true }).needsAttention).toBe(true);
    expect(withAttention({ ...base, poop: 2 }).needsAttention).toBe(true);
    expect(withAttention({ ...base, misbehaving: true }).needsAttention).toBe(true);
  });
  it('does not call when fine, asleep, an egg or dead', () => {
    expect(withAttention(base).needsAttention).toBe(false);
    expect(withAttention({ ...base, hunger: 0, asleep: true }).needsAttention).toBe(false);
    expect(withAttention({ ...base, stage: 'egg', hunger: 0 }).needsAttention).toBe(false);
    expect(withAttention({ ...base, stage: 'dead', hunger: 0 }).needsAttention).toBe(false);
  });
});
```

- [ ] **Step 3: Run, expect FAIL**

Run: `yarn test tests/pet.test.js`
Expected: FAIL, cannot resolve `../src/engine/pet.js`.

- [ ] **Step 4: Implement `src/engine/pet.js`**

```js
import { STAGE_START, MAX_HEARTS, START_CLOCK, BEDTIME, WAKETIME } from './constants.js';

export const clamp = (n) => Math.max(0, Math.min(MAX_HEARTS, n));

export function stageForAge(age) {
  if (age >= STAGE_START.adult) return 'adult';
  if (age >= STAGE_START.teen) return 'teen';
  if (age >= STAGE_START.child) return 'child';
  if (age >= STAGE_START.baby) return 'baby';
  return 'egg';
}

export function isNight(clock) {
  return clock >= BEDTIME || clock < WAKETIME;
}

export function withAttention(state) {
  const alive = state.stage !== 'dead' && state.stage !== 'egg';
  const needsAttention =
    alive && !state.asleep &&
    (state.hunger === 0 || state.happiness === 0 || state.sick ||
      state.poop >= 2 || state.misbehaving);
  return { ...state, needsAttention };
}

export function createPet() {
  return withAttention({
    stage: 'egg', character: null, ageMinutes: 0, clock: START_CLOCK,
    hunger: 4, happiness: 4, discipline: 0, weight: 5, poop: 0,
    sick: false, doses: 0, asleep: false, lightOn: true, misbehaving: false,
    careMistakes: 0, lowMinutes: 0, neglectMinutes: 0, needsAttention: false,
  });
}
```

- [ ] **Step 5: Create `tests/helpers.js`** (shared by later tasks)

```js
import { createPet } from '../src/engine/pet.js';
import { STAGE_START } from '../src/engine/constants.js';
import { tick } from '../src/engine/tick.js';

export const never = () => 0.999; // no random event ever fires
export const always = () => 0;    // every random event fires

export function petAt(stage, overrides = {}) {
  return { ...createPet(), stage, ageMinutes: STAGE_START[stage] ?? 0, ...overrides };
}

export function ticks(state, n, rng = never) {
  let s = state;
  for (let i = 0; i < n; i++) s = tick(s, rng);
  return s;
}
```

- [ ] **Step 6: Run, expect PASS**

Run: `yarn test tests/pet.test.js`
Expected: all pass. (`helpers.js` imports `tick.js`, which does not exist yet, but this test file does not import helpers, so it is fine.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Add pet state model and attention flag so every rule builds on one shape"
```

---

### Task 3: Ageing, hatching and character lines

**Files:**
- Create: `src/engine/characters.js`, `src/engine/tick.js`, `tests/characters.test.js`, `tests/tick-growth.test.js`

**Interfaces:**
- Consumes: `createPet`, `stageForAge`, `withAttention` from `pet.js`; helpers from Task 2
- Produces: `chooseCharacter({careMistakes, discipline}): 'sparky'|'bubbles'|'mochi'|'grumble'`; `tick(state, rng): state` (this task adds growth only)

- [ ] **Step 1: Write failing tests `tests/characters.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { chooseCharacter } from '../src/engine/characters.js';

describe('chooseCharacter', () => {
  it('rewards disciplined, attentive care with sparky', () => {
    expect(chooseCharacter({ careMistakes: 0, discipline: 3 })).toBe('sparky');
  });
  it('gives bubbles for decent care without discipline', () => {
    expect(chooseCharacter({ careMistakes: 0, discipline: 0 })).toBe('bubbles');
    expect(chooseCharacter({ careMistakes: 3, discipline: 4 })).toBe('bubbles');
  });
  it('gives mochi for mediocre care', () => {
    expect(chooseCharacter({ careMistakes: 5, discipline: 4 })).toBe('mochi');
  });
  it('gives grumble for poor care', () => {
    expect(chooseCharacter({ careMistakes: 7, discipline: 4 })).toBe('grumble');
  });
});
```

- [ ] **Step 2: Run, expect FAIL (missing module)**, then implement `src/engine/characters.js`

```js
export function chooseCharacter({ careMistakes, discipline }) {
  if (careMistakes <= 1 && discipline >= 3) return 'sparky';
  if (careMistakes <= 3) return 'bubbles';
  if (careMistakes <= 6) return 'mochi';
  return 'grumble';
}
```

Run: `yarn test tests/characters.test.js` → PASS.

- [ ] **Step 3: Write failing tests `tests/tick-growth.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { createPet } from '../src/engine/pet.js';
import { tick } from '../src/engine/tick.js';
import { never, petAt, ticks } from './helpers.js';

describe('tick: growth', () => {
  it('ages the egg one minute per tick and hatches at 5 minutes', () => {
    const almost = ticks(createPet(), 4);
    expect(almost).toMatchObject({ stage: 'egg', ageMinutes: 4 });
    expect(tick(almost, never)).toMatchObject({ stage: 'baby', ageMinutes: 5 });
  });

  it('does not mutate its input', () => {
    const before = createPet();
    const snapshot = JSON.stringify(before);
    tick(before, never);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('leaves a dead pet unchanged', () => {
    const dead = petAt('adult', { stage: 'dead' });
    expect(tick(dead, never)).toBe(dead);
  });

  it('picks the teen character from care history', () => {
    const teen = tick(petAt('child', { ageMinutes: 1439, careMistakes: 0, discipline: 3 }), never);
    expect(teen).toMatchObject({ stage: 'teen', character: 'sparky' });
  });

  it('picks the adult character from care history', () => {
    const adult = tick(petAt('teen', { ageMinutes: 4319, careMistakes: 9 }), never);
    expect(adult).toMatchObject({ stage: 'adult', character: 'grumble' });
  });
});
```

- [ ] **Step 4: Run, expect FAIL**, then implement `src/engine/tick.js`

```js
import { MINUTES_PER_DAY } from './constants.js';
import { chooseCharacter } from './characters.js';
import { stageForAge, withAttention } from './pet.js';

function grow(s) {
  const stage = stageForAge(s.ageMinutes);
  if (stage === s.stage) return s;
  const character = stage === 'teen' || stage === 'adult' ? chooseCharacter(s) : s.character;
  return { ...s, stage, character };
}

export function tick(state, rng) {
  if (state.stage === 'dead') return state;
  let s = {
    ...state,
    ageMinutes: state.ageMinutes + 1,
    clock: (state.clock + 1) % MINUTES_PER_DAY,
  };
  s = grow(s);
  return withAttention(s);
}
```

- [ ] **Step 5: Run, expect PASS**: `yarn test` (all suites).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Let the pet age, hatch and evolve into a character reflecting care quality"
```

---

### Task 4: Hunger, happiness, poop, sickness, misbehaving

**Files:**
- Modify: `src/engine/tick.js`
- Create: `tests/tick-needs.test.js`

**Interfaces:**
- Consumes: constants and `clamp` from earlier tasks; `always`/`never`/`petAt`/`ticks`
- Produces: the same `tick`, now applying needs decay

- [ ] **Step 1: Write failing tests `tests/tick-needs.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { tick } from '../src/engine/tick.js';
import { always, never, petAt, ticks } from './helpers.js';

describe('tick: needs', () => {
  it('loses a hunger heart every interval and a happiness heart offset from it', () => {
    const before = ticks(petAt('baby'), 24); // age 29
    expect(before.hunger).toBe(4);
    const after = ticks(petAt('baby'), 25);  // age 30
    expect(after.hunger).toBe(3);
    expect(after.happiness).toBe(3);          // lost at age 15
  });

  it('never drops below zero hearts', () => {
    const s = tick(petAt('baby', { ageMinutes: 29, hunger: 0 }), never);
    expect(s.hunger).toBe(0);
  });

  it('adds poop on the poop interval, up to the cap', () => {
    expect(tick(petAt('child', { ageMinutes: 449 }), never).poop).toBe(1);
    expect(tick(petAt('child', { ageMinutes: 449, poop: 4 }), never).poop).toBe(4);
  });

  it('can fall sick when the rng says so, and not otherwise', () => {
    expect(tick(petAt('child'), always).sick).toBe(true);
    expect(tick(petAt('child'), never).sick).toBe(false);
  });

  it('can start misbehaving when the rng says so, and not otherwise', () => {
    expect(tick(petAt('child'), always).misbehaving).toBe(true);
    expect(tick(petAt('child'), never).misbehaving).toBe(false);
  });

  it('raises the attention flag when a need hits zero', () => {
    expect(tick(petAt('child', { hunger: 0 }), never).needsAttention).toBe(true);
  });
});
```

- [ ] **Step 2: Run, expect FAIL** (`hunger` stays 4 etc.): `yarn test tests/tick-needs.test.js`

- [ ] **Step 3: Replace `src/engine/tick.js` with**

```js
import {
  HEART_INTERVAL, HAPPY_OFFSET, POOP_INTERVAL, MAX_POOP, MINUTES_PER_DAY,
  SICK_BASE, SICK_PER_POOP, SICK_WHEN_STARVING, MISBEHAVE_CHANCE,
} from './constants.js';
import { chooseCharacter } from './characters.js';
import { stageForAge, withAttention, clamp } from './pet.js';

function grow(s) {
  const stage = stageForAge(s.ageMinutes);
  if (stage === s.stage) return s;
  const character = stage === 'teen' || stage === 'adult' ? chooseCharacter(s) : s.character;
  return { ...s, stage, character };
}

const sickChance = (hunger, poop) =>
  SICK_BASE + poop * SICK_PER_POOP + (hunger === 0 ? SICK_WHEN_STARVING : 0);

function live(s, rng) {
  const interval = HEART_INTERVAL[s.stage];
  let { hunger, happiness, poop, sick, misbehaving } = s;
  if (s.ageMinutes % interval === 0) hunger = clamp(hunger - 1);
  if ((s.ageMinutes + HAPPY_OFFSET) % interval === 0) happiness = clamp(happiness - 1);
  if (s.ageMinutes % POOP_INTERVAL === 0) poop = Math.min(MAX_POOP, poop + 1);
  if (!sick && rng() < sickChance(hunger, poop)) sick = true;
  if (!misbehaving && !s.asleep && rng() < MISBEHAVE_CHANCE) misbehaving = true;
  return { ...s, hunger, happiness, poop, sick, misbehaving };
}

export function tick(state, rng) {
  if (state.stage === 'dead') return state;
  let s = {
    ...state,
    ageMinutes: state.ageMinutes + 1,
    clock: (state.clock + 1) % MINUTES_PER_DAY,
  };
  s = grow(s);
  if (s.stage === 'egg') return withAttention(s);
  s = live(s, rng);
  return withAttention(s);
}
```

- [ ] **Step 4: Run, expect PASS**: `yarn test` (all suites).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Make hunger, happiness, poop, sickness and misbehaving drive the care loop"
```

---

### Task 5: Sleep and the light

**Files:**
- Modify: `src/engine/tick.js`
- Create: `tests/tick-sleep.test.js`

**Interfaces:**
- Consumes: `isNight` from `pet.js`; `LIGHT_GRACE_CLOCK`
- Produces: `tick` now maintains `asleep`, forces `lightOn = true` while awake, charges a care mistake at 22:30 if the light is still on, and skips `live()` while asleep with the light off.

- [ ] **Step 1: Write failing tests `tests/tick-sleep.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { tick } from '../src/engine/tick.js';
import { never, petAt } from './helpers.js';

describe('tick: sleep', () => {
  it('falls asleep at bedtime', () => {
    expect(tick(petAt('child', { clock: 1319 }), never).asleep).toBe(true);
  });

  it('wakes in the morning with the light back on', () => {
    const s = tick(petAt('child', { clock: 419, asleep: true, lightOn: false }), never);
    expect(s).toMatchObject({ asleep: false, lightOn: true });
  });

  it('does not decay or poop while asleep with the light off', () => {
    const s = tick(petAt('child', { ageMinutes: 404, clock: 1400, asleep: true, lightOn: false }), never);
    expect(s.hunger).toBe(4); // age 405 would normally cost a heart
  });

  it('charges a care mistake if the light is still on at 22:30', () => {
    const s = tick(petAt('child', { clock: 1349, asleep: true, lightOn: true }), never);
    expect(s.careMistakes).toBe(1);
  });

  it('charges nothing if the light was turned off', () => {
    const s = tick(petAt('child', { clock: 1349, asleep: true, lightOn: false }), never);
    expect(s.careMistakes).toBe(0);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `yarn test tests/tick-sleep.test.js`

- [ ] **Step 3: Edit `src/engine/tick.js`**

Add `LIGHT_GRACE_CLOCK` to the constants import and `isNight` to the `pet.js` import. Add this function above `tick`:

```js
function sleep(s) {
  const asleep = isNight(s.clock);
  const lightOn = asleep ? s.lightOn : true;
  const forgotLight = asleep && lightOn && s.clock === LIGHT_GRACE_CLOCK;
  return { ...s, asleep, lightOn, careMistakes: s.careMistakes + (forgotLight ? 1 : 0) };
}
```

Replace the tail of `tick` (after the egg early return) with:

```js
  s = sleep(s);
  if (!(s.asleep && !s.lightOn)) s = live(s, rng);
  return withAttention(s);
```

- [ ] **Step 4: Run, expect PASS**: `yarn test` (all suites; earlier tests use `clock` 480 so they stay awake).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add a day/night cycle so forgetting the light costs a care mistake"
```

---

### Task 6: Neglect, care mistakes and death

**Files:**
- Modify: `src/engine/tick.js`
- Create: `tests/tick-death.test.js`

**Interfaces:**
- Consumes: `CARE_MISTAKE_GRACE`, `DEATH_NEGLECT`, `OLD_AGE`
- Produces: `tick` now tracks `lowMinutes`, `neglectMinutes`, `careMistakes` and sets `stage: 'dead'`.

- [ ] **Step 1: Write failing tests `tests/tick-death.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { tick } from '../src/engine/tick.js';
import { OLD_AGE } from '../src/engine/constants.js';
import { never, petAt } from './helpers.js';

describe('tick: neglect and death', () => {
  it('records one care mistake after the grace period at zero hearts', () => {
    const s = tick(petAt('child', { hunger: 0, lowMinutes: 59 }), never);
    expect(s.careMistakes).toBe(1);
    expect(tick(s, never).careMistakes).toBe(1); // only once per episode
  });

  it('resets the low counter once needs recover', () => {
    const s = tick(petAt('child', { lowMinutes: 30 }), never);
    expect(s.lowMinutes).toBe(0);
  });

  it('dies after sustained starvation', () => {
    expect(tick(petAt('child', { hunger: 0, neglectMinutes: 719 }), never).stage).toBe('dead');
  });

  it('dies after sustained untreated sickness', () => {
    expect(tick(petAt('child', { sick: true, neglectMinutes: 719 }), never).stage).toBe('dead');
  });

  it('recovers from neglect when fed and healthy', () => {
    expect(tick(petAt('child', { neglectMinutes: 100 }), never).neglectMinutes).toBe(0);
  });

  it('dies of old age as an adult', () => {
    expect(tick(petAt('adult', { ageMinutes: OLD_AGE - 1 }), never).stage).toBe('dead');
  });

  it('keeps its character after death', () => {
    const s = tick(petAt('adult', { character: 'mochi', ageMinutes: OLD_AGE - 1 }), never);
    expect(s).toMatchObject({ stage: 'dead', character: 'mochi' });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `yarn test tests/tick-death.test.js`

- [ ] **Step 3: Edit `src/engine/tick.js`**

Add `CARE_MISTAKE_GRACE, DEATH_NEGLECT, OLD_AGE` to the constants import. Add above `tick`:

```js
function neglect(s) {
  const low = s.hunger === 0 || s.happiness === 0;
  const lowMinutes = low ? s.lowMinutes + 1 : 0;
  const mistake = lowMinutes === CARE_MISTAKE_GRACE ? 1 : 0;
  const starving = s.hunger === 0 || s.sick;
  return {
    ...s,
    lowMinutes,
    careMistakes: s.careMistakes + mistake,
    neglectMinutes: starving ? s.neglectMinutes + 1 : 0,
  };
}

function maybeDie(s) {
  const neglected = s.neglectMinutes >= DEATH_NEGLECT;
  const old = s.stage === 'adult' && s.ageMinutes >= OLD_AGE;
  return neglected || old ? { ...s, stage: 'dead' } : s;
}
```

Replace the tail of `tick` with:

```js
  s = sleep(s);
  if (!(s.asleep && !s.lightOn)) s = live(s, rng);
  s = neglect(s);
  s = maybeDie(s);
  return withAttention(s);
```

- [ ] **Step 4: Run, expect PASS**: `yarn test` (all suites).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Let neglect and old age end the pet's life so care has consequences"
```

---

### Task 7: Player actions

**Files:**
- Create: `src/engine/act.js`, `tests/act.test.js`

**Interfaces:**
- Consumes: `withAttention`, `clamp`, `MAX_HEARTS`, `MEDICINE_DOSES`
- Produces: `act(state, action): state` where `action` is one of `'feed-meal' | 'feed-snack' | 'play' | 'clean' | 'medicine' | 'discipline' | 'toggle-light'`. Throws `Error('Unknown action: <name>')` for anything else. Eggs and dead pets return the input unchanged.

- [ ] **Step 1: Write failing tests `tests/act.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { act } from '../src/engine/act.js';
import { petAt } from './helpers.js';

describe('act', () => {
  it('ignores actions on eggs and dead pets', () => {
    const egg = petAt('egg');
    const dead = petAt('adult', { stage: 'dead' });
    expect(act(egg, 'feed-meal')).toBe(egg);
    expect(act(dead, 'clean')).toBe(dead);
  });

  it('throws on unknown actions', () => {
    expect(() => act(petAt('child'), 'dance')).toThrow('Unknown action: dance');
  });

  it('a meal restores a hunger heart and adds weight, up to the cap', () => {
    expect(act(petAt('child', { hunger: 2, weight: 10 }), 'feed-meal')).toMatchObject({ hunger: 3, weight: 11 });
    expect(act(petAt('child', { hunger: 4, weight: 10 }), 'feed-meal').weight).toBe(10);
  });

  it('a snack restores happiness and adds more weight', () => {
    expect(act(petAt('child', { happiness: 1, weight: 10 }), 'feed-snack')).toMatchObject({ happiness: 2, weight: 12 });
  });

  it('play raises happiness and lowers weight but never below 1', () => {
    expect(act(petAt('child', { happiness: 2, weight: 10 }), 'play')).toMatchObject({ happiness: 3, weight: 9 });
    expect(act(petAt('child', { happiness: 2, weight: 1 }), 'play').weight).toBe(1);
  });

  it('a sick pet will not play', () => {
    const sick = petAt('child', { happiness: 2, sick: true });
    expect(act(sick, 'play')).toEqual(sick);
  });

  it('cleaning removes all poop and clears the attention call', () => {
    const s = act(petAt('child', { poop: 3, needsAttention: true }), 'clean');
    expect(s).toMatchObject({ poop: 0, needsAttention: false });
  });

  it('medicine needs two doses to cure', () => {
    const once = act(petAt('child', { sick: true }), 'medicine');
    expect(once).toMatchObject({ sick: true, doses: 1 });
    expect(act(once, 'medicine')).toMatchObject({ sick: false, doses: 0 });
  });

  it('medicine does nothing for a healthy pet', () => {
    const s = petAt('child');
    expect(act(s, 'medicine')).toEqual(s);
  });

  it('discipline only works on a misbehaving pet', () => {
    const bad = act(petAt('child', { misbehaving: true, discipline: 1 }), 'discipline');
    expect(bad).toMatchObject({ misbehaving: false, discipline: 2 });
    const good = petAt('child', { discipline: 1 });
    expect(act(good, 'discipline')).toEqual(good);
  });

  it('toggles the light only while asleep', () => {
    expect(act(petAt('child', { asleep: true, lightOn: true }), 'toggle-light').lightOn).toBe(false);
    expect(act(petAt('child'), 'toggle-light').lightOn).toBe(true);
  });

  it('ignores feeding while asleep', () => {
    const s = petAt('child', { hunger: 1, asleep: true });
    expect(act(s, 'feed-meal').hunger).toBe(1);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**: `yarn test tests/act.test.js`

- [ ] **Step 3: Implement `src/engine/act.js`**

```js
import { MAX_HEARTS, MEDICINE_DOSES } from './constants.js';
import { clamp, withAttention } from './pet.js';

const awake = (s) => !s.asleep;

const ACTIONS = {
  'feed-meal': (s) =>
    awake(s) && s.hunger < MAX_HEARTS ? { ...s, hunger: s.hunger + 1, weight: s.weight + 1 } : s,
  'feed-snack': (s) =>
    awake(s) && s.happiness < MAX_HEARTS ? { ...s, happiness: s.happiness + 1, weight: s.weight + 2 } : s,
  play: (s) =>
    awake(s) && !s.sick && s.happiness < MAX_HEARTS
      ? { ...s, happiness: s.happiness + 1, weight: Math.max(1, s.weight - 1) }
      : s,
  clean: (s) => (awake(s) ? { ...s, poop: 0 } : s),
  medicine: (s) => {
    if (!s.sick || !awake(s)) return s;
    const doses = s.doses + 1;
    return doses >= MEDICINE_DOSES ? { ...s, sick: false, doses: 0 } : { ...s, doses };
  },
  discipline: (s) =>
    s.misbehaving && awake(s) ? { ...s, discipline: clamp(s.discipline + 1), misbehaving: false } : s,
  'toggle-light': (s) => (s.asleep ? { ...s, lightOn: !s.lightOn } : s),
};

export function act(state, action) {
  if (state.stage === 'egg' || state.stage === 'dead') return state;
  const handler = ACTIONS[action];
  if (!handler) throw new Error(`Unknown action: ${action}`);
  return withAttention(handler(state));
}
```

- [ ] **Step 4: Run, expect PASS**: `yarn test`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add player care actions so the pet can be fed, played with, cleaned and healed"
```

---

### Task 8: Offline catch-up and persistence

**Files:**
- Create: `src/engine/advance.js`, `src/storage/storage.js`, `tests/advance.test.js`, `tests/storage.test.js`

**Interfaces:**
- Consumes: `tick`, `createPet`, `MAX_OFFLINE_MINUTES`
- Produces: `advance(state, minutes, rng): state`; `save(state, nowMs, storage = localStorage): void`; `load(nowMs, rng, storage = localStorage): state`

- [ ] **Step 1: Write failing tests `tests/advance.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { advance } from '../src/engine/advance.js';
import { never, petAt, ticks } from './helpers.js';

describe('advance', () => {
  it('equals repeated ticks while the player is present all day', () => {
    const start = petAt('child');
    expect(advance(start, 30, never)).toEqual(ticks(start, 30));
  });

  it('assumes the light was turned off overnight, so no care mistake', () => {
    const start = petAt('child', { clock: 1319 });
    expect(ticks(start, 60).careMistakes).toBe(1);
    const away = advance(start, 60, never);
    expect(away.careMistakes).toBe(0);
    expect(away.asleep).toBe(true);
  });

  it('wakes the pet up again by morning', () => {
    const away = advance(petAt('child', { clock: 1319 }), 60 * 10, never);
    expect(away).toMatchObject({ asleep: false, lightOn: true });
  });
});
```

- [ ] **Step 2: Run, expect FAIL**, then implement `src/engine/advance.js`

```js
import { tick } from './tick.js';

export function advance(state, minutes, rng) {
  let s = state;
  for (let i = 0; i < minutes; i++) {
    const away = s.asleep ? { ...s, lightOn: false } : s;
    s = tick(away, rng);
  }
  return s;
}
```

Run: `yarn test tests/advance.test.js` → PASS.

- [ ] **Step 3: Write failing tests `tests/storage.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { save, load } from '../src/storage/storage.js';
import { createPet } from '../src/engine/pet.js';
import { MAX_OFFLINE_MINUTES } from '../src/engine/constants.js';
import { never, petAt } from './helpers.js';

const fakeStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
  };
};
const MIN = 60000;

describe('storage', () => {
  it('starts a fresh egg when nothing is saved', () => {
    expect(load(0, never, fakeStorage())).toEqual(createPet());
  });

  it('round-trips state when no time has passed', () => {
    const storage = fakeStorage();
    const pet = petAt('child', { hunger: 2 });
    save(pet, 1000, storage);
    expect(load(1000, never, storage)).toEqual(pet);
  });

  it('replays elapsed real minutes through the engine', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 0, storage);
    expect(load(10 * MIN, never, storage).ageMinutes).toBe(5 + 10);
  });

  it('caps how much time is replayed after a long absence', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 0, storage);
    const loaded = load(100000 * MIN, never, storage);
    expect(loaded.ageMinutes).toBeLessThanOrEqual(5 + MAX_OFFLINE_MINUTES);
  });

  it('never replays negative time if the clock went backwards', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 5 * MIN, storage);
    expect(load(0, never, storage).ageMinutes).toBe(5);
  });

  it('falls back to a new egg on corrupt data', () => {
    expect(load(0, never, fakeStorage({ 'virtual-pet': '{not json' }))).toEqual(createPet());
    expect(load(0, never, fakeStorage({ 'virtual-pet': '{"state":{"stage":1},"savedAt":0}' }))).toEqual(createPet());
  });
});
```

- [ ] **Step 4: Run, expect FAIL**, then implement `src/storage/storage.js`

```js
import { advance } from '../engine/advance.js';
import { createPet } from '../engine/pet.js';
import { MAX_OFFLINE_MINUTES } from '../engine/constants.js';

const KEY = 'virtual-pet';
const MS_PER_MINUTE = 60000;

const isPetState = (s) =>
  typeof s === 'object' && s !== null &&
  typeof s.stage === 'string' && Number.isFinite(s.ageMinutes);

export function save(state, nowMs, storage = localStorage) {
  storage.setItem(KEY, JSON.stringify({ state, savedAt: nowMs }));
}

export function load(nowMs, rng, storage = localStorage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return createPet();
    const { state, savedAt } = JSON.parse(raw);
    if (!isPetState(state) || !Number.isFinite(savedAt)) return createPet();
    const elapsed = Math.floor((nowMs - savedAt) / MS_PER_MINUTE);
    const minutes = Math.min(MAX_OFFLINE_MINUTES, Math.max(0, elapsed));
    return advance(state, minutes, rng);
  } catch {
    return createPet();
  }
}
```

- [ ] **Step 5: Run, expect PASS**: `yarn test`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Persist the pet and replay time away so it keeps living while the tab is closed"
```

---

### Task 9: "Left or right" mini-game

**Files:**
- Create: `src/engine/guess.js`, `tests/guess.test.js`

**Interfaces:**
- Consumes: `withAttention`, `clamp`
- Produces: `ROUNDS` (3); `playGuess(choice: 'left'|'right', rng): {choice, direction, won}`; `scoreGame(rounds): {wins, won}`; `applyGameResult(state, result): state`

- [ ] **Step 1: Write failing tests `tests/guess.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { ROUNDS, playGuess, scoreGame, applyGameResult } from '../src/engine/guess.js';
import { petAt } from './helpers.js';

describe('guess game', () => {
  it('has three rounds', () => {
    expect(ROUNDS).toBe(3);
  });

  it('picks left for low rng values and right for high ones', () => {
    expect(playGuess('left', () => 0.1)).toEqual({ choice: 'left', direction: 'left', won: true });
    expect(playGuess('left', () => 0.9)).toEqual({ choice: 'left', direction: 'right', won: false });
    expect(playGuess('right', () => 0.9).won).toBe(true);
  });

  it('wins the game with two or more round wins', () => {
    expect(scoreGame([{ won: true }, { won: false }, { won: true }])).toEqual({ wins: 2, won: true });
    expect(scoreGame([{ won: true }, { won: false }, { won: false }])).toEqual({ wins: 1, won: false });
  });

  it('a won game raises happiness and lowers weight', () => {
    const s = applyGameResult(petAt('child', { happiness: 2, weight: 10 }), { won: true });
    expect(s).toMatchObject({ happiness: 3, weight: 9 });
  });

  it('a lost game changes nothing', () => {
    const s = petAt('child', { happiness: 2 });
    expect(applyGameResult(s, { won: false })).toBe(s);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**, then implement `src/engine/guess.js`

```js
import { clamp, withAttention } from './pet.js';

export const ROUNDS = 3;

export function playGuess(choice, rng) {
  const direction = rng() < 0.5 ? 'left' : 'right';
  return { choice, direction, won: choice === direction };
}

export function scoreGame(rounds) {
  const wins = rounds.filter((r) => r.won).length;
  return { wins, won: wins >= 2 };
}

export function applyGameResult(state, result) {
  if (!result.won) return state;
  return withAttention({
    ...state,
    happiness: clamp(state.happiness + 1),
    weight: Math.max(1, state.weight - 1),
  });
}
```

- [ ] **Step 3: Run, expect PASS**: `yarn test`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add the left-or-right mini-game as a pure, testable happiness boost"
```

---

### Task 10: Sprites and canvas rendering

**Files:**
- Create: `src/ui/sprites.js`, `src/ui/render.js`, `tests/sprites.test.js`

**Interfaces:**
- Consumes: pet state (`stage`, `character`, `asleep`, `lightOn`, `sick`, `poop`, `needsAttention`, `hunger`, `happiness`, `discipline`) and UI state (`screen`, `option`, `rounds`) from Task 11
- Produces from `sprites.js`: `SPRITES` (16×16 bitmaps keyed `egg, baby, child, sparky, bubbles, mochi, grumble, dead`), `ICONS` (small bitmaps: `heart, heartEmpty, poop, cross, bang, meal, snack, arrowLeft, arrowRight, F, H, D`), `spriteFor(pet): string[]`
- Produces from `render.js`: `drawBitmap(ctx, rows, x, y)`, `render(ctx, pet, ui, frame)`

- [ ] **Step 1: Write failing test `tests/sprites.test.js`** (guards against miscounted art)

```js
import { describe, it, expect } from 'vitest';
import { SPRITES, ICONS, spriteFor } from '../src/ui/sprites.js';

const isRectangular = (rows) => rows.every((r) => r.length === rows[0].length && /^[#.]+$/.test(r));

describe('sprites', () => {
  it('every character and stage sprite is a 16x16 bitmap', () => {
    for (const [name, rows] of Object.entries(SPRITES)) {
      expect(rows.length, `${name} height`).toBe(16);
      expect(isRectangular(rows), `${name} rectangular`).toBe(true);
      expect(rows[0].length, `${name} width`).toBe(16);
    }
  });

  it('every icon is a rectangular bitmap', () => {
    for (const [name, rows] of Object.entries(ICONS)) {
      expect(isRectangular(rows), name).toBe(true);
    }
  });

  it('picks sprites by stage, using the character from teen onwards', () => {
    expect(spriteFor({ stage: 'egg' })).toBe(SPRITES.egg);
    expect(spriteFor({ stage: 'child' })).toBe(SPRITES.child);
    expect(spriteFor({ stage: 'dead' })).toBe(SPRITES.dead);
    expect(spriteFor({ stage: 'teen', character: 'mochi' })).toBe(SPRITES.mochi);
    expect(spriteFor({ stage: 'adult', character: 'sparky' })).toBe(SPRITES.sparky);
  });
});
```

- [ ] **Step 2: Run, expect FAIL**, then create `src/ui/sprites.js`

```js
export const SPRITES = {
  egg: [
    '................',
    '................',
    '.....######.....',
    '....########....',
    '...##########...',
    '...###.####.#...',
    '..############..',
    '..##.#######.#..',
    '..############..',
    '..############..',
    '..#.#########.#.',
    '...##########...',
    '...##########...',
    '....########....',
    '.....######.....',
    '................',
  ],
  baby: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....######.....',
    '...##########...',
    '..############..',
    '..##.######.##..',
    '..############..',
    '..############..',
    '...##########...',
    '....########....',
    '................',
    '................',
    '................',
  ],
  child: [
    '................',
    '..##........##..',
    '..###......###..',
    '...##########...',
    '..############..',
    '..##.######.##..',
    '..############..',
    '..####....####..',
    '..############..',
    '...##########...',
    '...##########...',
    '....########....',
    '...###....###...',
    '................',
    '................',
    '................',
  ],
  sparky: [
    '.......##.......',
    '.......##.......',
    '......####......',
    '..############..',
    '...##########...',
    '....########....',
    '....##.##.##....',
    '...##########...',
    '..############..',
    '..############..',
    '...####..####...',
    '..###......###..',
    '..##........##..',
    '................',
    '................',
    '................',
  ],
  bubbles: [
    '..##............',
    '.#..#...........',
    '..##..######....',
    '....##########..',
    '...############.',
    '...##.####.##...',
    '...############.',
    '...############.',
    '...####..#####..',
    '....##########..',
    '.....########...',
    '......######....',
    '................',
    '................',
    '................',
    '................',
  ],
  mochi: [
    '................',
    '................',
    '................',
    '..############..',
    '.##############.',
    '.##############.',
    '.###..####..###.',
    '.##############.',
    '.##############.',
    '.####......####.',
    '.##############.',
    '..############..',
    '..###......###..',
    '................',
    '................',
    '................',
  ],
  grumble: [
    '..#..#....#..#..',
    '..##.##..##.##..',
    '..############..',
    '..############..',
    '..##...##...##..',
    '..############..',
    '..############..',
    '..##.######.##..',
    '..############..',
    '...##########...',
    '...##########...',
    '....########....',
    '...###....###...',
    '................',
    '................',
    '................',
  ],
  dead: [
    '................',
    '................',
    '................',
    '....########....',
    '...##########...',
    '..##.##..##.##..',
    '..###.####.###..',
    '..##.##..##.##..',
    '..############..',
    '..############..',
    '..############..',
    '..#.##.##.##.#..',
    '................',
    '................',
    '................',
    '................',
  ],
};

export const ICONS = {
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  heartEmpty: ['.#.#.', '#.#.#', '#...#', '.#.#.', '..#..'],
  poop: ['...#...', '..###..', '.#####.', '.#####.', '#######', '#######'],
  cross: ['..#..', '..#..', '#####', '..#..', '..#..'],
  bang: ['.#.', '.#.', '.#.', '...', '.#.'],
  meal: ['..####..', '.######.', '########', '########', '########', '########', '.######.', '..####..'],
  snack: ['.##.', '####', '####', '.##.'],
  arrowLeft: ['...#', '..##', '.###', '####', '.###', '..##', '...#'],
  arrowRight: ['#...', '##..', '###.', '####', '###.', '##..', '#...'],
  F: ['###', '#..', '##.', '#..', '#..'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
};

export function spriteFor(pet) {
  if (pet.stage === 'teen' || pet.stage === 'adult') return SPRITES[pet.character];
  return SPRITES[pet.stage];
}
```

- [ ] **Step 3: Run `yarn test tests/sprites.test.js`; if a row-length assertion names a sprite, fix that row's dot padding until PASS.**

- [ ] **Step 4: Create `src/ui/render.js`** (pure canvas drawing; verified visually and by the e2e smoke test)

```js
import { ICONS, spriteFor } from './sprites.js';

export const LCD = 32;
const INK = '#2b3320';

export function drawBitmap(ctx, rows, x, y) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] === '#') ctx.fillRect(x + c, y + r, 1, 1);
    }
  }
}

function drawHearts(ctx, filled, x, y) {
  for (let i = 0; i < 4; i++) {
    drawBitmap(ctx, i < filled ? ICONS.heart : ICONS.heartEmpty, x + i * 6, y);
  }
}

function drawUnderline(ctx, x, y, width) {
  ctx.fillRect(x, y, width, 1);
}

function drawMain(ctx, pet, frame) {
  if (pet.asleep && !pet.lightOn) {
    for (let y = 0; y < LCD; y++) {
      for (let x = (y % 2); x < LCD; x += 2) ctx.fillRect(x, y, 1, 1);
    }
    return;
  }
  const bob = pet.stage === 'dead' || pet.asleep ? 0 : frame % 2;
  drawBitmap(ctx, spriteFor(pet), 8, 8 + bob);
  for (let i = 0; i < pet.poop; i++) drawBitmap(ctx, ICONS.poop, 1 + i * 8, 25);
  if (pet.sick) drawBitmap(ctx, ICONS.cross, 1, 1);
  if (pet.needsAttention && frame % 2 === 0) drawBitmap(ctx, ICONS.bang, 28, 1);
}

function drawStatus(ctx, pet) {
  [[ICONS.F, pet.hunger], [ICONS.H, pet.happiness], [ICONS.D, pet.discipline]].forEach(
    ([letter, hearts], row) => {
      drawBitmap(ctx, letter, 1, 4 + row * 9);
      drawHearts(ctx, hearts, 7, 4 + row * 9);
    },
  );
}

function drawFeed(ctx, ui) {
  drawBitmap(ctx, ICONS.meal, 4, 10);
  drawBitmap(ctx, ICONS.snack, 22, 12);
  if (ui.option === 0) drawUnderline(ctx, 4, 21, 8);
  else drawUnderline(ctx, 22, 21, 4);
}

function drawGuess(ctx, ui) {
  ui.rounds.forEach((round, i) => {
    drawBitmap(ctx, round.won ? ICONS.heart : ICONS.heartEmpty, 7 + i * 8, 2);
  });
  drawBitmap(ctx, ICONS.arrowLeft, 6, 12);
  drawBitmap(ctx, ICONS.arrowRight, 22, 12);
  if (ui.option === 0) drawUnderline(ctx, 6, 21, 4);
  else drawUnderline(ctx, 22, 21, 4);
}

function drawResult(ctx, ui) {
  ui.rounds.forEach((round, i) => {
    drawBitmap(ctx, round.won ? ICONS.heart : ICONS.heartEmpty, 7 + i * 8, 14);
  });
}

export function render(ctx, pet, ui, frame) {
  ctx.clearRect(0, 0, LCD, LCD);
  ctx.fillStyle = INK;
  switch (ui.screen) {
    case 'status': return drawStatus(ctx, pet);
    case 'feed': return drawFeed(ctx, ui);
    case 'guess': return drawGuess(ctx, ui);
    case 'result': return drawResult(ctx, ui);
    default: return drawMain(ctx, pet, frame);
  }
}
```

- [ ] **Step 5: Run, expect PASS**: `yarn test`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add 1-bit sprites and canvas rendering for the LCD"
```

---

### Task 11: UI controller state machine

**Files:**
- Create: `src/ui/controller.js`, `tests/controller.test.js`

**Interfaces:**
- Consumes: `act`, `createPet`, `playGuess`, `scoreGame`, `applyGameResult`, `ROUNDS`
- Produces: `MENU` (`['feed','light','play','medicine','clean','status','discipline']`), `createUi(): {screen, menuIndex, option, rounds, result}`, `press(ui, pet, button: 'A'|'B'|'C', rng): {ui, pet}`. Screens: `main | feed | status | guess | result`.

- [ ] **Step 1: Write failing tests `tests/controller.test.js`**

```js
import { describe, it, expect } from 'vitest';
import { MENU, createUi, press } from '../src/ui/controller.js';
import { petAt } from './helpers.js';

const low = () => 0.1; // left
const select = (ui, name) => ({ ...ui, menuIndex: MENU.indexOf(name) });

describe('controller', () => {
  it('button A cycles the menu icon and wraps', () => {
    let ui = createUi();
    const pet = petAt('child');
    for (let i = 0; i < MENU.length; i++) ({ ui } = press(ui, pet, 'A', low));
    expect(ui.menuIndex).toBe(0);
    ({ ui } = press(ui, pet, 'A', low));
    expect(ui.menuIndex).toBe(1);
  });

  it('feeding: B opens the feed screen, A picks a snack, B confirms', () => {
    let ui = createUi();
    let pet = petAt('child', { hunger: 2, happiness: 2 });
    ({ ui, pet } = press(ui, pet, 'B', low));
    expect(ui.screen).toBe('feed');
    ({ ui, pet } = press(ui, pet, 'A', low));
    ({ ui, pet } = press(ui, pet, 'B', low));
    expect(ui.screen).toBe('main');
    expect(pet.happiness).toBe(3);
    expect(pet.hunger).toBe(2);
  });

  it('feeding: C cancels without feeding', () => {
    let { ui, pet } = press(createUi(), petAt('child', { hunger: 2 }), 'B', low);
    ({ ui, pet } = press(ui, pet, 'C', low));
    expect(ui.screen).toBe('main');
    expect(pet.hunger).toBe(2);
  });

  it('cleaning, medicine, discipline and light run engine actions directly', () => {
    const pet = petAt('child', { poop: 2 });
    const { pet: cleaned } = press(select(createUi(), 'clean'), pet, 'B', low);
    expect(cleaned.poop).toBe(0);
    const asleep = petAt('child', { asleep: true, lightOn: true });
    const { pet: dark } = press(select(createUi(), 'light'), asleep, 'B', low);
    expect(dark.lightOn).toBe(false);
  });

  it('status screen opens and any button closes it', () => {
    let { ui, pet } = press(select(createUi(), 'status'), petAt('child'), 'B', low);
    expect(ui.screen).toBe('status');
    ({ ui } = press(ui, pet, 'C', low));
    expect(ui.screen).toBe('main');
  });

  it('plays three guessing rounds and rewards a win', () => {
    let { ui, pet } = press(select(createUi(), 'play'), petAt('child', { happiness: 2 }), 'B', low);
    expect(ui.screen).toBe('guess');
    for (let i = 0; i < 3; i++) ({ ui, pet } = press(ui, pet, 'B', low)); // choice left, rng left
    expect(ui.screen).toBe('result');
    expect(ui.result.won).toBe(true);
    expect(pet.happiness).toBe(3);
    ({ ui } = press(ui, pet, 'B', low));
    expect(ui.screen).toBe('main');
  });

  it('refuses to play when sick, asleep or an egg', () => {
    for (const pet of [petAt('child', { sick: true }), petAt('child', { asleep: true }), petAt('egg')]) {
      const { ui } = press(select(createUi(), 'play'), pet, 'B', low);
      expect(ui.screen).toBe('main');
    }
  });

  it('B on a dead pet starts a new egg', () => {
    const { pet, ui } = press(createUi(), petAt('adult', { stage: 'dead' }), 'B', low);
    expect(pet.stage).toBe('egg');
    expect(ui.screen).toBe('main');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**, then implement `src/ui/controller.js`

```js
import { act } from '../engine/act.js';
import { createPet } from '../engine/pet.js';
import { ROUNDS, playGuess, scoreGame, applyGameResult } from '../engine/guess.js';

export const MENU = ['feed', 'light', 'play', 'medicine', 'clean', 'status', 'discipline'];
const FEED_ACTIONS = ['feed-meal', 'feed-snack'];
const GUESSES = ['left', 'right'];

export const createUi = () => ({ screen: 'main', menuIndex: 0, option: 0, rounds: [], result: null });

const canPlay = (pet) => pet.stage !== 'egg' && pet.stage !== 'dead' && !pet.asleep && !pet.sick;
const backToMain = (ui, pet) => ({ ui: { ...ui, screen: 'main' }, pet });
const toggleOption = (ui, pet) => ({ ui: { ...ui, option: (ui.option + 1) % 2 }, pet });

function main(ui, pet, button) {
  if (button === 'A') return { ui: { ...ui, menuIndex: (ui.menuIndex + 1) % MENU.length }, pet };
  if (button !== 'B') return { ui, pet };
  const item = MENU[ui.menuIndex];
  switch (item) {
    case 'feed': return { ui: { ...ui, screen: 'feed', option: 0 }, pet };
    case 'status': return { ui: { ...ui, screen: 'status' }, pet };
    case 'play':
      return canPlay(pet) ? { ui: { ...ui, screen: 'guess', option: 0, rounds: [] }, pet } : { ui, pet };
    case 'light': return { ui, pet: act(pet, 'toggle-light') };
    default: return { ui, pet: act(pet, item) };
  }
}

function feed(ui, pet, button) {
  if (button === 'A') return toggleOption(ui, pet);
  if (button === 'B') return backToMain(ui, act(pet, FEED_ACTIONS[ui.option]));
  return backToMain(ui, pet);
}

function guess(ui, pet, button, rng) {
  if (button === 'A') return toggleOption(ui, pet);
  if (button === 'C') return backToMain(ui, pet);
  const rounds = [...ui.rounds, playGuess(GUESSES[ui.option], rng)];
  if (rounds.length < ROUNDS) return { ui: { ...ui, rounds }, pet };
  const result = scoreGame(rounds);
  return { ui: { ...ui, screen: 'result', rounds, result }, pet: applyGameResult(pet, result) };
}

const HANDLERS = { main, feed, guess, result: backToMain, status: backToMain };

export function press(ui, pet, button, rng) {
  if (pet.stage === 'dead' && button === 'B') return { ui: createUi(), pet: createPet() };
  return HANDLERS[ui.screen](ui, pet, button, rng);
}
```

- [ ] **Step 3: Run, expect PASS**: `yarn test`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add the button-driven menu state machine so the UI logic is testable without a browser"
```

---

### Task 12: Shell, sound and wiring

**Files:**
- Create: `index.html`, `styles.css`, `src/ui/sound.js`, `src/main.js`

**Interfaces:**
- Consumes: everything above
- Produces: a playable page. The `#lcd` canvas exposes `data-stage`, `data-hunger`, `data-happiness` for the e2e test. `?speed=N` makes a game minute `60000 / N` ms.

- [ ] **Step 1: Create `index.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Virtual Pet</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="shell">
    <ul class="icons" aria-label="Menu">
      <li data-menu="feed" title="Feed">🍙</li>
      <li data-menu="light" title="Light">💡</li>
      <li data-menu="play" title="Play">🎮</li>
      <li data-menu="medicine" title="Medicine">💉</li>
      <li data-menu="clean" title="Clean">🚽</li>
      <li data-menu="status" title="Status">📊</li>
      <li data-menu="discipline" title="Discipline">📣</li>
    </ul>
    <div class="screen">
      <canvas id="lcd" width="32" height="32" aria-label="Pet screen"></canvas>
    </div>
    <div class="buttons">
      <button data-button="A" aria-label="Button A (cycle)">A</button>
      <button data-button="B" aria-label="Button B (select)">B</button>
      <button data-button="C" aria-label="Button C (cancel)">C</button>
    </div>
    <button id="mute" class="mute" aria-pressed="false">Sound: on</button>
  </main>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css`**

```css
:root { --lcd-bg: #9ead86; --shell: #e8567a; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4efe6; font-family: system-ui, sans-serif; }
.shell { width: 320px; padding: 28px 24px 24px; background: var(--shell); border-radius: 50% 50% 46% 46% / 40% 40% 60% 60%; box-shadow: inset 0 -8px 0 rgba(0,0,0,.15), 0 10px 24px rgba(0,0,0,.25); display: grid; gap: 14px; justify-items: center; }
.icons { list-style: none; margin: 18px 0 0; padding: 0; display: flex; gap: 6px; }
.icons li { font-size: 16px; padding: 2px 3px; border-radius: 4px; filter: grayscale(1); opacity: .6; }
.icons li.active { background: rgba(255,255,255,.85); filter: none; opacity: 1; }
.screen { background: var(--lcd-bg); padding: 10px; border-radius: 10px; box-shadow: inset 0 0 0 3px rgba(0,0,0,.25); }
#lcd { width: 256px; height: 256px; display: block; image-rendering: pixelated; }
.buttons { display: flex; gap: 20px; margin-top: 4px; }
.buttons button { width: 56px; height: 56px; border-radius: 50%; border: 0; background: #f7d046; font-weight: 700; font-size: 18px; box-shadow: 0 4px 0 rgba(0,0,0,.25); cursor: pointer; }
.buttons button:active { transform: translateY(3px); box-shadow: 0 1px 0 rgba(0,0,0,.25); }
.mute { border: 0; background: transparent; color: #fff; cursor: pointer; font-size: 12px; }
```

- [ ] **Step 3: Create `src/ui/sound.js`**

```js
const TONES = {
  call: [[880, 0.12], [660, 0.12], [880, 0.12]],
  button: [[520, 0.05]],
  win: [[523, 0.1], [659, 0.1], [784, 0.2]],
  lose: [[300, 0.2], [200, 0.3]],
};

export function createSound() {
  let ctx = null;
  let muted = false;

  function beep(kind) {
    if (muted || !navigator.userActivation?.hasBeenActive) return;
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    let t = ctx.currentTime;
    for (const [freq, duration] of TONES[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
      t += duration;
    }
  }

  return { beep, toggleMute: () => (muted = !muted) };
}
```

- [ ] **Step 4: Create `src/main.js`**

```js
import { mulberry32 } from './engine/rng.js';
import { tick } from './engine/tick.js';
import { load, save } from './storage/storage.js';
import { render } from './ui/render.js';
import { createUi, press, MENU } from './ui/controller.js';
import { createSound } from './ui/sound.js';

const speed = Number(new URLSearchParams(location.search).get('speed')) || 1;
const MS_PER_MINUTE = 60000 / speed;

const rng = mulberry32(Date.now());
const sound = createSound();
const canvas = document.getElementById('lcd');
const ctx = canvas.getContext('2d');

let pet = load(Date.now(), rng);
let ui = createUi();
let lastTick = Date.now();

function draw() {
  render(ctx, pet, ui, Math.floor(Date.now() / 500));
  document.querySelectorAll('[data-menu]').forEach((el) => {
    el.classList.toggle('active', ui.screen === 'main' && MENU[ui.menuIndex] === el.dataset.menu);
  });
  Object.assign(canvas.dataset, { stage: pet.stage, hunger: pet.hunger, happiness: pet.happiness });
}

function step() {
  const now = Date.now();
  const due = Math.floor((now - lastTick) / MS_PER_MINUTE);
  if (due > 0) {
    const wasCalling = pet.needsAttention;
    for (let i = 0; i < due; i++) pet = tick(pet, rng);
    lastTick += due * MS_PER_MINUTE;
    if (pet.needsAttention && !wasCalling) sound.beep('call');
    save(pet, lastTick);
  }
  draw();
}

function onButton(button) {
  const previous = ui.screen;
  ({ ui, pet } = press(ui, pet, button, rng));
  sound.beep('button');
  if (ui.screen === 'result' && previous !== 'result') sound.beep(ui.result.won ? 'win' : 'lose');
  save(pet, lastTick);
  draw();
}

document.querySelectorAll('[data-button]').forEach((el) => {
  el.addEventListener('click', () => onButton(el.dataset.button));
});
document.addEventListener('keydown', (e) => {
  const key = e.key.toUpperCase();
  if (['A', 'B', 'C'].includes(key)) onButton(key);
});
const mute = document.getElementById('mute');
mute.addEventListener('click', () => {
  const muted = sound.toggleMute();
  mute.textContent = `Sound: ${muted ? 'off' : 'on'}`;
  mute.setAttribute('aria-pressed', String(muted));
});

draw();
setInterval(step, 250);
```

- [ ] **Step 5: Manually verify in the browser**

Run: `yarn start`, then open `http://localhost:4173/?speed=600`.
Expected: an egg that hatches within about a second, the icon strip highlighting as you press A, the feed menu opening on B, hearts on the status screen, and no console errors.

- [ ] **Step 6: Run unit tests**: `yarn test` → all PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Wire the engine to a handheld shell with sound, persistence and a real-time loop"
```

---

### Task 13: Playwright smoke test

**Files:**
- Create: `playwright.config.js`, `e2e/smoke.spec.js`

**Interfaces:**
- Consumes: the `#lcd` data attributes and `?speed=N` param from Task 12

- [ ] **Step 1: Install the browser**

Run: `yarn playwright install chromium`
Expected: Chromium downloads.

- [ ] **Step 2: Create `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  webServer: { command: 'yarn start', url: 'http://localhost:4173', reuseExistingServer: true },
  use: { baseURL: 'http://localhost:4173' },
});
```

- [ ] **Step 3: Write `e2e/smoke.spec.js`** (each test gets a fresh browser context, so localStorage starts empty)

```js
import { test, expect } from '@playwright/test';

test('egg hatches, can be fed, and survives a reload', async ({ page }) => {
  await page.goto('/?speed=600'); // one game minute per 100 ms
  const lcd = page.locator('#lcd');

  await expect(lcd).toHaveAttribute('data-stage', 'egg');
  await expect(lcd).toHaveAttribute('data-stage', 'baby', { timeout: 5000 });

  await expect(lcd).toHaveAttribute('data-hunger', '3', { timeout: 10000 });
  await page.click('[data-button="B"]'); // open feed menu (feed is the first icon)
  await page.click('[data-button="B"]'); // choose meal
  await expect(lcd).toHaveAttribute('data-hunger', '4');

  await page.reload();
  await expect(lcd).not.toHaveAttribute('data-stage', 'egg');
});
```

- [ ] **Step 4: Run, expect PASS**

Run: `yarn test:e2e`
Expected: 1 passed. If the hunger assertions are flaky, increase the `timeout` rather than changing the rules.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add a browser smoke test covering hatch, feed and persistence"
```

---

### Task 14: Security scan and squash

**Files:** none new (fixes only, if the scan finds issues)

- [ ] **Step 1: Scan first-party code**

Run the Snyk `snyk_code_scan` tool on `/Users/joe.salomone/Workspace/Clade-Pets`.
Expected: no new issues. Fix any finding in `src/` or `e2e/`, rescan, and repeat until clean.

- [ ] **Step 2: Full verification**

Run: `yarn test && yarn test:e2e`
Expected: all unit tests and the smoke test pass.

- [ ] **Step 3: Squash the interim commits into one**

The spec commit is `5fb5898`. Squash everything after it:

```bash
git reset --soft 5fb5898
git commit -m "Build a Tamagotchi-style virtual pet so players can raise a creature in the browser

Pure engine with injected RNG keeps the rules deterministic and testable; the
UI is a thin canvas/DOM layer, and saved pets keep living while the tab is closed."
git log --oneline
```

Expected: two commits, the spec and the squashed feature. Then invoke the `superpowers:finishing-a-development-branch` skill.
