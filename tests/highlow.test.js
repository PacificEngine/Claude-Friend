import { describe, it, expect } from 'vitest';
import { drawNumber, playHighLow } from '../src/engine/highlow.js';
import { ROUNDS, scoreGame, applyGameResult } from '../src/engine/guess.js';
import { petAt } from './helpers.js';

// rng value that draws the number n (1..9)
const drawing = (n) => () => (n - 0.5) / 9;

describe('higher or lower', () => {
  it('reuses the three-round length of the guess game', () => {
    expect(ROUNDS).toBe(3);
  });

  it('draws integers from 1 to 9 inclusive', () => {
    expect(drawNumber(() => 0)).toBe(1);
    expect(drawNumber(() => 0.999999)).toBe(9);
    for (let n = 1; n <= 9; n++) expect(drawNumber(drawing(n))).toBe(n);
  });

  it('wins higher when the next number is greater', () => {
    expect(playHighLow(4, 'higher', drawing(7))).toEqual({ shown: 4, next: 7, choice: 'higher', won: true });
    expect(playHighLow(4, 'higher', drawing(2)).won).toBe(false);
  });

  it('wins lower when the next number is smaller', () => {
    expect(playHighLow(4, 'lower', drawing(2))).toEqual({ shown: 4, next: 2, choice: 'lower', won: true });
    expect(playHighLow(4, 'lower', drawing(7)).won).toBe(false);
  });

  it('a tie is a loss either way', () => {
    expect(playHighLow(5, 'higher', drawing(5)).won).toBe(false);
    expect(playHighLow(5, 'lower', drawing(5)).won).toBe(false);
  });

  it('handles the boundaries: nothing is higher than 9 or lower than 1', () => {
    expect(playHighLow(9, 'higher', drawing(9)).won).toBe(false);
    expect(playHighLow(9, 'lower', drawing(1)).won).toBe(true);
    expect(playHighLow(1, 'lower', drawing(1)).won).toBe(false);
    expect(playHighLow(1, 'higher', drawing(9)).won).toBe(true);
  });

  it('is deterministic for a fixed rng', () => {
    expect(playHighLow(3, 'higher', () => 0.42)).toEqual(playHighLow(3, 'higher', () => 0.42));
  });

  it('scores with the guess game helpers unchanged', () => {
    const rounds = [
      playHighLow(4, 'higher', drawing(8)),
      playHighLow(8, 'lower', drawing(3)),
      playHighLow(3, 'higher', drawing(3)),
    ];
    const result = scoreGame(rounds);
    expect(result).toEqual({ wins: 2, won: true });
    expect(applyGameResult(petAt('child', { happiness: 2 }), result).happiness).toBe(3);
  });
});
