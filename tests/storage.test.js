import { describe, it, expect } from 'vitest';
import { save, load, loadPet } from '../src/storage/storage.js';
import { createPet, withAttention } from '../src/engine/pet.js';
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

describe('loadPet tick baseline', () => {
  it('keeps the unreplayed fraction of a minute owed: 90 s away replays 1 minute', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 1000, storage);
    const { pet, lastTick } = loadPet(1000 + 90000, never, storage, MIN);
    expect(pet.ageMinutes).toBe(5 + 1);
    expect(lastTick).toBe(1000 + MIN);
  });

  it('starts the clock now on a fresh start', () => {
    expect(loadPet(5000, never, fakeStorage()).lastTick).toBe(5000);
  });

  it('starts the clock now on corrupt data', () => {
    expect(loadPet(5000, never, fakeStorage({ 'virtual-pet': '{nope' })).lastTick).toBe(5000);
  });

  it('starts the clock now after an absence beyond the offline cap', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 0, storage);
    const now = (MAX_OFFLINE_MINUTES + 10) * MIN + 30000;
    expect(loadPet(now, never, storage, MIN).lastTick).toBe(now);
  });

  it('starts the clock now if the clock went backwards', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 5 * MIN, storage);
    expect(loadPet(0, never, storage, MIN).lastTick).toBe(0);
  });

  it('load still returns just the pet', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 0, storage);
    expect(load(MIN, never, storage).ageMinutes).toBe(6);
  });
});

describe('save hardening', () => {
  const loadSaved = (state, savedAt = 0, now = 0) =>
    load(now, never, fakeStorage({ 'virtual-pet': JSON.stringify({ state, savedAt }) }));
  const fresh = createPet();

  it('round-trips a valid save with every field', () => {
    const pet = withAttention(petAt('teen', { character: 'mochi', hunger: 2, poop: 3, sick: true, doses: 1, clock: 100 }));
    expect(loadSaved(pet)).toEqual(pet);
  });

  it('loads an old save missing ignoredMinutes', () => {
    const { ignoredMinutes, ...old } = petAt('child');
    expect(loadSaved(old).stage).toBe('child');
  });

  const invalid = [
    ['stage', 'wizard'], ['stage', 1],
    ['character', 'dragon'], ['character', 5],
    ['ageMinutes', -1], ['ageMinutes', 'x'], ['ageMinutes', null],
    ['careMistakes', -1], ['lowMinutes', -3], ['neglectMinutes', 'a'], ['ignoredMinutes', -1],
    ['hunger', 5], ['hunger', -1], ['hunger', 1.5], ['hunger', '2'],
    ['happiness', 5], ['happiness', 0.5],
    ['discipline', 9], ['discipline', -1],
    ['weight', 0], ['weight', 'heavy'],
    ['poop', 5], ['poop', 1.5],
    ['doses', 3], ['doses', -1],
    ['clock', 1440], ['clock', -1], ['clock', 1.5],
    ['sick', 1], ['asleep', 'yes'], ['lightOn', null], ['misbehaving', 0],
  ];
  it.each(invalid)('treats %s = %j as invalid and starts a fresh egg', (key, value) => {
    expect(loadSaved({ ...petAt('child'), [key]: value })).toEqual(fresh);
  });

  it.each([NaN, Infinity])('rejects non-finite number %s via JSON null', (n) => {
    // JSON.stringify turns NaN/Infinity into null, which is not a finite number.
    expect(loadSaved({ ...petAt('child'), hunger: n })).toEqual(fresh);
  });

  it('drops unknown keys', () => {
    const loaded = loadSaved({ ...petAt('child'), evil: 1 });
    expect(loaded).not.toHaveProperty('evil');
  });

  it('does not let __proto__ pollute the pet or Object.prototype', () => {
    const raw = '{"state":' + JSON.stringify(petAt('child')).replace('{', '{"__proto__":{"polluted":true},') + ',"savedAt":0}';
    const loaded = load(0, never, fakeStorage({ 'virtual-pet': raw }));
    expect(loaded.stage).toBe('child');
    expect(loaded.polluted).toBeUndefined();
    expect({}.polluted).toBeUndefined();
  });

  it('starts fresh when savedAt is not finite', () => {
    const storage = fakeStorage({ 'virtual-pet': JSON.stringify({ state: petAt('child'), savedAt: null }) });
    expect(load(0, never, storage)).toEqual(fresh);
  });

  it('starts fresh when state is an array or missing', () => {
    expect(loadSaved([])).toEqual(fresh);
    expect(loadSaved(null)).toEqual(fresh);
  });

  it('recomputes needsAttention instead of trusting it', () => {
    const loaded = loadSaved({ ...petAt('child'), sick: true, needsAttention: false });
    expect(loaded.needsAttention).toBe(true);
  });
});
