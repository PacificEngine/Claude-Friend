import { describe, it, expect } from 'vitest';
import { buildLoop, moodFor, PENTATONIC_PITCH_CLASSES } from '../src/ui/music-score.js';
import { petAt } from './helpers.js';

const pitchClass = (freq) => (((Math.round(12 * Math.log2(freq / 440)) + 69) % 12) + 12) % 12;
const EPS = 1e-9;

describe.each(['awake', 'sleep'])('buildLoop(%s)', (mood) => {
  const loop = buildLoop(mood);

  it('has notes and a positive length', () => {
    expect(loop.lengthSeconds).toBeGreaterThan(0);
    expect(loop.notes.length).toBeGreaterThan(0);
  });

  it('keeps every note inside the loop', () => {
    for (const n of loop.notes) {
      expect(n.time).toBeGreaterThanOrEqual(0);
      expect(n.time).toBeLessThan(loop.lengthSeconds);
      expect(n.time + n.duration).toBeLessThanOrEqual(loop.lengthSeconds + EPS);
      expect(n.duration).toBeGreaterThan(0);
    }
  });

  it('stays in an audible range with valid voices and gains', () => {
    for (const n of loop.notes) {
      expect(n.freq).toBeGreaterThanOrEqual(80);
      expect(n.freq).toBeLessThanOrEqual(1500);
      expect(['lead', 'bass']).toContain(n.voice);
      expect(n.gain).toBeGreaterThan(0);
      expect(n.gain).toBeLessThanOrEqual(1);
    }
  });

  it('uses only major pentatonic pitch classes', () => {
    expect(PENTATONIC_PITCH_CLASSES).toEqual([0, 2, 4, 7, 9]);
    for (const n of loop.notes) expect(PENTATONIC_PITCH_CLASSES).toContain(pitchClass(n.freq));
  });

  it('has both a lead and a bass voice', () => {
    expect(new Set(loop.notes.map((n) => n.voice))).toEqual(new Set(['lead', 'bass']));
  });

  it('is deterministic', () => {
    expect(buildLoop(mood)).toEqual(loop);
  });
});

describe('awake vs sleep', () => {
  const awake = buildLoop('awake');
  const sleep = buildLoop('sleep');
  const maxGain = (loop) => Math.max(...loop.notes.map((n) => n.gain));
  const lowestLead = (loop) => Math.min(...loop.notes.filter((n) => n.voice === 'lead').map((n) => n.freq));

  it('awake is 8 bars of 4/4 at 96 BPM', () => {
    expect(awake.lengthSeconds).toBeCloseTo((8 * 4 * 60) / 96);
  });

  it('sleep is 8 bars at 60 BPM, so slower', () => {
    expect(sleep.lengthSeconds).toBeCloseTo((8 * 4 * 60) / 60);
    expect(sleep.lengthSeconds).toBeGreaterThan(awake.lengthSeconds);
  });

  it('sleep is sparser, quieter and lower', () => {
    expect(sleep.notes.length / sleep.lengthSeconds).toBeLessThan(awake.notes.length / awake.lengthSeconds);
    expect(maxGain(sleep)).toBeLessThan(maxGain(awake));
    expect(lowestLead(sleep)).toBeLessThan(lowestLead(awake));
  });
});

describe('buildLoop with an unknown mood', () => {
  it('throws rather than playing something unexpected', () => {
    expect(() => buildLoop('silent')).toThrow();
  });
});

describe('moodFor', () => {
  it('is silent for an egg', () => expect(moodFor(petAt('egg'))).toBe('silent'));
  it('is silent for a dead pet', () => expect(moodFor(petAt('dead'))).toBe('silent'));
  it('is sleep for a sleeping pet', () => expect(moodFor(petAt('child', { asleep: true }))).toBe('sleep'));
  it('is awake otherwise', () => expect(moodFor(petAt('baby'))).toBe('awake'));
  it('is silent for a dead pet even if flagged asleep', () => {
    expect(moodFor(petAt('dead', { asleep: true }))).toBe('silent');
  });
});
