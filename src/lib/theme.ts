import type { Settings } from './types';

export type Theme = Settings['theme'];

/**
 * Apply the chosen theme. 'auto' removes the override so the CSS
 * prefers-color-scheme media query governs (and tracks OS changes live);
 * 'light' / 'dark' force the palette via a [data-theme] attribute.
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.dataset.theme = theme;
  }
}
