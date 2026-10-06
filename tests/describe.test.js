import { describe, it, expect } from 'vitest';
import { describePet } from '../src/ui/describe.js';
import { createUi } from '../src/ui/controller.js';
import { petAt } from './helpers.js';

const ui = (over = {}) => ({ ...createUi(), ...over });

describe('describePet', () => {
  it('describes an egg', () => {
    expect(describePet(petAt('egg'), ui())).toBe('An egg. It will hatch soon.');
  });

  it('describes a baby with hearts and the selected menu item', () => {
    expect(describePet(petAt('baby'), ui())).toBe(
      'Baby. Hunger 4 of 4, happiness 4 of 4. Menu: Feed.',
    );
  });

  it('names the character for teens and adults, capitalised', () => {
    expect(describePet(petAt('teen', { character: 'mochi', hunger: 3, happiness: 2 }), ui()))
      .toMatch(/^Teen Mochi\. Hunger 3 of 4, happiness 2 of 4\./);
    expect(describePet(petAt('adult', { character: 'sparky' }), ui())).toMatch(/^Adult Sparky\./);
  });

  it('omits the character when there is none', () => {
    expect(describePet(petAt('child'), ui())).toMatch(/^Child\. /);
  });

  it('pluralises poop and omits it when zero', () => {
    expect(describePet(petAt('child', { poop: 1 }), ui())).toContain('1 poop pile.');
    expect(describePet(petAt('child', { poop: 2 }), ui())).toContain('2 poop piles.');
    expect(describePet(petAt('child', { poop: 0 }), ui())).not.toContain('poop');
  });

  it('mentions sick, misbehaving and calling only when true', () => {
    const calm = describePet(petAt('child'), ui());
    expect(calm).not.toMatch(/Sick|Misbehaving|Calling/);
    const bad = describePet(
      petAt('child', { sick: true, misbehaving: true, needsAttention: true }), ui());
    expect(bad).toContain('Sick.');
    expect(bad).toContain('Misbehaving.');
    expect(bad).toContain('Calling for attention.');
  });

  it('says whether a sleeping pet has the light on or off', () => {
    expect(describePet(petAt('child', { asleep: true, lightOn: false }), ui()))
      .toContain('Asleep, light off.');
    expect(describePet(petAt('child', { asleep: true, lightOn: true }), ui()))
      .toContain('Asleep, light on.');
  });

  it('describes a dead pet', () => {
    expect(describePet(petAt('dead'), ui())).toBe('Your pet has died. Press B for a new egg.');
  });

  it('names the selected menu item on the main screen', () => {
    expect(describePet(petAt('child'), ui({ menuIndex: 5 }))).toContain('Menu: Status.');
  });

  it('describes open screens instead of the menu', () => {
    const pet = petAt('child');
    expect(describePet(pet, ui({ screen: 'status' }))).toMatch(/Status screen open\.$/);
    expect(describePet(pet, ui({ screen: 'feed' }))).toMatch(/Feed menu\.$/);
    expect(describePet(pet, ui({ screen: 'guess', rounds: [{}] }))).toMatch(/Mini-game: round 2 of 3\.$/);
    expect(describePet(pet, ui({ screen: 'result' }))).toMatch(/Mini-game finished\.$/);
    expect(describePet(pet, ui({ screen: 'status' }))).not.toContain('Menu:');
  });

  it('describes the play chooser with the selected game', () => {
    const pet = petAt('child');
    expect(describePet(pet, ui({ screen: 'play', option: 0 }))).toMatch(/Play menu: Left or Right selected\.$/);
    expect(describePet(pet, ui({ screen: 'play', option: 1 }))).toMatch(/Play menu: Higher or Lower selected\.$/);
  });

  it('describes higher or lower with the number, round and current choice', () => {
    const pet = petAt('child');
    expect(describePet(pet, ui({ screen: 'highlow', shown: 5, rounds: [{}], option: 0 })))
      .toMatch(/Higher or lower: number 5, round 2 of 3, guessing higher\.$/);
    expect(describePet(pet, ui({ screen: 'highlow', shown: 9, rounds: [], option: 1 })))
      .toMatch(/Higher or lower: number 9, round 1 of 3, guessing lower\.$/);
  });
});
