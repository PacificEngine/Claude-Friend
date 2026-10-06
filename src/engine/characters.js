import {
  SPARKY_MAX_MISTAKES, SPARKY_MIN_DISCIPLINE, BUBBLES_MAX_MISTAKES, MOCHI_MAX_MISTAKES,
} from './constants.js';

export function chooseCharacter({ careMistakes, discipline }) {
  if (careMistakes <= SPARKY_MAX_MISTAKES && discipline >= SPARKY_MIN_DISCIPLINE) return 'sparky';
  if (careMistakes <= BUBBLES_MAX_MISTAKES) return 'bubbles';
  if (careMistakes <= MOCHI_MAX_MISTAKES) return 'mochi';
  return 'grumble';
}
