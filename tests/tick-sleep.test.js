import { describe, it, expect } from 'vitest';
import { tick } from '../src/engine/tick.js';
import { never, petAt } from './helpers.js';

describe('tick: sleep', () => {
  it('falls asleep at bedtime', () => {
    expect(tick(petAt('child', { clock: 1319 }), never).asleep).toBe(true);
  });

  it('wakes in the morning with the light back on', () => {
    const s = tick(petAt('child', { clock: 419, asleep: true, lightOn: false }), never);
    expect(s).toMatchObject({ asleep: false, lightOn: true });
  });

  it('does not decay or poop while asleep with the light off', () => {
    const s = tick(petAt('child', { ageMinutes: 404, clock: 1400, asleep: true, lightOn: false }), never);
    expect(s.hunger).toBe(4); // age 405 would normally cost a heart
  });

  it('charges a care mistake if the light is still on at 22:30', () => {
    const s = tick(petAt('child', { clock: 1349, asleep: true, lightOn: true }), never);
    expect(s.careMistakes).toBe(1);
  });

  it('charges nothing if the light was turned off', () => {
    const s = tick(petAt('child', { clock: 1349, asleep: true, lightOn: false }), never);
    expect(s.careMistakes).toBe(0);
  });
});
