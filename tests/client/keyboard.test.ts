// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { actionForKey, isEditable } from '../../src/client/keyboard.ts'

const key = (
  k: string,
  modifiers: Partial<Record<'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {},
) => ({
  key: k,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...modifiers,
})

describe('actionForKey', () => {
  it.each(['ArrowRight', 'ArrowDown', 'PageDown', 'n', ' '])('%j goes to the next slide', (k) => {
    expect(actionForKey(key(k))).toBe('next')
  })

  it.each(['ArrowLeft', 'ArrowUp', 'PageUp', 'p'])('%j goes to the previous slide', (k) => {
    expect(actionForKey(key(k))).toBe('previous')
  })

  it('Shift+Space goes back', () => {
    expect(actionForKey(key(' ', { shiftKey: true }))).toBe('previous')
  })

  it('Home, End and d', () => {
    expect(actionForKey(key('Home'))).toBe('first')
    expect(actionForKey(key('End'))).toBe('last')
    expect(actionForKey(key('d'))).toBe('toggle-theme')
  })

  it('leaves shortcuts with modifiers to the browser', () => {
    expect(actionForKey(key('ArrowRight', { altKey: true }))).toBeUndefined()
    expect(actionForKey(key('d', { metaKey: true }))).toBeUndefined()
    expect(actionForKey(key('p', { ctrlKey: true }))).toBeUndefined()
  })
})

describe('isEditable', () => {
  it('detects form fields and contenteditable', () => {
    document.body.innerHTML =
      '<input id="i"><div id="c" contenteditable="true"><span id="s"></span></div><p id="p"></p>'
    expect(isEditable(document.getElementById('i'))).toBe(true)
    expect(isEditable(document.getElementById('s'))).toBe(true)
    expect(isEditable(document.getElementById('p'))).toBe(false)
    expect(isEditable(null)).toBe(false)
  })
})
