import { describe, it, expect } from 'vitest';
import { SPRITES, ICONS, spriteFor } from '../src/ui/sprites.js';

const isRectangular = (rows) => rows.every((r) => r.length === rows[0].length && /^[#.]+$/.test(r));

describe('sprites', () => {
  it('every character and stage sprite is a 16x16 bitmap', () => {
    for (const [name, rows] of Object.entries(SPRITES)) {
      expect(rows.length, `${name} height`).toBe(16);
      expect(isRectangular(rows), `${name} rectangular`).toBe(true);
      expect(rows[0].length, `${name} width`).toBe(16);
    }
  });

  it('every icon is a rectangular bitmap', () => {
    for (const [name, rows] of Object.entries(ICONS)) {
      expect(isRectangular(rows), name).toBe(true);
    }
  });

  it('picks sprites by stage, using the character from teen onwards', () => {
    expect(spriteFor({ stage: 'egg' })).toBe(SPRITES.egg);
    expect(spriteFor({ stage: 'child' })).toBe(SPRITES.child);
    expect(spriteFor({ stage: 'dead' })).toBe(SPRITES.dead);
    expect(spriteFor({ stage: 'teen', character: 'mochi' })).toBe(SPRITES.mochi);
    expect(spriteFor({ stage: 'adult', character: 'sparky' })).toBe(SPRITES.sparky);
  });
});
