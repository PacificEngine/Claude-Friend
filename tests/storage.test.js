import { describe, it, expect } from 'vitest';
import { save, load } from '../src/storage/storage.js';
import { createPet } from '../src/engine/pet.js';
import { MAX_OFFLINE_MINUTES } from '../src/engine/constants.js';
import { never, petAt } from './helpers.js';

const fakeStorage = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
  };
};
const MIN = 60000;

describe('storage', () => {
  it('starts a fresh egg when nothing is saved', () => {
    expect(load(0, never, fakeStorage())).toEqual(createPet());
  });

  it('round-trips state when no time has passed', () => {
    const storage = fakeStorage();
    const pet = petAt('child', { hunger: 2 });
    save(pet, 1000, storage);
    expect(load(1000, never, storage)).toEqual(pet);
  });

  it('replays elapsed real minutes through the engine', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 0, storage);
    expect(load(10 * MIN, never, storage).ageMinutes).toBe(5 + 10);
  });

  it('replays at the caller-supplied scale so offline matches the live loop', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 0, storage);
    expect(load(10 * 1000, never, storage, 1000).ageMinutes).toBe(5 + 10);
  });

  it('caps how much time is replayed after a long absence', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 0, storage);
    const loaded = load(100000 * MIN, never, storage);
    expect(loaded.ageMinutes).toBeLessThanOrEqual(5 + MAX_OFFLINE_MINUTES);
  });

  it('never replays negative time if the clock went backwards', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 5 * MIN, storage);
    expect(load(0, never, storage).ageMinutes).toBe(5);
  });

  it('falls back to a new egg on corrupt data', () => {
    expect(load(0, never, fakeStorage({ 'virtual-pet': '{not json' }))).toEqual(createPet());
    expect(load(0, never, fakeStorage({ 'virtual-pet': '{"state":{"stage":1},"savedAt":0}' }))).toEqual(createPet());
  });

  it('rejects a tampered stage that would break rendering', () => {
    const tampered = JSON.stringify({ state: { ...petAt('child'), stage: 'wizard' }, savedAt: 0 });
    expect(load(0, never, fakeStorage({ 'virtual-pet': tampered }))).toEqual(createPet());
  });

  it('accepts every real stage including dead', () => {
    for (const stage of ['egg', 'baby', 'child', 'teen', 'adult', 'dead']) {
      const storage = fakeStorage();
      save(petAt('child', { stage }), 0, storage);
      expect(load(0, never, storage).stage).toBe(stage);
    }
  });
});

describe('storage migration', () => {
  it('loads a save from before ignoredMinutes existed and ticks without NaN', () => {
    const { ignoredMinutes, ...old } = petAt('child', { sick: true });
    const storage = fakeStorage({ 'virtual-pet': JSON.stringify({ state: old, savedAt: 0 }) });
    const loaded = load(5 * MIN, never, storage);
    expect(loaded.ignoredMinutes).toBe(5);
    expect(Number.isNaN(loaded.careMistakes)).toBe(false);
  });
});
