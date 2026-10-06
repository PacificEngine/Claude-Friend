import { tick } from './tick.js';

export function advance(state, minutes, rng) {
  let s = state;
  for (let i = 0; i < minutes; i++) {
    const away = s.asleep ? { ...s, lightOn: false } : s;
    s = tick(away, rng);
  }
  return s;
}
