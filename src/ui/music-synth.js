// Voice recipes for the music player: waveform and envelope per voice.
// Kept apart from the player so the Web Audio wiring stays small.
export const PULSE_HARMONICS = 32;

// Fourier coefficients (cos, sin) of a pulse wave with the given duty cycle, for
// AudioContext.createPeriodicWave. A 25% pulse has the nasal "chiptune" bite.
export function pulseCoefficients(duty, harmonics = PULSE_HARMONICS) {
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n++) {
    real[n] = Math.sin(2 * Math.PI * n * duty) / (Math.PI * n);
    imag[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (Math.PI * n);
  }
  return { real, imag };
}

// kind 'tone': an oscillator (duty = pulse width, else `wave`) through an envelope:
//   attack to `gain`, decay to `sustain` * gain, hold, release at the end.
// echo: whether the voice feeds the shared echo. Percussion stays dry.
export const VOICES = {
  lead: { kind: 'tone', duty: 0.25, attack: 0.012, decay: 0.15, sustain: 0.65, release: 0.06, echo: true },
  counter: { kind: 'tone', wave: 'triangle', attack: 0.03, decay: 0.1, sustain: 0.8, release: 0.08, echo: true },
  arp: { kind: 'tone', duty: 0.125, attack: 0.005, decay: 0.1, sustain: 0.35, release: 0.03, echo: true },
  bass: { kind: 'tone', wave: 'triangle', attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.06, echo: false },
  soft: { kind: 'tone', wave: 'triangle', attack: 0.1, decay: 0.3, sustain: 0.75, release: 0.3, echo: true },
  lull: { kind: 'tone', wave: 'triangle', attack: 0.01, decay: 0.35, sustain: 0.3, release: 0.1, echo: true },
  hat: { kind: 'hat', highpass: 7000, echo: false },
  kick: { kind: 'kick', from: 140, to: 45, sweep: 0.12, echo: false },
};
