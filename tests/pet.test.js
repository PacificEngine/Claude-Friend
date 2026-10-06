import { describe, it, expect } from 'vitest';
import { createPet, stageForAge, isNight, withAttention, clamp } from '../src/engine/pet.js';

describe('createPet', () => {
  it('starts as a healthy, fed egg in the morning', () => {
    const pet = createPet();
    expect(pet).toMatchObject({
      stage: 'egg', character: null, ageMinutes: 0, hunger: 4, happiness: 4,
      discipline: 0, poop: 0, sick: false, asleep: false, lightOn: true,
      careMistakes: 0, needsAttention: false,
    });
  });
});

describe('stageForAge', () => {
  it('maps age thresholds to stages', () => {
    expect(stageForAge(0)).toBe('egg');
    expect(stageForAge(4)).toBe('egg');
    expect(stageForAge(5)).toBe('baby');
    expect(stageForAge(360)).toBe('child');
    expect(stageForAge(1440)).toBe('teen');
    expect(stageForAge(4320)).toBe('adult');
  });
});

describe('isNight', () => {
  it('is night from 22:00 until 07:00', () => {
    expect(isNight(1319)).toBe(false);
    expect(isNight(1320)).toBe(true);
    expect(isNight(0)).toBe(true);
    expect(isNight(419)).toBe(true);
    expect(isNight(420)).toBe(false);
  });
});

describe('clamp', () => {
  it('keeps hearts within 0..4', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(9)).toBe(4);
    expect(clamp(2)).toBe(2);
  });
});

describe('withAttention', () => {
  const base = { ...createPet(), stage: 'child' };
  it('flags hunger, unhappiness, sickness, poop and misbehaving', () => {
    expect(withAttention({ ...base, hunger: 0 }).needsAttention).toBe(true);
    expect(withAttention({ ...base, happiness: 0 }).needsAttention).toBe(true);
    expect(withAttention({ ...base, sick: true }).needsAttention).toBe(true);
    expect(withAttention({ ...base, poop: 2 }).needsAttention).toBe(true);
    expect(withAttention({ ...base, misbehaving: true }).needsAttention).toBe(true);
  });
  it('does not call when fine, asleep, an egg or dead', () => {
    expect(withAttention(base).needsAttention).toBe(false);
    const { misbehaving, ...partial } = base;
    expect(withAttention(partial).needsAttention).toBe(false);
    expect(withAttention({ ...base, hunger: 0, asleep: true, lightOn: false }).needsAttention).toBe(false);
    expect(withAttention({ ...base, stage: 'egg', hunger: 0 }).needsAttention).toBe(false);
    expect(withAttention({ ...base, stage: 'dead', hunger: 0 }).needsAttention).toBe(false);
  });
  it('calls when asleep with the light still on', () => {
    expect(withAttention({ ...base, asleep: true, lightOn: true }).needsAttention).toBe(true);
    expect(withAttention({ ...base, stage: 'egg', asleep: true, lightOn: true }).needsAttention).toBe(false);
  });
});
