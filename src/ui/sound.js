const TONES = {
  call: [[880, 0.12], [660, 0.12], [880, 0.12]],
  button: [[520, 0.05]],
  win: [[523, 0.1], [659, 0.1], [784, 0.2]],
  lose: [[300, 0.2], [200, 0.3]],
};

export function createSound() {
  let ctx = null;
  let muted = false;

  function beep(kind) {
    if (muted || !navigator.userActivation?.hasBeenActive) return;
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume(); // Safari starts contexts suspended
    let t = ctx.currentTime;
    for (const [freq, duration] of TONES[kind]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + duration);
      t += duration;
    }
  }

  return { beep, toggleMute: () => (muted = !muted) };
}
