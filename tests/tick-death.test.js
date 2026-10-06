import { describe, it, expect } from 'vitest';
import { tick } from '../src/engine/tick.js';
import { OLD_AGE } from '../src/engine/constants.js';
import { never, petAt } from './helpers.js';

describe('tick: neglect and death', () => {
  it('records one care mistake after the grace period at zero hearts', () => {
    const s = tick(petAt('child', { hunger: 0, lowMinutes: 59 }), never);
    expect(s.careMistakes).toBe(1);
    expect(tick(s, never).careMistakes).toBe(1); // only once per episode
  });

  it('resets the low counter once needs recover', () => {
    const s = tick(petAt('child', { lowMinutes: 30 }), never);
    expect(s.lowMinutes).toBe(0);
  });

  it('dies after sustained starvation', () => {
    expect(tick(petAt('child', { hunger: 0, neglectMinutes: 719 }), never).stage).toBe('dead');
  });

  it('dies after sustained untreated sickness', () => {
    expect(tick(petAt('child', { sick: true, neglectMinutes: 719 }), never).stage).toBe('dead');
  });

  it('recovers from neglect when fed and healthy', () => {
    expect(tick(petAt('child', { neglectMinutes: 100 }), never).neglectMinutes).toBe(0);
  });

  it('dies of old age as an adult', () => {
    expect(tick(petAt('adult', { ageMinutes: OLD_AGE - 1 }), never).stage).toBe('dead');
  });

  it('keeps its character after death', () => {
    const s = tick(petAt('adult', { character: 'mochi', ageMinutes: OLD_AGE - 1 }), never);
    expect(s).toMatchObject({ stage: 'dead', character: 'mochi' });
  });

  it('wakes and lights up a pet that dies asleep so its death is visible', () => {
    const s = tick(petAt('adult', { asleep: true, lightOn: false, clock: 1400, ageMinutes: OLD_AGE - 1 }), never);
    expect(s).toMatchObject({ stage: 'dead', asleep: false, lightOn: true });
  });

  it('pauses neglect while asleep with the light off', () => {
    const before = petAt('child', { asleep: true, lightOn: false, clock: 1400, hunger: 0, sick: true, neglectMinutes: 100, lowMinutes: 10 });
    const s = tick(before, never);
    expect(s).toMatchObject({ neglectMinutes: 100, lowMinutes: 10 });
  });
});
