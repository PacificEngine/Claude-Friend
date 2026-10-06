import { describe, it, expect } from 'vitest';
import { pulseCoefficients, VOICES } from '../src/ui/music-synth.js';

describe('pulseCoefficients', () => {
  it('has no DC term and one entry per harmonic', () => {
    const { real, imag } = pulseCoefficients(0.25, 16);
    expect(real).toHaveLength(17);
    expect(imag).toHaveLength(17);
    expect(real[0]).toBe(0);
    expect(imag[0]).toBe(0);
  });

  it('a 50% pulse (square) has no even cosine harmonics and matches 1/n sine falloff', () => {
    const { real, imag } = pulseCoefficients(0.5, 8);
    expect(Math.abs(real[1])).toBeLessThan(1e-9);
    expect(imag[2]).toBeCloseTo(0, 6);
    expect(imag[1]).toBeCloseTo(2 / Math.PI, 6);
    expect(imag[3]).toBeCloseTo(2 / (3 * Math.PI), 6);
  });

  it('a 25% pulse keeps its 4th harmonic silent in magnitude (chiptune hollowness)', () => {
    const { real, imag } = pulseCoefficients(0.25, 8);
    expect(Math.hypot(real[4], imag[4])).toBeCloseTo(0, 6);
    expect(Math.hypot(real[1], imag[1])).toBeGreaterThan(0.3);
  });
});

describe('VOICES', () => {
  it('describes every voice the score uses', () => {
    for (const v of ['lead', 'counter', 'arp', 'bass', 'soft', 'lull', 'hat', 'kick']) {
      expect(VOICES[v]).toBeDefined();
    }
  });
});
