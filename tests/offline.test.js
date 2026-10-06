import { describe, it, expect } from 'vitest';
import { save, load, loadPet } from '../src/storage/storage.js';
import { MAX_OFFLINE_MINUTES, DEATH_NEGLECT } from '../src/engine/constants.js';
import { never, petAt } from './helpers.js';

const fakeStorage = () => {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    raw: () => JSON.parse(data['virtual-pet']),
  };
};
const MIN = 60000;
const HOUR = 60;
const hearts = (p) => p.hunger + p.happiness;
// A child at 08:00, saved at t=0 and reopened `minutes` real minutes later.
const awayFor = (pet, minutes) => {
  const storage = fakeStorage();
  save(pet, 0, storage);
  return load(minutes * MIN, never, storage);
};

describe('neglect accrues while the player is away', () => {
  const hungryAndSick = petAt('child', { hunger: 1, happiness: 3, sick: true });

  it('a hungry, sick pet returns with more neglect, more care mistakes and fewer hearts', () => {
    const back = awayFor(hungryAndSick, 6 * HOUR);
    expect(back.neglectMinutes).toBeGreaterThan(hungryAndSick.neglectMinutes);
    expect(back.careMistakes).toBeGreaterThan(hungryAndSick.careMistakes);
    expect(hearts(back)).toBeLessThan(hearts(hungryAndSick));
    expect(back.stage).not.toBe('dead');
  });

  it('comes back dead after DEATH_NEGLECT awake neglect minutes away', () => {
    const back = awayFor(petAt('child', { hunger: 0, sick: true }), DEATH_NEGLECT);
    expect(back.stage).toBe('dead');
  });

  it('is still alive one minute short of that', () => {
    const back = awayFor(petAt('child', { hunger: 0, sick: true }), DEATH_NEGLECT - 1);
    expect(back.stage).not.toBe('dead');
  });
});

describe('a cared-for pet away overnight', () => {
  const wellFed = petAt('child', { clock: 1200, lightOn: true }); // 20:00

  it('is asleep with the light assumed off, with no light care mistake, and alive', () => {
    const back = awayFor(wellFed, 10 * HOUR); // wakes at 07:00, so this is 06:00
    expect(back.asleep).toBe(true);
    expect(back.lightOn).toBe(false);
    expect(back.careMistakes).toBe(0);
    expect(back.stage).not.toBe('dead');
  });

  it('is awake again with no care mistakes once the night is over', () => {
    const back = awayFor(wellFed, 11 * HOUR); // 07:00 sharp
    expect(back.asleep).toBe(false);
    expect(back.careMistakes).toBe(0);
    expect(back.stage).not.toBe('dead');
  });
});

describe('offline cap', () => {
  it('a longer absence replays no more than MAX_OFFLINE_MINUTES', () => {
    const pet = petAt('baby');
    expect(awayFor(pet, MAX_OFFLINE_MINUTES + 5000)).toEqual(awayFor(pet, MAX_OFFLINE_MINUTES));
  });

  it('restarts the live clock now rather than owing the capped time', () => {
    const storage = fakeStorage();
    save(petAt('baby'), 0, storage);
    const now = (MAX_OFFLINE_MINUTES + 5000) * MIN;
    expect(loadPet(now, never, storage, MIN).lastTick).toBe(now);
  });
});

describe('saved JSON', () => {
  const FIELDS = [
    'stage', 'hunger', 'happiness', 'discipline', 'weight', 'poop', 'sick', 'asleep',
    'lightOn', 'careMistakes', 'neglectMinutes', 'ignoredMinutes', 'ageMinutes', 'clock',
  ];

  it('contains the full pet state and the save time', () => {
    const storage = fakeStorage();
    save(petAt('teen'), 4242, storage);
    const saved = storage.raw();
    expect(saved.savedAt).toBe(4242);
    for (const f of FIELDS) expect(saved.state).toHaveProperty(f);
  });

  it('round-trips an unusual pet through JSON without loss', () => {
    const pet = petAt('teen', {
      hunger: 1, happiness: 2, discipline: 3, weight: 9, poop: 3, sick: true, doses: 1,
      asleep: true, lightOn: false, misbehaving: true, careMistakes: 4, lowMinutes: 17,
      ignoredMinutes: 23, neglectMinutes: 31, ageMinutes: 2000, clock: 1400, character: 'sparky',
    });
    const storage = fakeStorage();
    save(pet, 0, storage);
    expect(JSON.parse(JSON.stringify(storage.raw().state))).toEqual(pet);
    expect(load(0, never, storage)).toEqual({ ...pet, needsAttention: pet.needsAttention });
  });
});
