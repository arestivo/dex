// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { currentMode, setMode, toggleMode } from '../../src/client/mode.ts'
import { MODE_BOOTSTRAP } from '../../src/core/render/html.ts'

const run = () => new Function(MODE_BOOTSTRAP)()
const attribute = () => document.documentElement.getAttribute('data-color-mode')

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-color-mode')
})

describe('mode bootstrap (first paint)', () => {
  it('applies the saved mode', () => {
    localStorage.setItem('dex:mode', 'dark')
    run()
    expect(attribute()).toBe('dark')
  })

  it('moves a choice saved under the old key to the new one', () => {
    localStorage.setItem('dex:theme', 'dark')
    run()
    expect(attribute()).toBe('dark')
    expect(localStorage.getItem('dex:mode')).toBe('dark')
    expect(localStorage.getItem('dex:theme')).toBeNull()
  })

  it('prefers the new key and drops nothing it does not understand', () => {
    localStorage.setItem('dex:mode', 'light')
    localStorage.setItem('dex:theme', 'dark')
    run()
    expect(attribute()).toBe('light')
  })

  it('follows the OS when nothing valid is saved', () => {
    localStorage.setItem('dex:theme', 'sepia')
    run()
    expect(attribute()).toBeNull()
    expect(localStorage.getItem('dex:mode')).toBeNull()
  })
})

describe('mode toggle', () => {
  it('saves the chosen mode under the new key', () => {
    setMode('light')
    expect(toggleMode()).toBe('dark')
    expect(currentMode()).toBe('dark')
    expect(attribute()).toBe('dark')
    expect(localStorage.getItem('dex:mode')).toBe('dark')
  })
})
