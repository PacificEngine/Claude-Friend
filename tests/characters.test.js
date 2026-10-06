import { describe, it, expect } from 'vitest';
import { chooseCharacter } from '../src/engine/characters.js';
import {
  SPARKY_MAX_MISTAKES_PER_DAY, SPARKY_MIN_DISCIPLINE, BUBBLES_MAX_MISTAKES_PER_DAY,
  MOCHI_MAX_MISTAKES_PER_DAY, MINUTES_PER_DAY,
} from '../src/engine/constants.js';

// A pet two days old, so mistakes / 2 is its rate per day and the thresholds are whole mistakes.
const TWO_DAYS = 2 * MINUTES_PER_DAY;
const at = (careMistakes, discipline = 0, ageMinutes = TWO_DAYS) =>
  chooseCharacter({ careMistakes, discipline, ageMinutes });

describe('chooseCharacter', () => {
  it('uses the agreed per-day thresholds', () => {
    expect([SPARKY_MAX_MISTAKES_PER_DAY, SPARKY_MIN_DISCIPLINE, BUBBLES_MAX_MISTAKES_PER_DAY, MOCHI_MAX_MISTAKES_PER_DAY])
      .toEqual([1, 3, 4, 10]);
  });

  it('rewards disciplined, mistake-free care with sparky', () => {
    expect(at(0, 3)).toBe('sparky');
  });

  describe('sparky boundary (1 mistake per day)', () => {
    it('just under', () => expect(at(1, 3)).toBe('sparky'));
    it('exactly at', () => expect(at(2, 3)).toBe('sparky'));
    it('just over', () => expect(at(3, 3)).toBe('bubbles'));
  });

  it('sparky needs discipline of 3 or more', () => {
    expect(at(0, 3)).toBe('sparky');
    expect(at(0, 4)).toBe('sparky');
    expect(at(0, 2)).toBe('bubbles');
  });

  describe('bubbles boundary (4 mistakes per day)', () => {
    it('just under', () => expect(at(7)).toBe('bubbles'));
    it('exactly at', () => expect(at(8)).toBe('bubbles'));
    it('just over', () => expect(at(9)).toBe('mochi'));
  });

  describe('mochi boundary (10 mistakes per day)', () => {
    it('just under', () => expect(at(19)).toBe('mochi'));
    it('exactly at', () => expect(at(20)).toBe('mochi'));
    it('just over', () => expect(at(21)).toBe('grumble'));
  });

  it('judges the same total more kindly the longer the pet has lived', () => {
    expect(at(21, 0, TWO_DAYS)).toBe('grumble');
    expect(at(21, 0, 6 * MINUTES_PER_DAY)).toBe('bubbles');
  });

  it('never divides by less than one day', () => {
    const halfDay = MINUTES_PER_DAY / 2;
    // 1 mistake in half a day is 1 per day, not 2: still sparky.
    expect(at(1, 3, halfDay)).toBe('sparky');
    expect(at(1, 3, halfDay)).toBe(at(1, 3, MINUTES_PER_DAY));
    expect(at(5, 0, halfDay)).toBe(at(5, 0, MINUTES_PER_DAY));
    expect(at(5, 0, MINUTES_PER_DAY)).toBe('mochi');
  });
});
