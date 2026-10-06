export const PREFS_KEY = 'virtual-pet-prefs';
export const DEFAULT_PREFS = { sound: true, music: true };

// Bad JSON, wrong types or a throwing storage must never stop the game: use defaults.
export function loadPrefs(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(PREFS_KEY));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...DEFAULT_PREFS };
    const pick = (key) => (typeof parsed[key] === 'boolean' ? parsed[key] : DEFAULT_PREFS[key]);
    return { sound: pick('sound'), music: pick('music') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(prefs, storage = localStorage) {
  try {
    storage.setItem(PREFS_KEY, JSON.stringify({ sound: prefs.sound, music: prefs.music }));
  } catch {
    // ignore: preferences just won't persist
  }
}
