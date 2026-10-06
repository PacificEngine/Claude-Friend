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
