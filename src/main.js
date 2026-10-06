import { mulberry32 } from './engine/rng.js';
import { tick } from './engine/tick.js';
import { advance } from './engine/advance.js';
import { MAX_OFFLINE_MINUTES, SUSPENDED_AFTER_MINUTES, DEFAULT_SPEED } from './engine/constants.js';
import { loadPet, save } from './storage/storage.js';
import { render } from './ui/render.js';
import { createUi, press, MENU, shouldResetScreen, selectMenu, startOver } from './ui/controller.js';
import { describePet } from './ui/describe.js';
import { createSound } from './ui/sound.js';
import { createMusic } from './ui/music.js';
import { moodFor } from './ui/music-score.js';
import { loadPrefs, savePrefs } from './ui/prefs.js';

const speed = Number(new URLSearchParams(location.search).get('speed')) || DEFAULT_SPEED; // ?speed=60 is the fast mode
const MS_PER_MINUTE = 60000 / speed;
const NOTICE_MS = 2500;

const rng = mulberry32(Date.now());
const sound = createSound();
const music = createMusic();
const prefs = loadPrefs();
sound.setMuted(!prefs.sound);
music.setEnabled(prefs.music);
const canvas = document.getElementById('lcd');
const ctx = canvas.getContext('2d');

let { pet, lastTick } = loadPet(Date.now(), rng, localStorage, MS_PER_MINUTE);
let ui = createUi();
const noticeEl = document.getElementById('notice');
let noticeTimer;

// A storage failure (quota, private mode) must never break the game loop.
function persist() {
  try {
    save(pet, lastTick);
  } catch {
    // ignore: the game keeps running without persistence
  }
}

let lastLabel = '';
let lastMood = '';

function draw() {
  render(ctx, pet, ui, Math.floor(Date.now() / 500));
  document.querySelectorAll('[data-menu]').forEach((el) => {
    const active = ui.screen === 'main' && MENU[ui.menuIndex] === el.dataset.menu;
    el.classList.toggle('active', active);
    if (active) el.setAttribute('aria-current', 'true');
    else el.removeAttribute('aria-current');
  });
  const label = describePet(pet, ui);
  if (label !== lastLabel) {
    canvas.setAttribute('aria-label', label);
    lastLabel = label;
  }
  const mood = moodFor(pet);
  if (mood !== lastMood) {
    lastMood = mood;
    music.setMood(mood);
  }
  Object.assign(canvas.dataset, { screen: ui.screen, stage: pet.stage, hunger: pet.hunger, happiness: pet.happiness });
}

function step() {
  const now = Date.now();
  const due = Math.floor((now - lastTick) / MS_PER_MINUTE);
  if (due > 0) {
    const wasCalling = pet.needsAttention;
    // A suspended tab returns with a big backlog: replay it capped, like a reload.
    if (due > SUSPENDED_AFTER_MINUTES) pet = advance(pet, Math.min(due, MAX_OFFLINE_MINUTES), rng);
    else for (let i = 0; i < due; i++) pet = tick(pet, rng);
    lastTick += due * MS_PER_MINUTE;
    // A death, bedtime or illness can take over the pet; don't leave a stale screen up.
    if (shouldResetScreen(pet, ui)) ui = createUi();
    if (pet.needsAttention && !wasCalling) sound.beep('call');
    persist();
  }
  draw();
}

function showNotice(text) {
  clearTimeout(noticeTimer);
  noticeEl.textContent = text ?? '';
  if (text) noticeTimer = setTimeout(() => { noticeEl.textContent = ''; }, NOTICE_MS);
}

function onButton(button) {
  const previous = ui.screen;
  ({ ui, pet } = press(ui, pet, button, rng));
  showNotice(ui.notice);
  sound.beep('button');
  if (ui.screen === 'result' && previous !== 'result') sound.beep(ui.result.won ? 'win' : 'lose');
  persist();
  draw();
}

document.querySelectorAll('[data-button]').forEach((el) => {
  el.addEventListener('click', () => onButton(el.dataset.button));
});
document.querySelectorAll('[data-menu]').forEach((el) => {
  el.addEventListener('click', () => {
    ui = selectMenu(ui, el.dataset.menu);
    showNotice(ui.notice);
    persist();
    draw();
  });
});
const newEggDialog = document.getElementById('new-egg-dialog');
document.addEventListener('keydown', (e) => {
  if (newEggDialog.open) return; // keys belong to the dialog while it is up
  const key = e.key.toUpperCase();
  if (['A', 'B', 'C'].includes(key)) onButton(key);
});
// Browsers only allow audio after a user gesture; the first one starts the music.
['click', 'keydown'].forEach((type) => document.addEventListener(type, () => music.start()));

function bindToggle(id, label, key, apply) {
  const el = document.getElementById(id);
  const show = () => {
    el.textContent = `${label}: ${prefs[key] ? 'on' : 'off'}`;
    el.setAttribute('aria-pressed', String(!prefs[key]));
  };
  show();
  el.addEventListener('click', () => {
    prefs[key] = !prefs[key];
    apply(prefs[key]);
    savePrefs(prefs);
    show();
  });
}
bindToggle('mute', 'Sound', 'sound', (on) => sound.setMuted(!on));
bindToggle('music', 'Music', 'music', (on) => music.setEnabled(on));

// returnValue survives a close, so clear it or a later Escape would repeat the last answer.
document.getElementById('new-egg').addEventListener('click', () => {
  newEggDialog.returnValue = '';
  newEggDialog.showModal();
});
newEggDialog.addEventListener('close', () => {
  if (newEggDialog.returnValue !== 'confirm') return;
  ({ ui, pet } = startOver());
  lastTick = Date.now();
  persist();
  draw();
  showNotice('A new egg!');
});

// Browsers may freeze or discard a hidden tab without another tick, so save when leaving.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') persist();
});
window.addEventListener('pagehide', persist);

draw();
setInterval(step, 250);
