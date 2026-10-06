import { ICONS, spriteFor } from './sprites.js';
import { petOffset } from './pose.js';

export const LCD = 32;
const INK = '#2b3320';

export function drawBitmap(ctx, rows, x, y) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] === '#') ctx.fillRect(x + c, y + r, 1, 1);
    }
  }
}

function drawHearts(ctx, filled, x, y) {
  for (let i = 0; i < 4; i++) {
    drawBitmap(ctx, i < filled ? ICONS.heart : ICONS.heartEmpty, x + i * 6, y);
  }
}

function drawUnderline(ctx, x, y, width) {
  ctx.fillRect(x, y, width, 1);
}

function drawMain(ctx, pet, frame) {
  if (pet.stage !== 'dead' && pet.asleep && !pet.lightOn) {
    for (let y = 0; y < LCD; y++) {
      for (let x = (y % 2); x < LCD; x += 2) ctx.fillRect(x, y, 1, 1);
    }
    return;
  }
  const { dx, dy } = petOffset(pet, frame);
  drawBitmap(ctx, spriteFor(pet), 8 + dx, 8 + dy);
  for (let i = 0; i < pet.poop; i++) drawBitmap(ctx, ICONS.poop, 1 + i * 8, 25);
  if (pet.sick) drawBitmap(ctx, ICONS.cross, 1, 1);
  if (pet.hunger === 0 && pet.stage !== 'dead' && pet.stage !== 'egg') drawBitmap(ctx, ICONS.heartEmpty, 1, 8);
  if (pet.needsAttention && frame % 2 === 0) drawBitmap(ctx, ICONS.bang, 28, 1);
}

function drawStatus(ctx, pet) {
  [[ICONS.F, pet.hunger], [ICONS.H, pet.happiness], [ICONS.D, pet.discipline]].forEach(
    ([letter, hearts], row) => {
      drawBitmap(ctx, letter, 1, 4 + row * 9);
      drawHearts(ctx, hearts, 7, 4 + row * 9);
    },
  );
}

function drawFeed(ctx, ui) {
  drawBitmap(ctx, ICONS.meal, 4, 10);
  drawBitmap(ctx, ICONS.snack, 22, 12);
  if (ui.option === 0) drawUnderline(ctx, 4, 21, 8);
  else drawUnderline(ctx, 22, 21, 4);
}

function drawGuess(ctx, ui) {
  ui.rounds.forEach((round, i) => {
    drawBitmap(ctx, round.won ? ICONS.heart : ICONS.heartEmpty, 7 + i * 8, 2);
  });
  drawBitmap(ctx, ICONS.arrowLeft, 6, 12);
  drawBitmap(ctx, ICONS.arrowRight, 22, 12);
  if (ui.option === 0) drawUnderline(ctx, 6, 21, 4);
  else drawUnderline(ctx, 22, 21, 4);
}

function drawResult(ctx, ui) {
  ui.rounds.forEach((round, i) => {
    drawBitmap(ctx, round.won ? ICONS.heart : ICONS.heartEmpty, 7 + i * 8, 14);
  });
}

export function render(ctx, pet, ui, frame) {
  ctx.clearRect(0, 0, LCD, LCD);
  ctx.fillStyle = INK;
  switch (ui.screen) {
    case 'status': return drawStatus(ctx, pet);
    case 'feed': return drawFeed(ctx, ui);
    case 'guess': return drawGuess(ctx, ui);
    case 'result': return drawResult(ctx, ui);
    default: return drawMain(ctx, pet, frame);
  }
}
