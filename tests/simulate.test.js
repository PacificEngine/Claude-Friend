import { describe, it, expect } from 'vitest';
import { runLife, POLICIES, ACTION_NAMES } from '../scripts/simulate.js';
import { createPet } from '../src/engine/pet.js';

const seeds = Array.from({ length: 20 }, (_, i) => i + 1);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('simulation', () => {
  it('is deterministic for a given seed and policy', () => {
    for (const policy of Object.values(POLICIES)) {
      expect(runLife(policy, 7)).toEqual(runLife(policy, 7));
    }
  });

  it('gives different lives for different seeds', () => {
    const lives = seeds.map((s) => runLife(POLICIES.casual, s).ageMinutes);
    expect(new Set(lives).size).toBeGreaterThan(1);
  });

  it('attentive caretakers outlive neglectful ones on average', () => {
    const life = (p) => mean(seeds.map((s) => runLife(POLICIES[p], s).ageMinutes));
    expect(life('attentive')).toBeGreaterThan(life('neglectful'));
  });

  it('every run terminates within maxMinutes', () => {
    for (const policy of Object.values(POLICIES)) {
      for (const seed of seeds) expect(runLife(policy, seed, 5000).ageMinutes).toBeLessThanOrEqual(5000);
    }
  });

  it('policies only return known action names', () => {
    let pet = createPet();
    const probes = [
      { ...pet, stage: 'child', hunger: 0, happiness: 0, poop: 3, sick: true, misbehaving: true, clock: 480 },
      { ...pet, stage: 'child', asleep: true, lightOn: true, clock: 1400 },
      { ...pet, stage: 'child', clock: 785 },
    ];
    for (const policy of Object.values(POLICIES)) {
      for (const p of probes) {
        for (const a of policy(p)) expect(ACTION_NAMES).toContain(a);
      }
    }
  });
});
