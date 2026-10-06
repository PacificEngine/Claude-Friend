// Dev tool: plays bot caretakers through the pure engine to show how the game balances.
// Run with `yarn simulate [--runs=N]`. It never changes game numbers or behaviour.
import { pathToFileURL } from 'node:url';
import { createPet } from '../src/engine/pet.js';
import { tick } from '../src/engine/tick.js';
import { act } from '../src/engine/act.js';
import { mulberry32 } from '../src/engine/rng.js';
import {
  OLD_AGE, MINUTES_PER_DAY, LIGHT_GRACE_CLOCK, CARE_MISTAKE_GRACE,
} from '../src/engine/constants.js';

export const ACTION_NAMES = [
  'feed-meal', 'feed-snack', 'play', 'clean', 'medicine', 'discipline', 'toggle-light',
];

const SESSION_STARTS = [480, 780, 1140];
const SESSION_MINUTES = 10;

// Every reaction an attentive caretaker has to what the pet currently needs.
function react(pet) {
  const actions = [];
  if (pet.hunger <= 2) actions.push('feed-meal');
  if (pet.happiness <= 2) actions.push(pet.sick ? 'feed-snack' : 'play');
  if (pet.poop > 0) actions.push('clean');
  if (pet.sick) actions.push('medicine');
  if (pet.misbehaving) actions.push('discipline');
  if (pet.asleep && pet.lightOn) actions.push('toggle-light');
  return actions;
}

const inSession = (clock) =>
  SESSION_STARTS.some((start) => (clock - start + MINUTES_PER_DAY) % MINUTES_PER_DAY < SESSION_MINUTES);

export const POLICIES = {
  attentive: react,
  casual: (pet) => (inSession(pet.clock) ? react(pet).filter((a) => a !== 'toggle-light') : []),
  neglectful: (pet) => (pet.clock === 480 ? ['feed-meal'] : []),
};

export const CAUSES = ['light', 'ignored call', 'zero hearts', 'other'];

// Why did careMistakes just go up? Read it off the state the tick produced.
export function classifyMistakes(pet, increase) {
  const causes = [];
  if (pet.clock === LIGHT_GRACE_CLOCK) causes.push('light');
  if (pet.ignoredMinutes === CARE_MISTAKE_GRACE) causes.push('ignored call');
  if (pet.lowMinutes === CARE_MISTAKE_GRACE) causes.push('zero hearts');
  while (causes.length < increase) causes.push('other');
  return causes.slice(0, increase);
}

export function runLife(policy, seed, maxMinutes = 20000) {
  const rng = mulberry32(seed);
  let pet = createPet();
  let reachedTeen = false;
  let minutes = 0;
  const causes = Object.fromEntries(CAUSES.map((c) => [c, 0]));
  const atStage = {};
  while (pet.stage !== 'dead' && minutes < maxMinutes) {
    for (const action of policy(pet)) pet = act(pet, action);
    const before = pet;
    pet = tick(pet, rng);
    minutes++;
    if (pet.careMistakes > before.careMistakes) {
      for (const c of classifyMistakes(pet, pet.careMistakes - before.careMistakes)) causes[c]++;
    }
    for (const stage of ['teen', 'adult']) {
      if (pet.stage === stage && before.stage !== stage) {
        atStage[stage] = { careMistakes: pet.careMistakes, ageDays: pet.ageMinutes / MINUTES_PER_DAY };
      }
    }
    if (pet.stage === 'teen' || pet.stage === 'adult') reachedTeen = true;
  }
  const dead = pet.stage === 'dead';
  return {
    dead,
    ageMinutes: pet.ageMinutes,
    careMistakes: pet.careMistakes,
    causes,
    atTeen: atStage.teen ?? null,
    atAdult: atStage.adult ?? null,
    character: pet.character,
    reachedTeen,
    reachedAdult: pet.stage === 'adult' || (dead && pet.ageMinutes >= OLD_AGE),
    oldAge: dead && pet.ageMinutes >= OLD_AGE,
  };
}

const pct = (n, total) => `${((100 * n) / total).toFixed(1)}%`;
const days = (minutes) => (minutes / MINUTES_PER_DAY).toFixed(2);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

function median(sorted) {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Mean of a numeric field over the lives that have it; 'n/a' when none do.
function meanOf(lives, pick, digits = 2) {
  const xs = lives.map(pick).filter((x) => x != null);
  return xs.length ? (sum(xs) / xs.length).toFixed(digits) : 'n/a';
}

export function summarise(name, lives) {
  const n = lives.length;
  const ages = lives.map((l) => l.ageMinutes).sort((a, b) => a - b);
  const count = (pred) => lives.filter(pred).length;
  const chars = ['sparky', 'bubbles', 'mochi', 'grumble', null]
    .map((c) => `${c ?? 'none'}=${count((l) => l.character === c)}`).join(' ');
  return [
    `${name}`,
    `  runs:                 ${n}`,
    `  reached teen:         ${pct(count((l) => l.reachedTeen), n)}`,
    `  reached adult:        ${pct(count((l) => l.reachedAdult), n)}`,
    `  died of old age:      ${pct(count((l) => l.oldAge), n)}`,
    `  died of neglect:      ${pct(count((l) => l.dead && !l.oldAge), n)}`,
    `  still alive at limit: ${pct(count((l) => !l.dead), n)}`,
    `  lifespan (days):      mean ${days(sum(ages) / n)}, median ${days(median(ages))}, ` +
      `min ${days(ages[0])}, max ${days(ages[n - 1])}`,
    `  care mistakes (mean): ${(sum(lives.map((l) => l.careMistakes)) / n).toFixed(2)}`,
    `  mistakes by cause:    ` +
      CAUSES.map((c) => `${c}=${meanOf(lives, (l) => l.causes[c])}`).join(' '),
    `  mistakes at teen:     mean ${meanOf(lives, (l) => l.atTeen?.careMistakes)} ` +
      `(age ${meanOf(lives, (l) => l.atTeen?.ageDays)} days)`,
    `  mistakes at adult:    mean ${meanOf(lives, (l) => l.atAdult?.careMistakes)} ` +
      `(age ${meanOf(lives, (l) => l.atAdult?.ageDays)} days)`,
    `  characters:           ${chars}`,
  ].join('\n');
}

export function report(runs) {
  return Object.entries(POLICIES).map(([name, policy]) => {
    const lives = Array.from({ length: runs }, (_, i) => runLife(policy, i + 1));
    return summarise(name, lives);
  }).join('\n\n');
}

function main() {
  const arg = process.argv.find((a) => a.startsWith('--runs='));
  const runs = arg ? Number(arg.slice('--runs='.length)) : 200;
  if (!Number.isInteger(runs) || runs < 1) {
    console.error('--runs must be a positive integer');
    process.exit(1);
  }
  console.log(report(runs));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
