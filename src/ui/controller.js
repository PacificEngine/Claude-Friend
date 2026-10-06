import { act } from '../engine/act.js';
import { createPet } from '../engine/pet.js';
import { ROUNDS, playGuess, scoreGame, applyGameResult } from '../engine/guess.js';

export const MENU = ['feed', 'light', 'play', 'medicine', 'clean', 'status', 'discipline'];
const FEED_ACTIONS = ['feed-meal', 'feed-snack'];
const GUESSES = ['left', 'right'];

export const createUi = () => ({ screen: 'main', menuIndex: 0, option: 0, rounds: [], result: null });

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
      return canPlay(pet) ? { ui: { ...ui, screen: 'guess', option: 0, rounds: [] }, pet } : { ui, pet };
    case 'light': return { ui, pet: act(pet, 'toggle-light') };
    default: return { ui, pet: act(pet, item) };
  }
}

function feed(ui, pet, button) {
  if (button === 'A') return toggleOption(ui, pet);
  if (button === 'B') return backToMain(ui, act(pet, FEED_ACTIONS[ui.option]));
  return backToMain(ui, pet);
}

function guess(ui, pet, button, rng) {
  if (button === 'A') return toggleOption(ui, pet);
  if (button === 'C') return backToMain(ui, pet);
  const rounds = [...ui.rounds, playGuess(GUESSES[ui.option], rng)];
  if (rounds.length < ROUNDS) return { ui: { ...ui, rounds }, pet };
  const result = scoreGame(rounds);
  return { ui: { ...ui, screen: 'result', rounds, result }, pet: applyGameResult(pet, result) };
}

const HANDLERS = { main, feed, guess, result: backToMain, status: backToMain };

export function press(ui, pet, button, rng) {
  if (pet.stage === 'dead') {
    const restart = ui.screen === 'main' && button === 'B';
    return { ui: createUi(), pet: restart ? createPet() : pet };
  }
  return HANDLERS[ui.screen](ui, pet, button, rng);
}
