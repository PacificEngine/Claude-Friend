// Pure: where the pet sprite sits relative to its resting spot this frame.
export function petOffset(pet, frame) {
  if (pet.stage === 'dead' || pet.asleep) return { dx: 0, dy: 0 };
  if (pet.sick) return { dx: frame % 2 === 0 ? -1 : 1, dy: 0 };
  return { dx: 0, dy: frame % 2 };
}
