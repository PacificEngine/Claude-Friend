import { MAX_HEARTS } from '../engine/constants.js';
import { ROUNDS } from '../engine/guess.js';
import { MENU } from './controller.js';

const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function screenSentence(ui) {
  switch (ui.screen) {
    case 'status': return 'Status screen open.';
    case 'feed': return 'Feed menu.';
    case 'play': return `Play menu: ${ui.option === 0 ? 'Left or Right' : 'Higher or Lower'} selected.`;
    case 'highlow': {
      const choice = ui.option === 0 ? 'higher' : 'lower';
      return `Higher or lower: number ${ui.shown}, round ${ui.rounds.length + 1} of ${ROUNDS}, guessing ${choice}.`;
    }
    case 'guess': return `Mini-game: round ${ui.rounds.length + 1} of ${ROUNDS}.`;
    case 'result': return 'Mini-game finished.';
    default: return `Menu: ${capitalise(MENU[ui.menuIndex])}.`;
  }
}

// Pure: a short sentence for screen readers describing what the canvas shows.
export function describePet(pet, ui) {
  if (pet.stage === 'egg') return 'An egg. It will hatch soon.';
  if (pet.stage === 'dead') return 'Your pet has died. Press B for a new egg.';
  const parts = [
    [pet.stage, pet.character].filter(Boolean).map(capitalise).join(' ') + '.',
    `Hunger ${pet.hunger} of ${MAX_HEARTS}, happiness ${pet.happiness} of ${MAX_HEARTS}.`,
  ];
  if (pet.asleep) parts.push(`Asleep, light ${pet.lightOn ? 'on' : 'off'}.`);
  if (pet.poop > 0) parts.push(`${pet.poop} poop ${pet.poop === 1 ? 'pile' : 'piles'}.`);
  if (pet.sick) parts.push('Sick.');
  if (pet.misbehaving) parts.push('Misbehaving.');
  if (pet.needsAttention) parts.push('Calling for attention.');
  parts.push(screenSentence(ui));
  return parts.join(' ');
}
