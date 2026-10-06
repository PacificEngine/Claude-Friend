import { describe, it, expect } from 'vitest';
import { MENU, createUi, press } from '../src/ui/controller.js';
import { petAt } from './helpers.js';

const low = () => 0.1; // left
const select = (ui, name) => ({ ...ui, menuIndex: MENU.indexOf(name) });

describe('controller', () => {
  it('button A cycles the menu icon and wraps', () => {
    let ui = createUi();
    const pet = petAt('child');
    for (let i = 0; i < MENU.length; i++) ({ ui } = press(ui, pet, 'A', low));
    expect(ui.menuIndex).toBe(0);
    ({ ui } = press(ui, pet, 'A', low));
    expect(ui.menuIndex).toBe(1);
  });

  it('feeding: B opens the feed screen, A picks a snack, B confirms', () => {
    let ui = createUi();
    let pet = petAt('child', { hunger: 2, happiness: 2 });
    ({ ui, pet } = press(ui, pet, 'B', low));
    expect(ui.screen).toBe('feed');
    ({ ui, pet } = press(ui, pet, 'A', low));
    ({ ui, pet } = press(ui, pet, 'B', low));
    expect(ui.screen).toBe('main');
    expect(pet.happiness).toBe(3);
    expect(pet.hunger).toBe(2);
  });

  it('feeding: C cancels without feeding', () => {
    let { ui, pet } = press(createUi(), petAt('child', { hunger: 2 }), 'B', low);
    ({ ui, pet } = press(ui, pet, 'C', low));
    expect(ui.screen).toBe('main');
    expect(pet.hunger).toBe(2);
  });

  it('cleaning, medicine, discipline and light run engine actions directly', () => {
    const pet = petAt('child', { poop: 2 });
    const { pet: cleaned } = press(select(createUi(), 'clean'), pet, 'B', low);
    expect(cleaned.poop).toBe(0);
    const asleep = petAt('child', { asleep: true, lightOn: true });
    const { pet: dark } = press(select(createUi(), 'light'), asleep, 'B', low);
    expect(dark.lightOn).toBe(false);
  });

  it('status screen opens and any button closes it', () => {
    let { ui, pet } = press(select(createUi(), 'status'), petAt('child'), 'B', low);
    expect(ui.screen).toBe('status');
    ({ ui } = press(ui, pet, 'C', low));
    expect(ui.screen).toBe('main');
  });

  it('plays three guessing rounds and rewards a win', () => {
    let { ui, pet } = press(select(createUi(), 'play'), petAt('child', { happiness: 2 }), 'B', low);
    expect(ui.screen).toBe('guess');
    for (let i = 0; i < 3; i++) ({ ui, pet } = press(ui, pet, 'B', low)); // choice left, rng left
    expect(ui.screen).toBe('result');
    expect(ui.result.won).toBe(true);
    expect(pet.happiness).toBe(3);
    ({ ui } = press(ui, pet, 'B', low));
    expect(ui.screen).toBe('main');
  });

  it('refuses to play when sick, asleep or an egg', () => {
    for (const pet of [petAt('child', { sick: true }), petAt('child', { asleep: true }), petAt('egg')]) {
      const { ui } = press(select(createUi(), 'play'), pet, 'B', low);
      expect(ui.screen).toBe('main');
    }
  });

  it('B on a dead pet starts a new egg', () => {
    const { pet, ui } = press(createUi(), petAt('adult', { stage: 'dead' }), 'B', low);
    expect(pet.stage).toBe('egg');
    expect(ui.screen).toBe('main');
  });

  it('B on the main screen restarts a dead pet with a new egg', () => {
    const { pet } = press(createUi(), petAt('adult', { stage: 'dead' }), 'B', low);
    expect(pet.stage).toBe('egg');
  });

  it('any other press on a dead pet just returns to main without restarting', () => {
    const dead = petAt('adult', { stage: 'dead' });
    const feedUi = { ...createUi(), screen: 'feed' };
    const result = press(feedUi, dead, 'B', low);
    expect(result.pet).toBe(dead);
    expect(result.ui.screen).toBe('main');
  });
});
