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
  const needy = state.hunger === 0 || state.happiness === 0 || state.sick ||
    state.poop >= 2 || state.misbehaving;
  const needsAttention = alive && (state.asleep ? state.lightOn : needy);
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
