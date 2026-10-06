import { mulberry32 } from '../engine/rng.js';
import { buildLoop } from './music-score.js';
import { VOICES, pulseCoefficients } from './music-synth.js';

// Tweakable constants -------------------------------------------------------
export const MUSIC_GAIN = 0.026; // master level; effects use 0.05 per voice, music stays well under
export const ECHO_MIX = 0.22;    // how much of each melodic voice is sent to the echo (0 = none)
export const ECHO_SECONDS = 0.3;
export const ECHO_FEEDBACK = 0.25;
export const ECHO_TONE_HZ = 2200; // the echo is lowpassed so repeats sound softer
const LOOKAHEAD = 0.3;    // seconds scheduled ahead of the audio clock
const INTERVAL_MS = 100;
const FADE = 0.08;        // setTargetAtTime time constant
const SWITCH_DELAY = 0.3; // let the fade-out finish before changing tune
const NOISE_SECONDS = 1;

export function createMusic() {
  let ctx = null;
  let master = null;
  let echoSend = null;
  let noise = null;       // ONE shared noise buffer, reused by every hat
  const waves = {};       // PeriodicWaves by voice, built once per context
  let timer = null;
  let enabled = true;
  let started = false;
  let mood = 'silent';
  let playing = null;   // { mood, loop, start, index } for the tune being scheduled
  let switchAt = 0;

  const audible = () => enabled && started && mood !== 'silent';

  function ensureContext() {
    if (ctx) return true;
    if (!navigator.userActivation?.hasBeenActive) return false;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return false;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    buildEcho();
    buildSharedSources();
    return true;
  }

  function buildEcho() {
    echoSend = ctx.createGain();
    echoSend.gain.value = ECHO_MIX;
    const delay = ctx.createDelay(1);
    delay.delayTime.value = ECHO_SECONDS;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = ECHO_TONE_HZ;
    const feedback = ctx.createGain();
    feedback.gain.value = ECHO_FEEDBACK;
    echoSend.connect(delay);
    delay.connect(tone);
    tone.connect(feedback).connect(delay);
    tone.connect(master);
  }

  function buildSharedSources() {
    const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
    noise = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noise.getChannelData(0);
    const rng = mulberry32(1);
    for (let i = 0; i < data.length; i++) data[i] = rng() * 2 - 1;
    for (const [name, voice] of Object.entries(VOICES)) {
      if (voice.duty) {
        const { real, imag } = pulseCoefficients(voice.duty);
        waves[name] = ctx.createPeriodicWave(real, imag);
      }
    }
  }

  function finish(source, ...nodes) {
    source.onended = () => { source.disconnect(); nodes.forEach((n) => n.disconnect()); };
  }

  function playTone(note, voice, when) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    if (waves[note.voice]) osc.setPeriodicWave(waves[note.voice]);
    else osc.type = voice.wave;
    osc.frequency.value = note.freq;
    const end = when + note.duration;
    const release = Math.min(voice.release, note.duration * 0.4);
    const sustain = note.gain * voice.sustain;
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(note.gain, when + voice.attack);
    env.gain.linearRampToValueAtTime(sustain, when + voice.attack + voice.decay);
    env.gain.setValueAtTime(sustain, Math.max(when + voice.attack + voice.decay, end - release));
    env.gain.linearRampToValueAtTime(0, end);
    osc.connect(env);
    env.connect(master);
    if (voice.echo) env.connect(echoSend);
    finish(osc, env);
    osc.start(when);
    osc.stop(end + 0.01);
  }

  function playHat(note, voice, when) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    src.buffer = noise;
    filter.type = 'highpass';
    filter.frequency.value = voice.highpass;
    env.gain.setValueAtTime(note.gain, when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + note.duration);
    src.connect(filter).connect(env).connect(master);
    finish(src, filter, env);
    src.start(when);
    src.stop(when + note.duration + 0.01);
  }

  function playKick(note, voice, when) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(voice.from, when);
    osc.frequency.exponentialRampToValueAtTime(voice.to, when + voice.sweep);
    env.gain.setValueAtTime(note.gain, when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + note.duration);
    osc.connect(env).connect(master);
    finish(osc, env);
    osc.start(when);
    osc.stop(when + note.duration + 0.01);
  }

  const PLAYERS = { tone: playTone, hat: playHat, kick: playKick };

  function playNote(note, when) {
    const voice = VOICES[note.voice];
    PLAYERS[voice.kind](note, voice, when);
  }

  const loops = {};
  const loopFor = (name) => (loops[name] ??= buildLoop(name)); // built once, then reused

  // Only notes inside the look-ahead window are touched: `index` is a cursor into
  // the time-sorted notes, so each tick does work proportional to what it plays.
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (playing && playing.mood !== mood && now >= switchAt) playing = null;
    if (!audible()) return;
    if (!playing) {
      playing = { mood, loop: loopFor(mood), start: now + 0.05, index: 0 };
      master.gain.setTargetAtTime(MUSIC_GAIN, now, FADE);
    }
    if (playing.mood !== mood) return; // waiting for the fade-out to finish
    const horizon = now + LOOKAHEAD;
    for (;;) {
      const { loop } = playing;
      if (playing.index >= loop.notes.length) { // seamless: the next loop starts where this one ends
        playing.start += loop.lengthSeconds;
        playing.index = 0;
      }
      const note = loop.notes[playing.index];
      const when = playing.start + note.time;
      if (when >= horizon) break;
      if (when >= now) playNote(note, when);
      playing.index++;
    }
  }

  function fadeTo(level) {
    if (master) master.gain.setTargetAtTime(level, ctx.currentTime, FADE);
  }

  function sync() {
    if (!audible()) {
      fadeTo(0);
      playing = null; // restart the tune from the top when music returns
      return;
    }
    if (!ensureContext()) return;
    if (ctx.state === 'suspended' && document.visibilityState !== 'hidden') ctx.resume();
    if (!timer) timer = setInterval(schedule, INTERVAL_MS);
    if (playing && playing.mood !== mood) {
      fadeTo(0);
      switchAt = ctx.currentTime + SWITCH_DELAY;
    }
    schedule();
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend();
    else if (audible()) ctx.resume();
  });

  return {
    setMood(next) {
      if (next === mood) return;
      mood = next;
      sync();
    },
    setEnabled(on) {
      enabled = Boolean(on);
      sync();
    },
    start() {
      if (started) return;
      started = true;
      sync();
    },
    isEnabled: () => enabled,
  };
}
