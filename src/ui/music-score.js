// An original soundtrack, written as data and generated deterministically.
//
// buildLoop(mood) -> { lengthSeconds, bpm, sections, notes }
//   notes: [{ time, freq, duration, voice, gain }] sorted by time, in seconds.
//   Pitched voices: lead, counter, arp, bass (awake) and soft, lull (sleep).
//   Percussion voices 'hat' and 'kick' have freq 0: they are noise / a thump.
//   sections: [{ name, startBar, bars, tonic, chords, barScales }] with one chord
//   and one scale (pitch classes) per bar, so tests and tools can check the harmony.
import { mulberry32 } from '../engine/rng.js';
import { chordTonesFrom, lowestAtOrAbove, midiToFreq, parseChord, scalePitchClasses, scaleStep } from './music-theory.js';

// Tweakable constants -------------------------------------------------------
export const TEMPO_AWAKE = 96; // BPM; 64 bars -> 160 s
export const TEMPO_SLEEP = 60; // BPM; 32 bars -> 128 s
const BEATS_PER_BAR = 4;
const SUSTAIN = 0.92;          // notes end a little early so repeats stay distinct
const HAT_SECONDS = 0.06;
const KICK_SECONDS = 0.18;
const MELODY_LOW = 67;         // G4: lowest chord tone the awake melody reaches for
const COUNTER_LOW = 57;        // A3
const ARP_LOW = 60;            // C4
const SOFT_LOW = 55;           // G3: the lullaby sings an octave lower
const BASS_LOW = 36;           // C2

const GAINS = {
  awake: { lead: 0.42, counter: 0.2, arp: 0.14, bass: 0.4, hat: 0.1, kick: 0.45 },
  sleep: { soft: 0.26, lull: 0.12, bass: 0.22 },
};

// Melody motifs --------------------------------------------------------------
// A bar is a list of [beat, lengthInBeats, pitch]. A number picks that chord tone
// from the ladder of chord tones above the register floor (0 = lowest); '+1' / '-1'
// steps along the scale from the previous note, so passing notes always connect.
// Notes on beats 1 and 3 are always chord tones; steps only sit on the weak beats.
const A1 = [[0, 1.5, 2], [1.5, 0.5, '-1'], [2, 1, 1], [3, 1, '+1']];
const A2 = [[0, 2, 3], [2, 1, 2], [3, 1, '-1']];
const A3 = [[0, 1, 2], [1, 1, '+1'], [2, 1, 3], [3, 1, '-1']];
const A4 = [[0, 1, 2], [1, 1, '-1'], [2, 2, 1]];           // half cadence
const A_END = [[0, 2, 2], [2, 2, 1]];                       // settles before the loop restarts
const MAIN_THEME = [A1, A2, A1, A4, A1, A2, A3, A4];

const B1 = [[0, 0.5, 0], [0.5, 0.5, '-1'], [1, 1, 1], [2, 0.5, 2], [2.5, 0.5, '-1'], [3, 1, 1]];
const B2 = [[0, 1, 3], [1, 0.5, '-1'], [1.5, 0.5, '-1'], [2, 2, 2]];
const B3 = [[0, 2, 2], [2, 2, 1]];
const B4 = [[0, 2, 2], [2, 1, 1], [3, 1, '-1']];
const B5 = [[0, 3, 1]];
const B_THEME = [B1, B2, B1, B3, B1, B2, B1, B3, B1, B2, B1, B3, B1, B2, B4, B5];

const C1 = [[0, 2, 2], [2, 2, 1]];
const C2 = [[0, 4, 2]];
const C3 = [[0, 4, 1]];
const BRIDGE_THEME = [C1, C2, C1, C2, C1, C2, C1, C3];

const LIFT_THEME = [...MAIN_THEME, A1, A2, A3, A4, A1, A2, A4, A_END];

const COUNTER_A = [[0, 2, 2], [2, 2, 1]];
const COUNTER_B = [[0, 1, 1], [1, 1, '+1'], [2, 2, 2]];

const S1 = [[0, 2, 2], [2, 2, 1]];
const S2 = [[0, 3, 2], [3, 1, '-1']];
const S3 = [[0, 4, 1]];
const S4 = [[0, 1, 1], [1, 1, '+1'], [2, 2, 2]];
const LULLABY_A = [S1, S2, S1, S3, S1, S2, S4, S3];
const LULLABY_B = [S2, S1, S1, S3, S2, S1, S4, S3];
const LULLABY_C = [S1, S2, S1, S3, S1, S4, S1, S1];

