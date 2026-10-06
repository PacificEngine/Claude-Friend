import {
  HEART_INTERVAL, HAPPY_OFFSET, POOP_INTERVAL, MAX_POOP, MINUTES_PER_DAY,
  SICK_BASE, SICK_PER_POOP, SICK_WHEN_STARVING, MISBEHAVE_CHANCE, LIGHT_GRACE_CLOCK,
  CARE_MISTAKE_GRACE, DEATH_NEGLECT, OLD_AGE,
} from './constants.js';
import { chooseCharacter } from './characters.js';
import { stageForAge, withAttention, clamp, isNight } from './pet.js';

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

function sleep(s) {
  const asleep = isNight(s.clock);
  const lightOn = asleep ? s.lightOn : true;
  const forgotLight = asleep && lightOn && s.clock === LIGHT_GRACE_CLOCK;
  return { ...s, asleep, lightOn, careMistakes: s.careMistakes + (forgotLight ? 1 : 0) };
}

function neglect(s) {
  const low = s.hunger === 0 || s.happiness === 0;
  const lowMinutes = low ? s.lowMinutes + 1 : 0;
  const mistake = lowMinutes === CARE_MISTAKE_GRACE ? 1 : 0;
  const calling = s.sick || s.poop >= 2 || s.misbehaving;
  const ignoredMinutes = calling ? (s.ignoredMinutes ?? 0) + 1 : 0;
  const ignored = ignoredMinutes === CARE_MISTAKE_GRACE ? 1 : 0;
  const starving = s.hunger === 0 || s.sick;
  return {
    ...s,
    lowMinutes,
    ignoredMinutes,
    careMistakes: s.careMistakes + mistake + ignored,
    neglectMinutes: starving ? s.neglectMinutes + 1 : 0,
  };
}

function maybeDie(s) {
  const neglected = s.neglectMinutes >= DEATH_NEGLECT;
  const old = s.stage === 'adult' && s.ageMinutes >= OLD_AGE;
  return neglected || old ? { ...s, stage: 'dead', asleep: false, lightOn: true } : s;
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
  s = sleep(s);
  if (!(s.asleep && !s.lightOn)) {
    s = live(s, rng);
    s = neglect(s);
  }
  s = maybeDie(s);
  return withAttention(s);
}
