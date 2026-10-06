import { describe, it, expect } from 'vitest';
import { MENU, createUi, press, describeAction, shouldResetScreen, selectMenu } from '../src/ui/controller.js';
import { petAt } from './helpers.js';

const low = () => 0.1; // left
const select = (ui, name) => ({ ...ui, menuIndex: MENU.indexOf(name) });
const nth = (n) => () => (n - 0.5) / 9; // draws the number n (1..9)

// Opens the Play chooser and picks a game: 'guess' (option 0) or 'highlow' (option 1).
function startGame(pet, game, rng = low) {
  let state = press(select(createUi(), 'play'), pet, 'B', rng);
  if (game === 'highlow') state = press(state.ui, state.pet, 'A', rng);
  return press(state.ui, state.pet, 'B', rng);
}

describe('controller', () => {
  it('button A cycles the menu icon and wraps', () => {
    let ui = createUi();
    const pet = petAt('child');
    for (let i = 0; i < MENU.length; i++) ({ ui } = press(ui, pet, 'A', low));
    expect(ui.menuIndex).toBe(0);
    ({ ui } = press(ui, pet, 'A', low));
    expect(ui.menuIndex).toBe(1);
  });

  it('feeding: B opens the feed screen, A picks a snack, B confirms', () => {
    let ui = createUi();
    let pet = petAt('child', { hunger: 2, happiness: 2 });
    ({ ui, pet } = press(ui, pet, 'B', low));
    expect(ui.screen).toBe('feed');
    ({ ui, pet } = press(ui, pet, 'A', low));
    ({ ui, pet } = press(ui, pet, 'B', low));
    expect(ui.screen).toBe('main');
    expect(pet.happiness).toBe(3);
    expect(pet.hunger).toBe(2);
  });

  it('feeding: C cancels without feeding', () => {
    let { ui, pet } = press(createUi(), petAt('child', { hunger: 2 }), 'B', low);
    ({ ui, pet } = press(ui, pet, 'C', low));
    expect(ui.screen).toBe('main');
    expect(pet.hunger).toBe(2);
  });

  it('cleaning, medicine, discipline and light run engine actions directly', () => {
    const pet = petAt('child', { poop: 2 });
    const { pet: cleaned } = press(select(createUi(), 'clean'), pet, 'B', low);
    expect(cleaned.poop).toBe(0);
    const asleep = petAt('child', { asleep: true, lightOn: true });
    const { pet: dark } = press(select(createUi(), 'light'), asleep, 'B', low);
    expect(dark.lightOn).toBe(false);
    const sick = petAt('child', { sick: true });
    const { pet: dosed } = press(select(createUi(), 'medicine'), sick, 'B', low);
    expect(dosed.doses).toBe(1);
    const bad = petAt('child', { misbehaving: true });
    const { pet: scolded } = press(select(createUi(), 'discipline'), bad, 'B', low);
    expect(scolded).toMatchObject({ misbehaving: false, discipline: 1 });
  });

  describe('shouldResetScreen', () => {
    const on = (screen) => ({ ...createUi(), screen });
    it('never resets the main screen', () => {
      expect(shouldResetScreen(petAt('child', { asleep: true }), on('main'))).toBe(false);
    });
    it('resets any open screen for a dead or sleeping pet', () => {
      expect(shouldResetScreen(petAt('adult', { stage: 'dead' }), on('status'))).toBe(true);
      expect(shouldResetScreen(petAt('child', { asleep: true }), on('feed'))).toBe(true);
    });
    it('a sick pet only loses the play chooser and the game screens', () => {
      const sick = petAt('child', { sick: true });
      expect(shouldResetScreen(sick, on('guess'))).toBe(true);
      expect(shouldResetScreen(sick, on('highlow'))).toBe(true);
      expect(shouldResetScreen(sick, on('play'))).toBe(true);
      expect(shouldResetScreen(sick, on('status'))).toBe(false);
      expect(shouldResetScreen(sick, on('feed'))).toBe(false);
    });
    it('leaves a healthy awake pet alone', () => {
      for (const screen of ['guess', 'highlow', 'play']) {
        expect(shouldResetScreen(petAt('child'), on(screen))).toBe(false);
      }
    });
  });

  it('status screen opens and any button closes it', () => {
    let { ui, pet } = press(select(createUi(), 'status'), petAt('child'), 'B', low);
    expect(ui.screen).toBe('status');
    ({ ui } = press(ui, pet, 'C', low));
    expect(ui.screen).toBe('main');
  });

  it('plays three guessing rounds and rewards a win', () => {
    let { ui, pet } = startGame(petAt('child', { happiness: 2 }), 'guess');
    expect(ui.screen).toBe('guess');
    for (let i = 0; i < 3; i++) ({ ui, pet } = press(ui, pet, 'B', low)); // choice left, rng left
    expect(ui.screen).toBe('result');
    expect(ui.result.won).toBe(true);
    expect(pet.happiness).toBe(3);
    ({ ui } = press(ui, pet, 'B', low));
    expect(ui.screen).toBe('main');
  });

  describe('play chooser', () => {
    const open = (pet = petAt('child')) => press(select(createUi(), 'play'), pet, 'B', low);

    it('the Play icon opens a chooser with Left or Right selected', () => {
      const { ui } = open();
      expect(ui).toMatchObject({ screen: 'play', option: 0 });
    });

    it('A toggles between the two games', () => {
      let { ui, pet } = open();
      ({ ui, pet } = press(ui, pet, 'A', low));
      expect(ui.option).toBe(1);
      ({ ui } = press(ui, pet, 'A', low));
      expect(ui.option).toBe(0);
    });

    it('C cancels back to main without starting a game', () => {
      const { ui, pet } = open();
      const out = press(ui, pet, 'C', low);
      expect(out.ui.screen).toBe('main');
      expect(out.ui.rounds).toEqual([]);
    });

    it('B on option 0 starts the guess game, as before', () => {
      const { ui } = startGame(petAt('child'), 'guess');
      expect(ui).toMatchObject({ screen: 'guess', option: 0, rounds: [] });
    });

    it('B on option 1 starts higher or lower with a number shown', () => {
      const { ui } = startGame(petAt('child'), 'highlow', nth(5));
      expect(ui).toMatchObject({ screen: 'highlow', option: 0, rounds: [], shown: 5 });
    });

    it('starts with no number shown', () => {
      expect(createUi().shown).toBeNull();
    });

    it('still refuses a sick, sleeping or egg pet before the chooser opens', () => {
      for (const pet of [petAt('child', { sick: true }), petAt('child', { asleep: true }), petAt('egg')]) {
        expect(open(pet).ui.screen).toBe('main');
      }
    });
  });

  describe('higher or lower', () => {
    it('B plays a round with the shown number and carries the new number forward', () => {
      let { ui, pet } = startGame(petAt('child'), 'highlow', nth(5));
      ({ ui, pet } = press(ui, pet, 'B', nth(8)));
      expect(ui.rounds).toEqual([{ shown: 5, next: 8, choice: 'higher', won: true }]);
      expect(ui.shown).toBe(8);
      expect(ui.screen).toBe('highlow');
    });

    it('A switches the choice to lower', () => {
      let { ui, pet } = startGame(petAt('child'), 'highlow', nth(5));
      ({ ui, pet } = press(ui, pet, 'A', nth(5)));
      expect(ui.option).toBe(1);
      ({ ui } = press(ui, pet, 'B', nth(2)));
      expect(ui.rounds[0]).toMatchObject({ choice: 'lower', won: true });
    });

    it('C cancels back to main without changing the pet', () => {
      const child = petAt('child', { happiness: 2 });
      const { ui, pet } = startGame(child, 'highlow', nth(5));
      const out = press(ui, pet, 'C', nth(5));
      expect(out.ui.screen).toBe('main');
      expect(out.pet).toBe(pet);
    });

    it('rewards two wins out of three after the third round', () => {
      let { ui, pet } = startGame(petAt('child', { happiness: 2 }), 'highlow', nth(5));
      ({ ui, pet } = press(ui, pet, 'B', nth(8))); // higher, win
      ({ ui, pet } = press(ui, pet, 'B', nth(9))); // higher, win
      expect(ui.screen).toBe('highlow');
      ({ ui, pet } = press(ui, pet, 'B', nth(1))); // higher, loss
      expect(ui.screen).toBe('result');
      expect(ui.result).toEqual({ wins: 2, won: true });
      expect(ui.notice).toBe('You win! 😊');
      expect(pet.happiness).toBe(3);
      ({ ui } = press(ui, pet, 'B', nth(1)));
      expect(ui.screen).toBe('main');
    });

    it('loses with a tie and changes nothing', () => {
      let { ui, pet } = startGame(petAt('child', { happiness: 2 }), 'highlow', nth(5));
      for (let i = 0; i < 3; i++) ({ ui, pet } = press(ui, pet, 'B', nth(5)));
      expect(ui.screen).toBe('result');
      expect(ui.notice).toBe('You lose…');
      expect(pet.happiness).toBe(2);
    });
  });

  it('refuses to play when sick, asleep or an egg', () => {
    for (const pet of [petAt('child', { sick: true }), petAt('child', { asleep: true }), petAt('egg')]) {
      const { ui } = press(select(createUi(), 'play'), pet, 'B', low);
      expect(ui.screen).toBe('main');
    }
  });

  it('B on a dead pet starts a new egg', () => {
    const { pet, ui } = press(createUi(), petAt('adult', { stage: 'dead' }), 'B', low);
    expect(pet.stage).toBe('egg');
    expect(ui.screen).toBe('main');
  });

  it('B on the main screen restarts a dead pet with a new egg', () => {
    const { pet } = press(createUi(), petAt('adult', { stage: 'dead' }), 'B', low);
    expect(pet.stage).toBe('egg');
  });

  it('any other press on a dead pet just returns to main without restarting', () => {
    const dead = petAt('adult', { stage: 'dead' });
    const feedUi = { ...createUi(), screen: 'feed' };
    const result = press(feedUi, dead, 'B', low);
    expect(result.pet).toBe(dead);
    expect(result.ui.screen).toBe('main');
  });

  describe('notices', () => {
    const notice = (name, pet) => press(select(createUi(), name), pet, 'B', low).ui.notice;

    it('starts with no notice', () => {
      expect(createUi().notice).toBeNull();
    });

    it('explains a feed that did nothing, via the feed screen confirm', () => {
      let { ui, pet } = press(createUi(), petAt('child', { hunger: 4 }), 'B', low);
      ({ ui, pet } = press(ui, pet, 'B', low));
      expect(ui.screen).toBe('main');
      expect(ui.notice).toBe('Not hungry');
    });

    it('confirms a successful action on the main screen', () => {
      expect(notice('clean', petAt('child', { poop: 1 }))).toBe('All clean!');
      expect(notice('clean', petAt('child'))).toBe('Nothing to clean');
      expect(notice('light', petAt('child'))).toBe("It's daytime");
    });

    it('explains why play is refused', () => {
      expect(notice('play', petAt('egg'))).toBe('Still an egg…');
      expect(notice('play', petAt('child', { asleep: true }))).toBe('Zzz… sleeping');
      expect(notice('play', petAt('child', { sick: true }))).toBe('Too sick to play');
    });

    it('reports the guess game outcome', () => {
      let { ui, pet } = startGame(petAt('child', { happiness: 2 }), 'guess');
      for (let i = 0; i < 3; i++) ({ ui, pet } = press(ui, pet, 'B', low));
      expect(ui.notice).toBe('You win! 😊');
      const lose = () => 0.9;
      ({ ui, pet } = startGame(petAt('child'), 'guess', lose));
      for (let i = 0; i < 3; i++) ({ ui, pet } = press(ui, pet, 'B', lose));
      expect(ui.notice).toBe('You lose…');
    });

    it('clears the notice on the next press', () => {
      let { ui, pet } = press(select(createUi(), 'clean'), petAt('child'), 'B', low);
      expect(ui.notice).toBe('Nothing to clean');
      ({ ui } = press(ui, pet, 'A', low));
      expect(ui.notice).toBeNull();
    });
  });
});

