import { advance } from '../engine/advance.js';
import { createPet } from '../engine/pet.js';
import { MAX_OFFLINE_MINUTES } from '../engine/constants.js';

const KEY = 'virtual-pet';
const REAL_MS_PER_MINUTE = 60000;

const STAGES = ['egg', 'baby', 'child', 'teen', 'adult', 'dead'];

const isPetState = (s) =>
  typeof s === 'object' && s !== null &&
  STAGES.includes(s.stage) && Number.isFinite(s.ageMinutes);

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
    if (!isPetState(state) || !Number.isFinite(savedAt)) return fresh;
    const elapsed = Math.floor((nowMs - savedAt) / msPerMinute);
    const minutes = Math.min(MAX_OFFLINE_MINUTES, Math.max(0, elapsed));
    // Saves from older versions lack newer fields; fill them from defaults.
    const pet = advance({ ...createPet(), ...state }, minutes, rng);
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
