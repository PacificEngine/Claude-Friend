export { ROUNDS } from './guess.js';

export const drawNumber = (rng) => Math.floor(rng() * 9) + 1;

// A tie is a loss, so there is always something at stake on a 1 or a 9.
export function playHighLow(shown, choice, rng) {
  const next = drawNumber(rng);
  const won = (choice === 'higher' && next > shown) || (choice === 'lower' && next < shown);
  return { shown, next, choice, won };
}
