import { describe, it, expect } from 'vitest';
import { loadPrefs, savePrefs, PREFS_KEY, DEFAULT_PREFS } from '../src/ui/prefs.js';

const memory = (initial = {}) => {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    data,
  };
};

describe('prefs', () => {
  it('defaults to sound and music on', () => {
    expect(loadPrefs(memory())).toEqual({ sound: true, music: true });
    expect(DEFAULT_PREFS).toEqual({ sound: true, music: true });
  });

  it('round-trips saved values', () => {
    const s = memory();
    savePrefs({ sound: false, music: true }, s);
    expect(loadPrefs(s)).toEqual({ sound: false, music: true });
    savePrefs({ sound: true, music: false }, s);
    expect(loadPrefs(s)).toEqual({ sound: true, music: false });
  });

  it('stores under one key', () => {
    const s = memory();
    savePrefs({ sound: false, music: false }, s);
    expect(Object.keys(s.data)).toEqual([PREFS_KEY]);
    expect(PREFS_KEY).toBe('virtual-pet-prefs');
  });

  it('falls back to defaults on bad JSON', () => {
    expect(loadPrefs(memory({ [PREFS_KEY]: '{nope' }))).toEqual(DEFAULT_PREFS);
  });

  it.each(['null', '42', '"x"', '[]', 'true'])('falls back to defaults on non-object %s', (raw) => {
    expect(loadPrefs(memory({ [PREFS_KEY]: raw }))).toEqual(DEFAULT_PREFS);
  });

  it('ignores fields with the wrong type, keeping valid ones', () => {
    const s = memory({ [PREFS_KEY]: JSON.stringify({ sound: 'no', music: false }) });
    expect(loadPrefs(s)).toEqual({ sound: true, music: false });
  });

  it('survives a storage that throws', () => {
    const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
    expect(loadPrefs(bad)).toEqual(DEFAULT_PREFS);
    expect(() => savePrefs({ sound: false, music: false }, bad)).not.toThrow();
  });
});