// Sections -------------------------------------------------------------------
// tonic: pitch class of the key. tonicOverrides: { barIndex: tonic } for bars that
// already belong to the next key. bass: 'walk' | 'pulse' | 'whole'. perc: 'light' |
// 'full' | undefined. arp: notes per bar. ornamentSeed: decorate the theme.
const AWAKE_SECTIONS = [
  { name: 'A', tonic: 0, chords: 'C Am F G C Am F G', lead: MAIN_THEME, bass: 'walk', perc: 'light' },
  { name: 'A2', tonic: 0, chords: 'C Am Dm G C Am Dm G', lead: MAIN_THEME, ornamentSeed: 7, arp: 8, bass: 'walk', perc: 'light' },
  { name: 'B', tonic: 0, chords: 'Am F C G Am F C G F G Em Am F Dm G G', lead: B_THEME, arp: 8, bass: 'pulse', perc: 'light' },
  { name: 'A3', tonic: 0, chords: 'C Am F G C Am F G', lead: MAIN_THEME, counter: true, arp: 8, bass: 'walk', perc: 'light' },
  { name: 'C', tonic: 0, chords: 'C Csus2 F Fsus2 Am7 Gsus4 Em7 A7', lead: BRIDGE_THEME, bass: 'whole', level: 0.7, tonicOverrides: { 7: 2 } },
  { name: 'D', tonic: 2, chords: 'D A Bm G D A Bm G D A Bm G D Em G G7', lead: LIFT_THEME, arp: 16, bass: 'pulse', perc: 'full', tonicOverrides: { 15: 0 } },
];

const SLEEP_SECTIONS = [
  { name: 'Lull', tonic: 0, chords: 'C Em F C C Em F C', lead: LULLABY_A, arp: 4, bass: 'whole' },
  { name: 'Drift', tonic: 0, chords: 'Am F C G Am F C G', lead: LULLABY_B, arp: 4, bass: 'whole' },
  { name: 'Return', tonic: 0, chords: 'C Em F C C Em F C', lead: LULLABY_A, ornamentSeed: 3, arp: 4, bass: 'whole' },
  { name: 'Hush', tonic: 0, chords: 'Dm G Em Am F Dm G G7', lead: LULLABY_C, arp: 4, bass: 'whole' },
];

const MOODS = {
  awake: { bpm: TEMPO_AWAKE, melodyVoice: 'lead', arpVoice: 'arp', melodyLow: MELODY_LOW, sections: AWAKE_SECTIONS },
  sleep: { bpm: TEMPO_SLEEP, melodyVoice: 'soft', arpVoice: 'lull', melodyLow: SOFT_LOW, sections: SLEEP_SECTIONS },
};

// Generators (all work in beats from the start of the loop) -----------------------
function ornament(bars, seed) {
  const rng = mulberry32(seed);
  return bars.map((bar) => bar.flatMap(([beat, len, pitch]) => (
    len >= 1 && rng() < 0.6
      ? [[beat, len - 0.5, pitch], [beat + len - 0.5, 0.5, '+1']] // upper neighbour on a weak half-beat
      : [[beat, len, pitch]]
  )));
}

function melody(bars, voice, low, gain, section) {
  const events = [];
  let previous = null;
  bars.forEach((bar, i) => {
    const chord = section.chords[i];
    const ladder = chordTonesFrom(chord, low + section.tonic, 6);
    for (const [beat, length, pitch] of bar) {
      const midi = typeof pitch === 'number'
        ? ladder[pitch]
        : scaleStep(previous, section.barScales[i], pitch === '+1' ? 1 : -1, chord);
      previous = midi;
      events.push({ beat: i * BEATS_PER_BAR + beat, length, midi, voice, gain });
    }
  });
  return events;
}

const PING_PONG = [0, 1, 2, 3, 2, 1];
function arpeggio(perBar, voice, gain, section) {
  const events = [];
  const step = BEATS_PER_BAR / perBar;
  section.chords.forEach((chord, i) => {
    const ladder = chordTonesFrom(chord, ARP_LOW, 4);
    for (let k = 0; k < perBar; k++) {
      events.push({ beat: i * BEATS_PER_BAR + k * step, length: step, midi: ladder[PING_PONG[k % PING_PONG.length]], voice, gain });
    }
  });
  return events;
}

