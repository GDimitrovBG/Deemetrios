// =====================================================
//  SITE PREFERENCES (palette / display font / density / language)
// =====================================================
//
//  Replaces the `useTweaks` that came from the prototyping harness this site
//  was built in. That version did two things wrong for a live site:
//
//   • it kept the values in component state only, so nothing survived a
//     reload — even though our own cookie policy tells visitors that
//     `areti_tweaks` "Съхранява визуалните настройки на сайта (1 година)";
//   • every change posted an `__edit_mode_set_keys` message to
//     `window.parent`, a design-tool protocol that has no listener in
//     production and leaked our state to whatever frame embedded us.
//
//  This one persists to the key the policy already documents, and validates
//  what it reads back so a stale or hand-edited value can't break theming.
// =====================================================
import { useCallback, useState } from 'react';

const STORE_KEY = 'areti_tweaks';

// Only these keys are persisted, and only to these values. Anything else in
// storage is ignored rather than applied.
const ALLOWED = {
  heroVariant: ['editorial', 'split', 'noir'],
  palette:     ['champagne', 'ivory', 'blush', 'noir'],
  displayFont: ['italiana', 'cormorant', 'playfair', 'didone'],
  density:     ['compact', 'spacious'],
  lang:        ['bg', 'en'],
  showMarquee: [true, false],
};

function readStored() {
  if (typeof window === 'undefined' || window.__PRERENDER__) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    if (!raw || typeof raw !== 'object') return {};
    const out = {};
    for (const [k, allowed] of Object.entries(ALLOWED)) {
      if (allowed.includes(raw[k])) out[k] = raw[k];
    }
    return out;
  } catch { return {}; }
}

function writeStored(values) {
  if (typeof window === 'undefined' || window.__PRERENDER__) return;
  try {
    const out = {};
    for (const [k, allowed] of Object.entries(ALLOWED)) {
      if (allowed.includes(values[k])) out[k] = values[k];
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(out));
  } catch { /* storage blocked — preferences just stay per-session */ }
}

/**
 * `[values, setTweak]`, where setTweak accepts either (key, value) or an
 * object of edits. Stored values override the defaults on first render, so
 * the very first paint is already the visitor's chosen theme — no flash.
 */
export function useTweaks(defaults) {
  const [values, setValues] = useState(() => ({ ...defaults, ...readStored() }));

  const setTweak = useCallback((keyOrEdits, val) => {
    const edits = typeof keyOrEdits === 'object' && keyOrEdits !== null
      ? keyOrEdits : { [keyOrEdits]: val };
    setValues(prev => {
      const next = { ...prev, ...edits };
      writeStored(next);
      return next;
    });
  }, []);

  return [values, setTweak];
}
