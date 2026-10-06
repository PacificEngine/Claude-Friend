import { describe, it, expect } from 'vitest';
import { chooseCharacter } from '../src/engine/characters.js';

describe('chooseCharacter', () => {
  it('rewards disciplined, attentive care with sparky', () => {
    expect(chooseCharacter({ careMistakes: 0, discipline: 3 })).toBe('sparky');
  });
  it('sparky tolerates one mistake but needs discipline 3', () => {
    expect(chooseCharacter({ careMistakes: 1, discipline: 3 })).toBe('sparky');
    expect(chooseCharacter({ careMistakes: 0, discipline: 2 })).toBe('bubbles');
    expect(chooseCharacter({ careMistakes: 2, discipline: 3 })).toBe('bubbles');
  });
  it('switches character exactly at the mistake boundaries', () => {
    expect(chooseCharacter({ careMistakes: 3, discipline: 0 })).toBe('bubbles');
    expect(chooseCharacter({ careMistakes: 4, discipline: 0 })).toBe('mochi');
    expect(chooseCharacter({ careMistakes: 6, discipline: 0 })).toBe('mochi');
    expect(chooseCharacter({ careMistakes: 7, discipline: 0 })).toBe('grumble');
  });
  it('gives bubbles for decent care without discipline', () => {
    expect(chooseCharacter({ careMistakes: 0, discipline: 0 })).toBe('bubbles');
    expect(chooseCharacter({ careMistakes: 3, discipline: 4 })).toBe('bubbles');
  });
  it('gives mochi for mediocre care', () => {
    expect(chooseCharacter({ careMistakes: 5, discipline: 4 })).toBe('mochi');
  });
  it('gives grumble for poor care', () => {
    expect(chooseCharacter({ careMistakes: 7, discipline: 4 })).toBe('grumble');
  });
});
