import { describe, it, expect } from 'vitest';
import { SPRITES, ICONS, DIGITS, spriteFor } from '../src/ui/sprites.js';

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
    expect(spriteFor({ stage: 'teen', character: 'sparky' })).toBe(SPRITES.sparky);
    expect(spriteFor({ stage: 'baby' })).toBe(SPRITES.baby);
  });

  it('adults get their own art, keyed <character>Adult', () => {
    for (const character of ['sparky', 'bubbles', 'mochi', 'grumble']) {
      expect(spriteFor({ stage: 'adult', character })).toBe(SPRITES[`${character}Adult`]);
      expect(SPRITES[`${character}Adult`], character).toBeDefined();
      expect(SPRITES[`${character}Adult`], character).not.toEqual(SPRITES[character]);
    }
  });

  it('has a 3x5 bitmap for every digit', () => {
    expect(Object.keys(DIGITS)).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    for (const [digit, rows] of Object.entries(DIGITS)) {
      expect(isRectangular(rows), digit).toBe(true);
      expect(rows.length, digit).toBe(5);
      expect(rows[0].length, digit).toBe(3);
    }
    expect(new Set(Object.values(DIGITS).map((r) => r.join())).size).toBe(10);
  });

  it('has 7x4 up and down arrows', () => {
    for (const name of ['arrowUp', 'arrowDown']) {
      expect(isRectangular(ICONS[name]), name).toBe(true);
      expect(ICONS[name].length, name).toBe(4);
      expect(ICONS[name][0].length, name).toBe(7);
    }
    expect(ICONS.arrowUp).not.toEqual(ICONS.arrowDown);
  });
});
