import { describe, it, expect } from 'vitest';
import { runLife, POLICIES, ACTION_NAMES, classifyMistakes, summarise } from '../scripts/simulate.js';
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

  it('classifies a care mistake by the state that triggered it', () => {
    expect(classifyMistakes({ clock: 1350, ignoredMinutes: 3, lowMinutes: 0 }, 1)).toEqual(['light']);
    expect(classifyMistakes({ clock: 600, ignoredMinutes: 60, lowMinutes: 0 }, 1)).toEqual(['ignored call']);
    expect(classifyMistakes({ clock: 600, ignoredMinutes: 0, lowMinutes: 60 }, 1)).toEqual(['zero hearts']);
    expect(classifyMistakes({ clock: 600, ignoredMinutes: 0, lowMinutes: 0 }, 1)).toEqual(['other']);
    expect(classifyMistakes({ clock: 600, ignoredMinutes: 60, lowMinutes: 60 }, 2))
      .toEqual(['ignored call', 'zero hearts']);
  });

  it('records mistakes by cause and at the teen and adult moments', () => {
    const life = runLife(POLICIES.casual, 3);
    const total = Object.values(life.causes).reduce((a, b) => a + b, 0);
    expect(total).toBe(life.careMistakes);
    expect(life.atTeen.ageDays).toBe(1);
    expect(life.atAdult.ageDays).toBe(3);
    expect(life.atAdult.careMistakes).toBeGreaterThanOrEqual(life.atTeen.careMistakes);
    expect(runLife(POLICIES.neglectful, 3).atTeen).toBeNull();
  });

  it('prints the new per-bot lines', () => {
    const text = summarise('casual', [runLife(POLICIES.casual, 3), runLife(POLICIES.neglectful, 3)]);
    expect(text).toMatch(/mistakes by cause:\s+light=.*ignored call=.*zero hearts=.*other=/);
    expect(text).toMatch(/mistakes at teen:\s+mean .*age .* days/);
    expect(text).toMatch(/mistakes at adult:\s+mean .*age .* days/);
  });

  describe('balance targets (30 fixed seeds, deterministic bots)', () => {
    const lives = (policy) => Array.from({ length: 30 }, (_, i) => runLife(POLICIES[policy], i + 1));
    const share = (xs, pred) => xs.filter(pred).length / xs.length;

    it('attentive caretakers get sparky at least 95% of the time', () => {
      expect(share(lives('attentive'), (l) => l.character === 'sparky')).toBeGreaterThanOrEqual(0.95);
    });

    it('casual caretakers mostly get bubbles or mochi, and grumble at most 25%', () => {
      const casual = lives('casual');
      expect(share(casual, (l) => l.character === 'bubbles' || l.character === 'mochi')).toBeGreaterThanOrEqual(0.7);
      expect(share(casual, (l) => l.character === 'grumble')).toBeLessThanOrEqual(0.25);
    });

    it('neglectful caretakers die before getting a character', () => {
      for (const l of lives('neglectful')) {
        expect(l.dead).toBe(true);
        expect(l.character).toBeNull();
      }
    });
  });
});
