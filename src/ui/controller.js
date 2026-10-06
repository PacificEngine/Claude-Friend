import { act } from '../engine/act.js';
import { createPet } from '../engine/pet.js';
import { ROUNDS, playGuess, scoreGame, applyGameResult } from '../engine/guess.js';

export const MENU = ['feed', 'light', 'play', 'medicine', 'clean', 'status', 'discipline'];
const FEED_ACTIONS = ['feed-meal', 'feed-snack'];
const GUESSES = ['left', 'right'];

export const createUi = () => ({ screen: 'main', menuIndex: 0, option: 0, rounds: [], result: null, notice: null });

const DESCRIBERS = {
  'feed-meal': (b, a) => (a === b ? 'Not hungry' : 'Yum!'),
  'feed-snack': (b, a) => (a === b ? 'Not in the mood' : 'Tasty!'),
  clean: (b) => (b.poop === 0 ? 'Nothing to clean' : 'All clean!'),
  medicine: (b, a) => (!b.sick ? 'Not sick' : a.sick ? 'Needs another dose' : 'Feeling better!'),
  discipline: (b) => (b.misbehaving ? 'Learned a lesson' : 'No need to scold'),
  'toggle-light': (b, a) => (b.asleep ? (a.lightOn ? 'Light on' : 'Light off') : "It's daytime"),
};

// Pure: says what an action did (or why it did nothing), so no button feels dead.
export function describeAction(action, before, after) {
  if (before.stage === 'egg') return 'Still an egg…';
  if (before.stage === 'dead') return null;
  if (before.asleep && action !== 'toggle-light') return 'Zzz… sleeping';
  return DESCRIBERS[action]?.(before, after) ?? null;
}

function perform(ui, pet, action) {
  const after = act(pet, action);
  return { ui: { ...ui, notice: describeAction(action, pet, after) }, pet: after };
}

const playRefusal = (pet) =>
  pet.stage === 'egg' ? 'Still an egg…' : pet.asleep ? 'Zzz… sleeping' : 'Too sick to play';

const canPlay = (pet) => pet.stage !== 'egg' && pet.stage !== 'dead' && !pet.asleep && !pet.sick;
const backToMain = (ui, pet) => ({ ui: { ...ui, screen: 'main' }, pet });
const toggleOption = (ui, pet) => ({ ui: { ...ui, option: (ui.option + 1) % 2 }, pet });

function main(ui, pet, button) {
  if (button === 'A') return { ui: { ...ui, menuIndex: (ui.menuIndex + 1) % MENU.length }, pet };
  if (button !== 'B') return { ui, pet };
  const item = MENU[ui.menuIndex];
  switch (item) {
    case 'feed': return { ui: { ...ui, screen: 'feed', option: 0 }, pet };
    case 'status': return { ui: { ...ui, screen: 'status' }, pet };
    case 'play':
      return canPlay(pet)
        ? { ui: { ...ui, screen: 'guess', option: 0, rounds: [] }, pet }
        : { ui: { ...ui, notice: playRefusal(pet) }, pet };
    case 'light': return perform(ui, pet, 'toggle-light');
    default: return perform(ui, pet, item);
  }
}

function feed(ui, pet, button) {
  if (button === 'A') return toggleOption(ui, pet);
  if (button === 'B') {
    const done = perform(ui, pet, FEED_ACTIONS[ui.option]);
    return backToMain(done.ui, done.pet);
  }
  return backToMain(ui, pet);
}

function guess(ui, pet, button, rng) {
  if (button === 'A') return toggleOption(ui, pet);
  if (button === 'C') return backToMain(ui, pet);
  const rounds = [...ui.rounds, playGuess(GUESSES[ui.option], rng)];
  if (rounds.length < ROUNDS) return { ui: { ...ui, rounds }, pet };
  const result = scoreGame(rounds);
  const notice = result.won ? 'You win! 😊' : 'You lose…';
  return { ui: { ...ui, screen: 'result', rounds, result, notice }, pet: applyGameResult(pet, result) };
}

// Pure: should a tick that changed the pet close the open screen?
// A sick pet can't play, but may still check status or feed.
export function shouldResetScreen(pet, ui) {
  if (ui.screen === 'main') return false;
  if (pet.stage === 'dead' || pet.asleep) return true;
  return pet.sick && ui.screen === 'guess';
}

const HANDLERS = { main, feed, guess, result: backToMain, status: backToMain };

export function press(ui, pet, button, rng) {
  if (pet.stage === 'dead') {
    const restart = ui.screen === 'main' && button === 'B';
    return { ui: createUi(), pet: restart ? createPet() : pet };
  }
  return HANDLERS[ui.screen]({ ...ui, notice: null }, pet, button, rng);
}
