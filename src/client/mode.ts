/** Light/dark mode: follows the OS unless the user chooses one. */
import { MODE_ATTRIBUTE, MODE_STORAGE_KEY } from '../shared/constants.ts'

export type Mode = 'light' | 'dark'

const darkQuery = (): MediaQueryList => window.matchMedia('(prefers-color-scheme: dark)')

export function currentMode(): Mode {
  const chosen = document.documentElement.getAttribute(MODE_ATTRIBUTE)
  if (chosen === 'light' || chosen === 'dark') return chosen
  return darkQuery().matches ? 'dark' : 'light'
}

export function setMode(mode: Mode): void {
  document.documentElement.setAttribute(MODE_ATTRIBUTE, mode)
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch {
    // Storage can be unavailable (privacy mode); the toggle still works for this visit.
  }
}

export function toggleMode(): Mode {
  const next: Mode = currentMode() === 'dark' ? 'light' : 'dark'
  setMode(next)
  return next
}

/** Calls `listener` when the effective mode changes because of the OS. */
export function onSystemModeChange(listener: () => void): void {
  darkQuery().addEventListener('change', listener)
}
