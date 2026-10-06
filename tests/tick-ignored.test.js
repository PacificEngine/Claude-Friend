import { describe, it, expect } from 'vitest';
import { petAt, ticks } from './helpers.js';
import { CARE_MISTAKE_GRACE } from '../src/engine/constants.js';

const calls = {
  sick: { sick: true },
  'two poops': { poop: 2 },
  misbehaving: { misbehaving: true },
};

describe('ignored calls', () => {
  for (const [name, call] of Object.entries(calls)) {
    it(`a ${name} call left unattended for the grace period is one care mistake`, () => {
      const s = ticks(petAt('child', call), CARE_MISTAKE_GRACE);
      expect(s.careMistakes).toBe(1);
    });
    it(`a ${name} call is not a mistake one tick before the grace period ends`, () => {
      expect(ticks(petAt('child', call), CARE_MISTAKE_GRACE - 1).careMistakes).toBe(0);
    });
  }

  it('counts the episode only once', () => {
    expect(ticks(petAt('child', { misbehaving: true }), CARE_MISTAKE_GRACE + 1).careMistakes).toBe(1);
  });

  it('answering the call resets the counter', () => {
    const waiting = ticks(petAt('child', { misbehaving: true }), 30);
    expect(waiting.ignoredMinutes).toBe(30);
    const answered = ticks({ ...waiting, misbehaving: false }, 1);
    expect(answered.ignoredMinutes).toBe(0);
    expect(ticks({ ...answered, misbehaving: true }, 59).careMistakes).toBe(0);
  });

  it('pauses while asleep with the light off', () => {
    const s = ticks(petAt('child', { sick: true, asleep: true, lightOn: false, clock: 1400 }), 60);
    expect(s).toMatchObject({ ignoredMinutes: 0, careMistakes: 0 });
  });
});
