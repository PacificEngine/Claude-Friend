import { describe, it, expect } from 'vitest';
import { createPet } from '../src/engine/pet.js';
import { tick } from '../src/engine/tick.js';
import { never, petAt, ticks } from './helpers.js';

describe('tick: growth', () => {
  it('ages the egg one minute per tick and hatches at 5 minutes', () => {
    const almost = ticks(createPet(), 4);
    expect(almost).toMatchObject({ stage: 'egg', ageMinutes: 4 });
    expect(tick(almost, never)).toMatchObject({ stage: 'baby', ageMinutes: 5 });
  });

  it('does not mutate its input', () => {
    const before = createPet();
    const snapshot = JSON.stringify(before);
    tick(before, never);
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('leaves a dead pet unchanged', () => {
    const dead = petAt('adult', { stage: 'dead' });
    expect(tick(dead, never)).toBe(dead);
  });

  it('picks the teen character from care history', () => {
    const teen = tick(petAt('child', { ageMinutes: 1439, careMistakes: 0, discipline: 3 }), never);
    expect(teen).toMatchObject({ stage: 'teen', character: 'sparky' });
  });

  it('picks the adult character from care history', () => {
    const adult = tick(petAt('teen', { ageMinutes: 4319, careMistakes: 9 }), never);
    expect(adult).toMatchObject({ stage: 'adult', character: 'grumble' });
  });
});