function bassline(style, gain, section) {
  const events = [];
  section.chords.forEach((chord, i) => {
    const root = lowestAtOrAbove(chord.root, BASS_LOW);
    const at = (beat, length, midi) => events.push({ beat: i * BEATS_PER_BAR + beat, length, midi, voice: 'bass', gain });
    if (style === 'whole') at(0, 4, root);
    else if (style === 'walk') [root, root + 7, root + 12, root + 7].forEach((midi, beat) => at(beat, 1, midi));
    else for (let k = 0; k < 8; k++) at(k / 2, 0.5, k % 2 ? root + 12 : root);
  });
  return events;
}

function percussion(style, gains, bars) {
  const events = [];
  const kicks = style === 'full' ? [0, 1, 2, 3] : [0, 2];
  const kickGain = style === 'full' ? gains.kick * 0.85 : gains.kick;
  for (let bar = 0; bar < bars; bar++) {
    const base = bar * BEATS_PER_BAR;
    for (const beat of kicks) events.push({ beat: base + beat, midi: null, voice: 'kick', gain: kickGain });
    for (const beat of [0.5, 1.5, 2.5, 3.5]) events.push({ beat: base + beat, midi: null, voice: 'hat', gain: gains.hat });
  }
  return events;
}

// Assembly --------------------------------------------------------------------
function describeSection(spec, startBar) {
  const chords = spec.chords.split(' ').map(parseChord);
  const barScales = chords.map((_, i) => scalePitchClasses(spec.tonicOverrides?.[i] ?? spec.tonic));
  return { name: spec.name, startBar, bars: chords.length, tonic: spec.tonic, chords, barScales };
}

function sectionEvents(spec, info, mood) {
  const gains = GAINS[mood.name];
  const level = spec.level ?? 1;
  const scaled = (g) => g * level;
  const theme = spec.ornamentSeed ? ornament(spec.lead, spec.ornamentSeed) : spec.lead;
  const events = [
    ...melody(theme, mood.melodyVoice, mood.melodyLow, scaled(gains[mood.melodyVoice]), info),
    ...bassline(spec.bass, scaled(gains.bass), info),
  ];
  if (spec.counter) {
    const bars = info.chords.map((_, i) => (i % 2 ? COUNTER_B : COUNTER_A));
    events.push(...melody(bars, 'counter', COUNTER_LOW, gains.counter, info));
  }
  if (spec.arp) events.push(...arpeggio(spec.arp, mood.arpVoice, gains[mood.arpVoice], info));
  if (spec.perc) events.push(...percussion(spec.perc, gains, info.bars));
  return events.map((e) => ({ ...e, beat: e.beat + info.startBar * BEATS_PER_BAR }));
}

export function buildLoop(moodName) {
  const base = MOODS[moodName];
  if (!base) throw new Error(`Unknown music mood: ${moodName}`);
  const mood = { ...base, name: moodName };
  const beat = 60 / mood.bpm;
  let startBar = 0;
  const sections = [];
  const events = [];
  for (const spec of mood.sections) {
    const info = describeSection(spec, startBar);
    events.push(...sectionEvents(spec, info, mood));
    sections.push(info);
    startBar += info.bars;
  }
  const lengthSeconds = startBar * BEATS_PER_BAR * beat;
  const notes = events.map((e) => {
    const time = e.beat * beat;
    if (e.midi === null) {
      const duration = e.voice === 'kick' ? KICK_SECONDS : HAT_SECONDS;
      return { time, freq: 0, duration: Math.min(duration, lengthSeconds - time), voice: e.voice, gain: e.gain };
    }
    return { time, freq: midiToFreq(e.midi), duration: e.length * beat * SUSTAIN, voice: e.voice, gain: e.gain };
  });
  notes.sort((a, b) => a.time - b.time);
  return { lengthSeconds, bpm: mood.bpm, sections, notes };
}

export function moodFor(pet) {
  if (pet.stage === 'egg' || pet.stage === 'dead') return 'silent';
  return pet.asleep ? 'sleep' : 'awake';
}
