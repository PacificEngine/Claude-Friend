export function chooseCharacter({ careMistakes, discipline }) {
  if (careMistakes <= 1 && discipline >= 3) return 'sparky';
  if (careMistakes <= 3) return 'bubbles';
  if (careMistakes <= 6) return 'mochi';
  return 'grumble';
}
