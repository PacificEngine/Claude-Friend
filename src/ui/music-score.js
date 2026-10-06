// An original tune, written as data. Key of C major pentatonic (C D E G A), so no
// note can clash with another. Each bar is 4 beats: [note, beats] pairs.
export const PENTATONIC_PITCH_CLASSES = [0, 2, 4, 7, 9];

const SEMITONES = { C: 0, D: 2, E: 4, G: 7, A: 9 };

export function freqOf(name) {
  const midi = 12 * (Number(name.slice(1)) + 1) + SEMITONES[name[0]];
  return 440 * 2 ** ((midi - 69) / 12);
}

const MOODS = {
  awake: {
    bpm: 96,
    leadGain: 0.6,
    bassGain: 0.5,
    melody: [
      [['E5', 1], ['G5', 1], ['A5', 1], ['G5', 1]],
      [['E5', 2], ['D5', 1], ['C5', 1]],
      [['D5', 1], ['E5', 1], ['G5', 2]],
      [['E5', 1.5], ['D5', 0.5], ['C5', 2]],
      [['E5', 1], ['G5', 1], ['A5', 1], ['C6', 1]],
      [['A5', 2], ['G5', 1], ['E5', 1]],
      [['G5', 1], ['E5', 1], ['D5', 1], ['E5', 1]],
      [['C5', 4]],
    ],
    // Each bar: root for two beats, then the fifth for two.
    bass: [['C3', 'G3'], ['A2', 'E3'], ['C3', 'G3'], ['G2', 'D3'], ['C3', 'G3'], ['A2', 'E3'], ['G2', 'D3'], ['C3', 'G3']],
  },
  // A slow lullaby: half notes an octave lower, one whole-note bass per bar.
  sleep: {
    bpm: 60,
    leadGain: 0.3,
    bassGain: 0.25,
    melody: [
      [['E4', 2], ['G4', 2]],
      [['A4', 4]],
      [['G4', 2], ['E4', 2]],
      [['D4', 4]],
      [['E4', 2], ['G4', 2]],
      [['A4', 2], ['G4', 2]],
      [['E4', 2], ['D4', 2]],
      [['C4', 4]],
    ],
    bass: [['C3'], ['A2'], ['C3'], ['G2'], ['C3'], ['A2'], ['G2'], ['C3']],
  },
};

const BEATS_PER_BAR = 4;
const SUSTAIN = 0.92; // leave a small gap so repeated notes stay distinct

export function buildLoop(mood) {
  const m = MOODS[mood];
  if (!m) throw new Error(`Unknown music mood: ${mood}`);
  const beat = 60 / m.bpm;
  const notes = [];
  m.melody.forEach((bar, i) => {
    let at = i * BEATS_PER_BAR;
    for (const [name, beats] of bar) {
      notes.push({ time: at * beat, freq: freqOf(name), duration: beats * beat * SUSTAIN, voice: 'lead', gain: m.leadGain });
      at += beats;
    }
  });
  m.bass.forEach((bar, i) => {
    const span = BEATS_PER_BAR / bar.length;
    bar.forEach((name, j) => {
      notes.push({ time: (i * BEATS_PER_BAR + j * span) * beat, freq: freqOf(name), duration: span * beat * SUSTAIN, voice: 'bass', gain: m.bassGain });
    });
  });
  notes.sort((a, b) => a.time - b.time);
  return { lengthSeconds: m.melody.length * BEATS_PER_BAR * beat, notes };
}

export function moodFor(pet) {
  if (pet.stage === 'egg' || pet.stage === 'dead') return 'silent';
  return pet.asleep ? 'sleep' : 'awake';
}
