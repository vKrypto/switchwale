export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'switchwala-theme';

// The <head> bootstrap script in index.html / contact/index.html already
// applied the right class before this module ever loads, so reading the
// DOM back is simpler and can't drift from what's on screen.
export function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // private browsing / storage disabled — theme just won't persist
  }
}
