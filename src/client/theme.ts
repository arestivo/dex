/** Light/dark theme: follows the OS unless the user overrides it. */
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from '../shared/constants.ts'

export type Theme = 'light' | 'dark'

const darkQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)')

export function currentTheme(): Theme {
  const override = document.documentElement.getAttribute(THEME_ATTRIBUTE)
  if (override === 'light' || override === 'dark') return override
  return darkQuery().matches ? 'dark' : 'light'
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute(THEME_ATTRIBUTE, theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be unavailable (privacy mode); the toggle still works for this visit.
  }
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

/** Calls `listener` when the effective theme changes because of the OS. */
export function onSystemThemeChange(listener: () => void): void {
  darkQuery().addEventListener('change', listener)
}
