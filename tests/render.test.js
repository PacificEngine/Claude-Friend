import { describe, it, expect } from 'vitest';
import { render, drawBitmap, LCD } from '../src/ui/render.js';
import { createUi } from '../src/ui/controller.js';
import { petAt } from './helpers.js';

// A canvas stand-in that records every filled rectangle.
function recorder() {
  const rects = [];
  return { rects, clearRect() {}, fillRect: (x, y, w, h) => rects.push({ x, y, w, h }) };
}

describe('drawBitmap', () => {
  it('draws one pixel per # at scale 1', () => {
    const ctx = recorder();
    drawBitmap(ctx, ['#.', '.#'], 3, 4);
    expect(ctx.rects).toEqual([{ x: 3, y: 4, w: 1, h: 1 }, { x: 4, y: 5, w: 1, h: 1 }]);
  });

  it('scales each pixel by an integer factor', () => {
    const ctx = recorder();
    drawBitmap(ctx, ['#.', '.#'], 3, 4, 3);
    expect(ctx.rects).toEqual([{ x: 3, y: 4, w: 3, h: 3 }, { x: 6, y: 7, w: 3, h: 3 }]);
  });
});

describe('render', () => {
  const ui = (over) => ({ ...createUi(), ...over });
  const screens = {
    play0: ui({ screen: 'play', option: 0 }),
    play1: ui({ screen: 'play', option: 1 }),
    highlow: ui({ screen: 'highlow', shown: 9, option: 1, rounds: [{ won: true }, { won: false }] }),
    highlowOne: ui({ screen: 'highlow', shown: 1, option: 0, rounds: [] }),
  };

  for (const [name, state] of Object.entries(screens)) {
    it(`${name} draws something, all inside the ${LCD}x${LCD} LCD`, () => {
      const ctx = recorder();
      render(ctx, petAt('child'), state, 0);
      expect(ctx.rects.length).toBeGreaterThan(0);
      for (const { x, y, w, h } of ctx.rects) {
        expect(x >= 0 && y >= 0 && x + w <= LCD && y + h <= LCD, JSON.stringify({ x, y, w, h })).toBe(true);
      }
    });
  }

  it('underlines the selected side differently on the play chooser', () => {
    const a = recorder();
    const b = recorder();
    render(a, petAt('child'), screens.play0, 0);
    render(b, petAt('child'), screens.play1, 0);
    expect(a.rects).not.toEqual(b.rects);
  });
});
