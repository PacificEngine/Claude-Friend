import { describe, it, expect } from 'vitest';
import * as c from '../src/engine/constants.js';

describe('named thresholds', () => {
  it('keeps the character and suspend thresholds in one place', () => {
    expect([c.SPARKY_MAX_MISTAKES, c.SPARKY_MIN_DISCIPLINE, c.BUBBLES_MAX_MISTAKES, c.MOCHI_MAX_MISTAKES, c.SUSPENDED_AFTER_MINUTES])
      .toEqual([1, 3, 3, 6, 60]);
  });
});
