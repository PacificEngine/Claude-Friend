import { buildLoop } from './music-score.js';

const MASTER_GAIN = 0.03; // effects use 0.05 per voice; music stays well under
const LOOKAHEAD = 0.3;    // seconds scheduled ahead of the audio clock
const INTERVAL_MS = 100;
const FADE = 0.08;        // setTargetAtTime time constant
const SWITCH_DELAY = 0.3; // let the fade-out finish before changing tune
const WAVES = { lead: 'square', bass: 'triangle' };

export function createMusic() {
  let ctx = null;
  let master = null;
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
    return true;
  }

  function playNote(note, when) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = WAVES[note.voice];
    osc.frequency.value = note.freq;
    const end = when + note.duration;
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(note.gain, when + 0.02);
    env.gain.setValueAtTime(note.gain, Math.max(when + 0.02, end - 0.05));
    env.gain.linearRampToValueAtTime(0, end);
    osc.connect(env).connect(master);
    osc.onended = () => { osc.disconnect(); env.disconnect(); };
    osc.start(when);
    osc.stop(end + 0.01);
  }

  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (playing && playing.mood !== mood && now >= switchAt) playing = null;
    if (!audible()) return;
    if (!playing) {
      playing = { mood, loop: buildLoop(mood), start: now + 0.05, index: 0 };
      master.gain.setTargetAtTime(MASTER_GAIN, now, FADE);
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
