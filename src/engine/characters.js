import {
  SPARKY_MAX_MISTAKES_PER_DAY, SPARKY_MIN_DISCIPLINE, BUBBLES_MAX_MISTAKES_PER_DAY,
  MOCHI_MAX_MISTAKES_PER_DAY, MINUTES_PER_DAY,
} from './constants.js';

// Judge care by mistakes per day lived, with a one-day floor so a young pet is not over-penalised.
export function chooseCharacter({ careMistakes, discipline, ageMinutes }) {
  const perDay = careMistakes / Math.max(1, ageMinutes / MINUTES_PER_DAY);
  if (perDay <= SPARKY_MAX_MISTAKES_PER_DAY && discipline >= SPARKY_MIN_DISCIPLINE) return 'sparky';
  if (perDay <= BUBBLES_MAX_MISTAKES_PER_DAY) return 'bubbles';
  if (perDay <= MOCHI_MAX_MISTAKES_PER_DAY) return 'mochi';
  return 'grumble';
}
