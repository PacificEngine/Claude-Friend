import { clamp, withAttention } from './pet.js';

export const ROUNDS = 3;

export function playGuess(choice, rng) {
  const direction = rng() < 0.5 ? 'left' : 'right';
  return { choice, direction, won: choice === direction };
}

export function scoreGame(rounds) {
  const wins = rounds.filter((r) => r.won).length;
  return { wins, won: wins >= 2 };
}

export function applyGameResult(state, result) {
  if (!result.won) return state;
  return withAttention({
    ...state,
    happiness: clamp(state.happiness + 1),
    weight: Math.max(1, state.weight - 1),
  });
}
