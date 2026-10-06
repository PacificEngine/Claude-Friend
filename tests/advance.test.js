import { describe, it, expect } from 'vitest';
import { advance } from '../src/engine/advance.js';
import { never, petAt, ticks } from './helpers.js';

describe('advance', () => {
  it('equals repeated ticks while the player is present all day', () => {
    const start = petAt('child');
    expect(advance(start, 30, never)).toEqual(ticks(start, 30));
  });

  it('assumes the light was turned off overnight, so no care mistake', () => {
    const start = petAt('child', { clock: 1319 });
    expect(ticks(start, 60).careMistakes).toBe(1);
    const away = advance(start, 60, never);
    expect(away.careMistakes).toBe(0);
    expect(away.asleep).toBe(true);
  });

  it('wakes the pet up again by morning', () => {
    const away = advance(petAt('child', { clock: 1319 }), 60 * 10, never);
    expect(away).toMatchObject({ asleep: false, lightOn: true });
  });
});
