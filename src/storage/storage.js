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

export function load(nowMs, rng, storage = localStorage, msPerMinute = REAL_MS_PER_MINUTE) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return createPet();
    const { state, savedAt } = JSON.parse(raw);
    if (!isPetState(state) || !Number.isFinite(savedAt)) return createPet();
    const elapsed = Math.floor((nowMs - savedAt) / msPerMinute);
    const minutes = Math.min(MAX_OFFLINE_MINUTES, Math.max(0, elapsed));
    // Saves from older versions lack newer fields; fill them from defaults.
    return advance({ ...createPet(), ...state }, minutes, rng);
  } catch {
    return createPet();
  }
}
