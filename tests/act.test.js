import { describe, it, expect } from 'vitest';
import { act } from '../src/engine/act.js';
import { petAt } from './helpers.js';

describe('act', () => {
  it('ignores actions on eggs and dead pets', () => {
    const egg = petAt('egg');
    const dead = petAt('adult', { stage: 'dead' });
    expect(act(egg, 'feed-meal')).toBe(egg);
    expect(act(dead, 'clean')).toBe(dead);
  });

  it('throws on unknown actions', () => {
    expect(() => act(petAt('child'), 'dance')).toThrow('Unknown action: dance');
  });

  it('a meal restores a hunger heart and adds weight, up to the cap', () => {
    expect(act(petAt('child', { hunger: 2, weight: 10 }), 'feed-meal')).toMatchObject({ hunger: 3, weight: 11 });
    expect(act(petAt('child', { hunger: 4, weight: 10 }), 'feed-meal').weight).toBe(10);
  });

  it('a snack restores happiness and adds more weight', () => {
    expect(act(petAt('child', { happiness: 1, weight: 10 }), 'feed-snack')).toMatchObject({ happiness: 2, weight: 12 });
  });

  it('play raises happiness and lowers weight but never below 1', () => {
    expect(act(petAt('child', { happiness: 2, weight: 10 }), 'play')).toMatchObject({ happiness: 3, weight: 9 });
    expect(act(petAt('child', { happiness: 2, weight: 1 }), 'play').weight).toBe(1);
  });

  it('a sick pet will not play', () => {
    const sick = petAt('child', { happiness: 2, sick: true });
    expect(act(sick, 'play')).toEqual(sick);
  });

  it('cleaning removes all poop and clears the attention call', () => {
    const s = act(petAt('child', { poop: 3, needsAttention: true }), 'clean');
    expect(s).toMatchObject({ poop: 0, needsAttention: false });
  });

  it('medicine needs two doses to cure', () => {
    const once = act(petAt('child', { sick: true }), 'medicine');
    expect(once).toMatchObject({ sick: true, doses: 1 });
    expect(act(once, 'medicine')).toMatchObject({ sick: false, doses: 0 });
  });

  it('medicine does nothing for a healthy pet', () => {
    const s = petAt('child');
    expect(act(s, 'medicine')).toEqual(s);
  });

  it('discipline only works on a misbehaving pet', () => {
    const bad = act(petAt('child', { misbehaving: true, discipline: 1 }), 'discipline');
    expect(bad).toMatchObject({ misbehaving: false, discipline: 2 });
    const good = petAt('child', { discipline: 1 });
    expect(act(good, 'discipline')).toEqual(good);
  });

  it('toggles the light only while asleep', () => {
    expect(act(petAt('child', { asleep: true, lightOn: true }), 'toggle-light').lightOn).toBe(false);
    expect(act(petAt('child'), 'toggle-light').lightOn).toBe(true);
  });

  it('ignores feeding while asleep', () => {
    const s = petAt('child', { hunger: 1, asleep: true });
    expect(act(s, 'feed-meal').hunger).toBe(1);
  });
});
