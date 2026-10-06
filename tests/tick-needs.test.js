import { describe, it, expect } from 'vitest';
import { tick } from '../src/engine/tick.js';
import { always, never, petAt, ticks } from './helpers.js';

describe('tick: needs', () => {
  it('loses a hunger heart every interval and a happiness heart offset from it', () => {
    const before = ticks(petAt('baby'), 24); // age 29
    expect(before.hunger).toBe(4);
    const after = ticks(petAt('baby'), 25);  // age 30
    expect(after.hunger).toBe(3);
    expect(after.happiness).toBe(3);          // lost at age 15
  });

  it('never drops below zero hearts', () => {
    const s = tick(petAt('baby', { ageMinutes: 29, hunger: 0 }), never);
    expect(s.hunger).toBe(0);
  });

  it('adds poop on the poop interval, up to the cap', () => {
    expect(tick(petAt('child', { ageMinutes: 449 }), never).poop).toBe(1);
    expect(tick(petAt('child', { ageMinutes: 449, poop: 4 }), never).poop).toBe(4);
  });

  it('can fall sick when the rng says so, and not otherwise', () => {
    expect(tick(petAt('child'), always).sick).toBe(true);
    expect(tick(petAt('child'), never).sick).toBe(false);
  });

  it('can start misbehaving when the rng says so, and not otherwise', () => {
    expect(tick(petAt('child'), always).misbehaving).toBe(true);
    expect(tick(petAt('child'), never).misbehaving).toBe(false);
  });

  it('raises the attention flag when a need hits zero', () => {
    expect(tick(petAt('child', { hunger: 0 }), never).needsAttention).toBe(true);
  });
});
