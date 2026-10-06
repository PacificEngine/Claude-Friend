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

// No-ops return the original state object so callers can detect "nothing happened" by identity.
export function act(state, action) {
  if (state.stage === 'egg' || state.stage === 'dead') return state;
  const handler = ACTIONS[action];
  if (!handler) throw new Error(`Unknown action: ${action}`);
  const next = handler(state);
  return next === state ? state : withAttention(next);
}
