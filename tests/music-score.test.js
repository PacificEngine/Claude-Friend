import { describe, it, expect } from 'vitest';
import { buildLoop, moodFor, TEMPO_AWAKE, TEMPO_SLEEP } from '../src/ui/music-score.js';
import { pitchClass, parseChord, scalePitchClasses } from '../src/ui/music-theory.js';
import { petAt } from './helpers.js';

const EPS = 1e-6;
const PITCHED = ['lead', 'counter', 'arp', 'bass', 'soft', 'lull'];
const PERCUSSION = ['hat', 'kick'];
const freqPc = (freq) => pitchClass(Math.round(12 * Math.log2(freq / 440)) + 69);

function barOf(loop, note) {
  const barSeconds = (4 * 60) / loop.bpm;
  return Math.floor(note.time / barSeconds + EPS);
}

function sectionAt(loop, bar) {
  return loop.sections.find((s) => bar >= s.startBar && bar < s.startBar + s.bars);
}

describe.each(['awake', 'sleep'])('buildLoop(%s)', (mood) => {
  const loop = buildLoop(mood);

  it('has notes, sections and a positive length', () => {
    expect(loop.lengthSeconds).toBeGreaterThan(0);
    expect(loop.notes.length).toBeGreaterThan(0);
    expect(loop.sections.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps every note inside the loop', () => {
    for (const n of loop.notes) {
      expect(n.time).toBeGreaterThanOrEqual(0);
      expect(n.time).toBeLessThan(loop.lengthSeconds);
      expect(n.time + n.duration).toBeLessThanOrEqual(loop.lengthSeconds + EPS);
      expect(n.duration).toBeGreaterThan(0);
    }
  });

  it('is sorted by time', () => {
    for (let i = 1; i < loop.notes.length; i++) {
      expect(loop.notes[i].time).toBeGreaterThanOrEqual(loop.notes[i - 1].time);
    }
  });

  it('uses known voices, valid gains and sensible pitch ranges', () => {
    for (const n of loop.notes) {
      expect([...PITCHED, ...PERCUSSION]).toContain(n.voice);
      expect(n.gain).toBeGreaterThan(0);
      expect(n.gain).toBeLessThanOrEqual(1);
      if (PITCHED.includes(n.voice)) {
        expect(n.freq).toBeGreaterThanOrEqual(60);
        expect(n.freq).toBeLessThanOrEqual(1600);
      } else {
        expect(n.freq ?? 0).toBe(0); // noise and kick voices carry no pitch
      }
    }
  });

  it('never overlaps two notes of the same pitched voice', () => {
    for (const voice of PITCHED) {
      const mine = loop.notes.filter((n) => n.voice === voice);
      for (let i = 1; i < mine.length; i++) {
        expect(mine[i].time).toBeGreaterThanOrEqual(mine[i - 1].time + mine[i - 1].duration - EPS);
      }
    }
  });

  it('has one chord and one scale per bar, and sections tile the loop', () => {
    let next = 0;
    for (const s of loop.sections) {
      expect(s.startBar).toBe(next);
      expect(s.chords).toHaveLength(s.bars);
      expect(s.barScales).toHaveLength(s.bars);
      next += s.bars;
    }
    expect(next * (4 * 60) / loop.bpm).toBeCloseTo(loop.lengthSeconds);
  });

  it('fits every pitched note to the chord or scale of its bar', () => {
    for (const n of loop.notes.filter((x) => PITCHED.includes(x.voice))) {
      const bar = barOf(loop, n);
      const s = sectionAt(loop, bar);
      const i = bar - s.startBar;
      const allowed = new Set([...s.chords[i].pcs, ...s.barScales[i]]);
      expect(allowed.has(freqPc(n.freq))).toBe(true);
    }
  });

  it('puts melody notes on the downbeat and beat three on chord tones', () => {
    const beat = 60 / loop.bpm;
    for (const n of loop.notes.filter((x) => x.voice === 'lead' || x.voice === 'soft' || x.voice === 'counter')) {
      const bar = barOf(loop, n);
      const beatInBar = n.time / beat - bar * 4;
      if (Math.abs(beatInBar) < EPS || Math.abs(beatInBar - 2) < EPS) {
        const s = sectionAt(loop, bar);
        expect(s.chords[bar - s.startBar].pcs).toContain(freqPc(n.freq));
      }
    }
  });

  it('plays bass notes from the chord (roots and fifths)', () => {
    for (const n of loop.notes.filter((x) => x.voice === 'bass')) {
      const bar = barOf(loop, n);
      const s = sectionAt(loop, bar);
      expect(s.chords[bar - s.startBar].pcs).toContain(freqPc(n.freq));
    }
  });

  it('ends on the dominant of the opening key so it turns back into bar 1', () => {
    const first = loop.sections[0];
    const last = loop.sections.at(-1);
    expect(last.chords.at(-1).root).toBe((first.tonic + 7) % 12);
    expect(first.chords[0].root).toBe(first.tonic);
  });

  it('is deterministic', () => {
    expect(buildLoop(mood)).toEqual(loop);
  });

  it('has a sane note count and builds fast', () => {
    expect(loop.notes.length).toBeLessThan(4000);
    const t0 = performance.now();
    buildLoop(mood);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe('awake loop', () => {
  const loop = buildLoop('awake');
  const voices = (from, bars) => new Set(
    loop.notes.filter((n) => barOf(loop, n) >= from && barOf(loop, n) < from + bars).map((n) => n.voice),
  );

  it('is 64 bars at 96 BPM: 160 seconds', () => {
    expect(TEMPO_AWAKE).toBe(96);
    expect(loop.lengthSeconds).toBeCloseTo(160);
  });

  it('has sections A, A2, B, A3, C, D with 8, 8, 16, 8, 8, 16 bars', () => {
    expect(loop.sections.map((s) => [s.name, s.startBar, s.bars])).toEqual([
      ['A', 0, 8], ['A2', 8, 8], ['B', 16, 16], ['A3', 32, 8], ['C', 40, 8], ['D', 48, 16],
    ]);
  });

  it('starts in C major and lifts D to D major', () => {
    const [a, , , , , d] = loop.sections;
    expect(a.tonic).toBe(0);
    expect(d.tonic).toBe(2);
    expect(d.barScales[0]).toEqual(scalePitchClasses(2));
    expect(d.barScales[0]).toContain(6); // F#
    expect(d.barScales[0]).toContain(1); // C#
  });

  it('has a different progression in B than in A, and a vi-IV-I-V start for B', () => {
    const names = (s) => s.chords.map((c) => c.name);
    const [a, a2, b] = loop.sections;
    expect(names(a).slice(0, 4)).toEqual(['C', 'Am', 'F', 'G']);
    expect(names(a2).slice(0, 4)).toEqual(['C', 'Am', 'Dm', 'G']);
    expect(names(b).slice(0, 4)).toEqual(['Am', 'F', 'C', 'G']);
    expect(names(b)).not.toEqual(names(a2).concat(names(a2)));
  });

  it('has no percussion in the bridge but does in A, A2, B, A3 and D', () => {
    const [a, a2, b, a3, c, d] = loop.sections;
    for (const s of [a, a2, b, a3, d]) {
      const v = voices(s.startBar, s.bars);
      expect(v.has('hat')).toBe(true);
      expect(v.has('kick')).toBe(true);
    }
    const bridge = voices(c.startBar, c.bars);
    expect(bridge.has('hat')).toBe(false);
    expect(bridge.has('kick')).toBe(false);
  });

  it('plays arpeggios in A2, B, A3 and D only, and a counter-melody in A3', () => {
    const [a, a2, b, a3, c, d] = loop.sections;
    for (const s of [a2, b, a3, d]) expect(voices(s.startBar, s.bars).has('arp')).toBe(true);
    for (const s of [a, c]) expect(voices(s.startBar, s.bars).has('arp')).toBe(false);
    expect(voices(a3.startBar, a3.bars).has('counter')).toBe(true);
    expect(voices(a.startBar, a.bars).has('counter')).toBe(false);
  });

  it('repeats the main theme recognisably when it returns', () => {
    const [a, , , a3] = loop.sections;
    const beat = 60 / loop.bpm;
    const leadPitches = (s) => loop.notes
      .filter((n) => n.voice === 'lead' && barOf(loop, n) >= s.startBar && barOf(loop, n) < s.startBar + s.bars)
      .map((n) => [Math.round((n.time - s.startBar * 4 * beat) / beat * 2), Math.round(n.freq)]);
    expect(leadPitches(a3)).toEqual(leadPitches(a));
  });

  it('shifts the theme up a whole step in D', () => {
    const [a, , , , , d] = loop.sections;
    const firstLead = (s) => loop.notes.find((n) => n.voice === 'lead' && barOf(loop, n) === s.startBar).freq;
    expect(firstLead(d) / firstLead(a)).toBeCloseTo(2 ** (2 / 12), 5);
  });
});

describe('sleep loop', () => {
  const awake = buildLoop('awake');
  const sleep = buildLoop('sleep');

  it('is 32 bars at 60 BPM: 128 seconds', () => {
    expect(TEMPO_SLEEP).toBe(60);
    expect(sleep.lengthSeconds).toBeCloseTo(128);
    expect(sleep.sections.reduce((n, s) => n + s.bars, 0)).toBe(32);
  });

  it('has no percussion', () => {
    expect(sleep.notes.some((n) => PERCUSSION.includes(n.voice))).toBe(false);
  });

  it('uses a different progression from the awake opening', () => {
    expect(sleep.sections[0].chords.slice(0, 4).map((c) => c.name)).toEqual(['C', 'Em', 'F', 'C']);
    expect(sleep.sections[1].chords.slice(0, 4).map((c) => c.name)).toEqual(['Am', 'F', 'C', 'G']);
  });

  it('is slower, sparser, quieter and lower than awake', () => {
    const rate = (l) => l.notes.length / l.lengthSeconds;
    const meanGain = (l) => l.notes.reduce((s, n) => s + n.gain, 0) / l.notes.length;
    const maxGain = (l) => Math.max(...l.notes.map((n) => n.gain));
    const lowestMelody = (l) => Math.min(...l.notes.filter((n) => ['lead', 'soft'].includes(n.voice)).map((n) => n.freq));
    expect(sleep.bpm).toBeLessThan(awake.bpm);
    expect(rate(sleep)).toBeLessThan(rate(awake));
    expect(meanGain(sleep)).toBeLessThan(meanGain(awake));
    expect(maxGain(sleep)).toBeLessThan(maxGain(awake));
    expect(lowestMelody(sleep)).toBeLessThan(lowestMelody(awake));
  });
});

describe('music theory', () => {
  it('parses chords into pitch classes', () => {
    expect(parseChord('Am').pcs).toEqual([9, 0, 4]);
    expect(parseChord('G7').pcs).toEqual([7, 11, 2, 5]);
    expect(parseChord('F#m').root).toBe(6);
    expect(() => parseChord('H')).toThrow();
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
