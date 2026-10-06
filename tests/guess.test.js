import { describe, it, expect } from 'vitest';
import { ROUNDS, playGuess, scoreGame, applyGameResult } from '../src/engine/guess.js';
import { petAt } from './helpers.js';

describe('guess game', () => {
  it('has three rounds', () => {
    expect(ROUNDS).toBe(3);
  });

  it('picks left for low rng values and right for high ones', () => {
    expect(playGuess('left', () => 0.1)).toEqual({ choice: 'left', direction: 'left', won: true });
    expect(playGuess('left', () => 0.9)).toEqual({ choice: 'left', direction: 'right', won: false });
    expect(playGuess('right', () => 0.9).won).toBe(true);
  });

  it('treats an rng of exactly 0.5 as right', () => {
    expect(playGuess('right', () => 0.5).direction).toBe('right');
  });

  it('wins the game with two or more round wins', () => {
    expect(scoreGame([{ won: true }, { won: false }, { won: true }])).toEqual({ wins: 2, won: true });
    expect(scoreGame([{ won: true }, { won: false }, { won: false }])).toEqual({ wins: 1, won: false });
  });

  it('a won game raises happiness and lowers weight', () => {
    const s = applyGameResult(petAt('child', { happiness: 2, weight: 10 }), { won: true });
    expect(s).toMatchObject({ happiness: 3, weight: 9 });
  });

  it('a won game never pushes happiness past the cap or weight below 1', () => {
    const s = applyGameResult(petAt('child', { happiness: 4, weight: 1 }), { won: true });
    expect(s).toMatchObject({ happiness: 4, weight: 1 });
  });

  it('a lost game changes nothing', () => {
    const s = petAt('child', { happiness: 2 });
    expect(applyGameResult(s, { won: false })).toBe(s);
  });
});
