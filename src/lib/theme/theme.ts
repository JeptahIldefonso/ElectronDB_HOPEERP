'use client';

// ========================================================================
// HOPE Group4: ZERO-FLASH, HIGH-PERFORMANCE THEME MODULE
// Strictly operates in the browser via localStorage and useSyncExternalStore.
// Zero React context. Zero page-wide re-renders.
// ========================================================================

export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'hope-theme';

const getMediaQuery = () => {
  if (typeof window === 'undefined') return null;
  return window.matchMedia('(prefers-color-scheme: dark)');
};

const listeners = new Set<() => void>();

/**
 * Reads user theme preference from localStorage.
 * Defaults to 'system' if unset.
 */
export function getPref(): ThemePref {
  if (typeof window === 'undefined') return 'system';
  try {
    const val = localStorage.getItem(KEY);
    return val === 'light' || val === 'dark' ? val : 'system';
  } catch {
    return 'system';
  }
}

/**
 * Resolves 'system' preference to active 'light' | 'dark' state.
 */
export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'system') {
    const mq = getMediaQuery();
    return mq?.matches ? 'dark' : 'light';
  }
  return pref;
}

/**
 * Returns the currently active resolved theme ('light' | 'dark').
 */
export function getResolvedTheme(): 'light' | 'dark' {
  return resolveTheme(getPref());
}

/**
 * Temporarily disables CSS transitions across all elements during theme swap
 * to prevent unsightly color-fading lag, then restores them on next frame.
 */
function withoutTransitions(fn: () => void) {
  if (typeof document === 'undefined') return fn();
  const style = document.createElement('style');
  style.textContent = '*, *::before, *::after { transition: none !important; }';
  document.head.appendChild(style);
  try {
    fn();
    // Force DOM style recalculation flush
    void document.documentElement.offsetHeight;
  } finally {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove();
      });
    });
  }
}

/**
 * Applies the resolved theme to the <html> document root.
 */
function applyTheme(pref: ThemePref) {
  if (typeof document === 'undefined') return;
  const resolved = resolveTheme(pref);
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  root.classList.toggle('dark', resolved === 'dark');

  // Sync meta theme-color tag if present
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#0B1117' : '#F4F4F0');
  }
}

/**
 * Sets user theme preference, saves to localStorage, and notifies listeners.
 */
export function setPref(pref: ThemePref) {
  if (typeof window === 'undefined') return;
  try {
    if (pref === 'system') {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, pref);
    }
  } catch {
    // Graceful fallback if localStorage is disabled
  }

  withoutTransitions(() => {
    applyTheme(pref);
  });

  listeners.forEach((listener) => listener());
}

/**
 * Subscribes to theme changes (cross-tab storage and live OS preference changes).
 */
export function subscribeTheme(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  listeners.add(callback);

  // Sync when another browser tab modifies the theme
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      applyTheme(getPref());
      callback();
    }
  };

  // Live sync when OS switches between light and dark
  const mq = getMediaQuery();
  const onSystemChange = () => {
    if (getPref() === 'system') {
      applyTheme('system');
      callback();
    }
  };

  window.addEventListener('storage', onStorage);
  mq?.addEventListener('change', onSystemChange);

  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', onStorage);
    mq?.removeEventListener('change', onSystemChange);
  };
}
