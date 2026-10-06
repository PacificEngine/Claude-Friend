import { mulberry32 } from './engine/rng.js';
import { tick } from './engine/tick.js';
import { advance } from './engine/advance.js';
import { MAX_OFFLINE_MINUTES } from './engine/constants.js';
import { load, save } from './storage/storage.js';
import { render } from './ui/render.js';
import { createUi, press, MENU } from './ui/controller.js';
import { createSound } from './ui/sound.js';

const speed = Number(new URLSearchParams(location.search).get('speed')) || 1;
const MS_PER_MINUTE = 60000 / speed;
const SUSPENDED_AFTER = 60; // game minutes

const rng = mulberry32(Date.now());
const sound = createSound();
const canvas = document.getElementById('lcd');
const ctx = canvas.getContext('2d');

let pet = load(Date.now(), rng);
let ui = createUi();
let lastTick = Date.now();

// A storage failure (quota, private mode) must never break the game loop.
function persist() {
  try {
    save(pet, lastTick);
  } catch {
    // ignore: the game keeps running without persistence
  }
}

function draw() {
  render(ctx, pet, ui, Math.floor(Date.now() / 500));
  document.querySelectorAll('[data-menu]').forEach((el) => {
    el.classList.toggle('active', ui.screen === 'main' && MENU[ui.menuIndex] === el.dataset.menu);
  });
  Object.assign(canvas.dataset, { stage: pet.stage, hunger: pet.hunger, happiness: pet.happiness });
}

function step() {
  const now = Date.now();
  const due = Math.floor((now - lastTick) / MS_PER_MINUTE);
  if (due > 0) {
    const wasCalling = pet.needsAttention;
    // A suspended tab returns with a big backlog: replay it capped, like a reload.
    if (due > SUSPENDED_AFTER) pet = advance(pet, Math.min(due, MAX_OFFLINE_MINUTES), rng);
    else for (let i = 0; i < due; i++) pet = tick(pet, rng);
    lastTick += due * MS_PER_MINUTE;
    // A death, bedtime or illness takes over the pet; don't leave a stale menu screen up.
    if ((pet.stage === 'dead' || pet.asleep || pet.sick) && ui.screen !== 'main') ui = createUi();
    if (pet.needsAttention && !wasCalling) sound.beep('call');
    persist();
  }
  draw();
}

function onButton(button) {
  const previous = ui.screen;
  ({ ui, pet } = press(ui, pet, button, rng));
  sound.beep('button');
  if (ui.screen === 'result' && previous !== 'result') sound.beep(ui.result.won ? 'win' : 'lose');
  persist();
  draw();
}

document.querySelectorAll('[data-button]').forEach((el) => {
  el.addEventListener('click', () => onButton(el.dataset.button));
});
document.addEventListener('keydown', (e) => {
  const key = e.key.toUpperCase();
  if (['A', 'B', 'C'].includes(key)) onButton(key);
});
const mute = document.getElementById('mute');
mute.addEventListener('click', () => {
  const muted = sound.toggleMute();
  mute.textContent = `Sound: ${muted ? 'off' : 'on'}`;
  mute.setAttribute('aria-pressed', String(muted));
});

draw();
setInterval(step, 250);
