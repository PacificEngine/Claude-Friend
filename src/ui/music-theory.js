// Small music-theory helpers: MIDI numbers, major scales, chords, scale steps.
// Everything here is pure, so the composition in music-score.js stays testable.
const LETTERS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const QUALITIES = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], sus2: [0, 2, 7], sus4: [0, 5, 7] };
const TRITONE = 6;

export const midiToFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);
export const pitchClass = (midi) => ((midi % 12) + 12) % 12;
export const scalePitchClasses = (tonic) => MAJOR_STEPS.map((s) => (tonic + s) % 12);

// 'Am', 'G7', 'F#m', 'Csus2' -> { name, root, pcs } (pcs listed root first).
export function parseChord(name) {
  const m = /^([A-G])([#b]?)(m7|m|7|sus2|sus4)?$/.exec(name);
  if (!m) throw new Error(`Unknown chord: ${name}`);
  const accidental = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const root = (LETTERS[m[1]] + accidental + 12) % 12;
  return { name, root, pcs: QUALITIES[m[3] ?? ''].map((i) => (root + i) % 12) };
}

// The first `count` chord tones at or above MIDI note `low`, ascending.
export function chordTonesFrom(chord, low, count) {
  const tones = [];
  for (let midi = low; tones.length < count; midi++) {
    if (chord.pcs.includes(pitchClass(midi))) tones.push(midi);
  }
  return tones;
}

export function lowestAtOrAbove(pc, low) {
  let midi = low;
  while (pitchClass(midi) !== pc) midi++;
  return midi;
}

// One step along the scale. Skips the tritone above the chord root (the one note
// that sounds wrong even as a passing tone).
export function scaleStep(midi, scale, direction, chord) {
  let next = midi + direction;
  for (;;) {
    const pc = pitchClass(next);
    const bad = (pc - chord.root + 12) % 12 === TRITONE;
    if (scale.includes(pc) && !bad) return next;
    next += direction;
  }
}
