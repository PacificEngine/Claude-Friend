import { ICONS, DIGITS, spriteFor } from './sprites.js';
import { petOffset } from './pose.js';

export const LCD = 32;
const INK = '#2b3320';

export function drawBitmap(ctx, rows, x, y, scale = 1) {
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      if (rows[r][c] === '#') ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
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
  drawRoundHearts(ctx, ui.rounds, 2);
  drawBitmap(ctx, ICONS.arrowLeft, 6, 12);
  drawBitmap(ctx, ICONS.arrowRight, 22, 12);
  if (ui.option === 0) drawUnderline(ctx, 6, 21, 4);
  else drawUnderline(ctx, 22, 21, 4);
}

function drawRoundHearts(ctx, rounds, y) {
  rounds.forEach((round, i) => {
    drawBitmap(ctx, round.won ? ICONS.heart : ICONS.heartEmpty, 7 + i * 8, y);
  });
}

// Left or Right on the left, Higher or Lower on the right.
function drawPlay(ctx, ui) {
  drawBitmap(ctx, ICONS.arrowLeft, 2, 12);
  drawBitmap(ctx, ICONS.arrowRight, 8, 12);
  drawBitmap(ctx, ICONS.arrowUp, 21, 10);
  drawBitmap(ctx, ICONS.arrowDown, 21, 15);
  if (ui.option === 0) drawUnderline(ctx, 2, 22, 10);
  else drawUnderline(ctx, 21, 22, 7);
}

function drawHighLow(ctx, ui) {
  drawRoundHearts(ctx, ui.rounds, 2);
  drawBitmap(ctx, DIGITS[ui.shown], 11, 8, 3); // 3x5 at scale 3 is 9x15, centred on 32
  drawBitmap(ctx, ICONS.arrowUp, 5, 25);
  drawBitmap(ctx, ICONS.arrowDown, 20, 25);
  if (ui.option === 0) drawUnderline(ctx, 5, 30, 7);
  else drawUnderline(ctx, 20, 30, 7);
}

function drawResult(ctx, ui) {
  drawRoundHearts(ctx, ui.rounds, 14);
}

export function render(ctx, pet, ui, frame) {
  ctx.clearRect(0, 0, LCD, LCD);
  ctx.fillStyle = INK;
  switch (ui.screen) {
    case 'status': return drawStatus(ctx, pet);
    case 'feed': return drawFeed(ctx, ui);
    case 'play': return drawPlay(ctx, ui);
    case 'highlow': return drawHighLow(ctx, ui);
    case 'guess': return drawGuess(ctx, ui);
    case 'result': return drawResult(ctx, ui);
    default: return drawMain(ctx, pet, frame);
  }
}
