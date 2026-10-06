import { describe, it, expect } from 'vitest';
import { petOffset } from '../src/ui/pose.js';
import { petAt } from './helpers.js';

describe('petOffset', () => {
  it('a healthy pet bobs vertically', () => {
    const pet = petAt('child');
    expect(petOffset(pet, 0)).toEqual({ dx: 0, dy: 0 });
    expect(petOffset(pet, 1)).toEqual({ dx: 0, dy: 1 });
  });
  it('a sick pet shivers sideways instead of bobbing', () => {
    const pet = petAt('child', { sick: true });
    expect(petOffset(pet, 0)).toEqual({ dx: -1, dy: 0 });
    expect(petOffset(pet, 1)).toEqual({ dx: 1, dy: 0 });
  });
  it('a sleeping pet does not move', () => {
    expect(petOffset(petAt('child', { asleep: true, sick: true }), 1)).toEqual({ dx: 0, dy: 0 });
  });
  it('a dead pet does not move', () => {
    expect(petOffset(petAt('adult', { stage: 'dead', sick: true }), 1)).toEqual({ dx: 0, dy: 0 });
  });
});
