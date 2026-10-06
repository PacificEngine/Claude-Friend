import { advance } from '../engine/advance.js';
import { createPet, withAttention } from '../engine/pet.js';
import {
  MAX_OFFLINE_MINUTES, MAX_HEARTS, MAX_POOP, MEDICINE_DOSES, MINUTES_PER_DAY,
} from '../engine/constants.js';

const KEY = 'virtual-pet';
const REAL_MS_PER_MINUTE = 60000;

const STAGES = ['egg', 'baby', 'child', 'teen', 'adult', 'dead'];
const CHARACTERS = ['sparky', 'bubbles', 'mochi', 'grumble'];

const isInt = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
const isBool = (v) => typeof v === 'boolean';
const nonNegative = (n) => Number.isFinite(n) && n >= 0;

// One validator per known pet key. Only these keys are ever copied from a save.
const FIELD_VALID = {
  stage: (v) => STAGES.includes(v),
  character: (v) => v === null || CHARACTERS.includes(v),
  ageMinutes: nonNegative,
  careMistakes: nonNegative,
  lowMinutes: nonNegative,
  neglectMinutes: nonNegative,
  ignoredMinutes: nonNegative,
  hunger: (v) => isInt(v, 0, MAX_HEARTS),
  happiness: (v) => isInt(v, 0, MAX_HEARTS),
  discipline: (v) => isInt(v, 0, MAX_HEARTS),
  weight: (v) => Number.isFinite(v) && v >= 1,
  poop: (v) => isInt(v, 0, MAX_POOP),
  doses: (v) => isInt(v, 0, MEDICINE_DOSES),
  clock: (v) => isInt(v, 0, MINUTES_PER_DAY - 1),
  sick: isBool,
  asleep: isBool,
  lightOn: isBool,
  misbehaving: isBool,
};

// Returns a clean pet built from defaults plus whitelisted, validated saved fields, or null.
// Missing keys keep their defaults (older saves); a present but invalid key rejects the save.
export function sanitizePet(raw) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const pet = createPet();
  for (const [key, isValid] of Object.entries(FIELD_VALID)) {
    if (!Object.hasOwn(raw, key)) continue;
    if (!isValid(raw[key])) return null;
    pet[key] = raw[key];
  }
  return withAttention(pet);
}

export function save(state, nowMs, storage = localStorage) {
  storage.setItem(KEY, JSON.stringify({ state, savedAt: nowMs }));
}

// Returns the pet caught up to nowMs and the tick-clock baseline to continue from.
// The baseline sits just after the replayed whole minutes, so a leftover fraction
// of a minute stays owed instead of being lost on every reload.
export function loadPet(nowMs, rng, storage = localStorage, msPerMinute = REAL_MS_PER_MINUTE) {
  const fresh = { pet: createPet(), lastTick: nowMs };
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return fresh;
    const { state, savedAt } = JSON.parse(raw);
    const clean = sanitizePet(state);
    if (!clean || !Number.isFinite(savedAt)) return fresh;
    const elapsed = Math.floor((nowMs - savedAt) / msPerMinute);
    const minutes = Math.min(MAX_OFFLINE_MINUTES, Math.max(0, elapsed));
    const pet = advance(clean, minutes, rng);
    const capped = elapsed > MAX_OFFLINE_MINUTES;
    const lastTick = capped || elapsed < 0 ? nowMs : savedAt + minutes * msPerMinute;
    return { pet, lastTick };
  } catch {
    return fresh;
  }
}

export function load(nowMs, rng, storage = localStorage, msPerMinute = REAL_MS_PER_MINUTE) {
  return loadPet(nowMs, rng, storage, msPerMinute).pet;
}