describe('describeAction', () => {
  const child = petAt('child');
  const d = (action, before, after = before) => describeAction(action, before, after);

  it('handles eggs, the dead and sleepers', () => {
    expect(d('feed-meal', petAt('egg'))).toBe('Still an egg…');
    expect(d('feed-meal', petAt('adult', { stage: 'dead' }))).toBeNull();
    expect(d('clean', petAt('child', { asleep: true }))).toBe('Zzz… sleeping');
  });

  it('feeds', () => {
    expect(d('feed-meal', child)).toBe('Not hungry');
    expect(d('feed-meal', child, { ...child, hunger: 3 })).toBe('Yum!');
    expect(d('feed-snack', child)).toBe('Not in the mood');
    expect(d('feed-snack', child, { ...child, happiness: 3 })).toBe('Tasty!');
  });

  it('cleans', () => {
    expect(d('clean', child)).toBe('Nothing to clean');
    expect(d('clean', { ...child, poop: 1 }, child)).toBe('All clean!');
  });

  it('medicates', () => {
    expect(d('medicine', child)).toBe('Not sick');
    const sick = { ...child, sick: true };
    expect(d('medicine', sick, { ...sick, doses: 1 })).toBe('Needs another dose');
    expect(d('medicine', sick, { ...sick, sick: false })).toBe('Feeling better!');
  });

  it('disciplines', () => {
    expect(d('discipline', child)).toBe('No need to scold');
    expect(d('discipline', { ...child, misbehaving: true }, child)).toBe('Learned a lesson');
  });

  it('toggles the light', () => {
    expect(d('toggle-light', child)).toBe("It's daytime");
    const asleep = { ...child, asleep: true, lightOn: true };
    expect(d('toggle-light', asleep, { ...asleep, lightOn: false })).toBe('Light off');
    expect(d('toggle-light', { ...asleep, lightOn: false }, asleep)).toBe('Light on');
  });

  it('has nothing to say about other actions', () => {
    expect(d('play', child)).toBeNull();
  });

  describe('selectMenu', () => {
    it('moves the selection to the named icon and clears the notice', () => {
      const ui = { ...createUi(), notice: 'Yum!' };
      const next = selectMenu(ui, 'status');
      expect(next.menuIndex).toBe(MENU.indexOf('status'));
      expect(next.notice).toBeNull();
      expect(next.screen).toBe('main');
    });

    it('does nothing outside the main screen', () => {
      const ui = { ...createUi(), screen: 'feed' };
      expect(selectMenu(ui, 'status')).toBe(ui);
    });

    it('ignores unknown names', () => {
      const ui = createUi();
      expect(selectMenu(ui, 'nope')).toBe(ui);
    });
  });
});
