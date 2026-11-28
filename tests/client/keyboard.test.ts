// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { actionForKey, isEditable, searchKeyAction } from '../../src/client/keyboard.ts'

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
    expect(actionForKey(key('d'))).toBe('toggle-mode')
    expect(actionForKey(key('s'))).toBe('presenter')
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

describe('searchKeyAction', () => {
  const closed = { open: false, inField: false }
  const open = { open: true, inField: false }
  const typing = { open: true, inField: true }

  it('opens with Ctrl+F or Cmd+F, whatever the state', () => {
    for (const state of [closed, open, typing]) {
      expect(searchKeyAction(key('f', { ctrlKey: true }), state)).toBe('open')
      expect(searchKeyAction(key('f', { metaKey: true }), state)).toBe('open')
      expect(searchKeyAction(key('F', { ctrlKey: true, shiftKey: true }), state)).toBe('open')
    }
    expect(searchKeyAction(key('f', { ctrlKey: true, altKey: true }), closed)).toBeUndefined()
    expect(searchKeyAction(key('f'), closed)).toBeUndefined()
  })

  it('moves with F3 and Shift+F3 while open, wherever the focus is', () => {
    expect(searchKeyAction(key('F3'), open)).toBe('next')
    expect(searchKeyAction(key('F3', { shiftKey: true }), open)).toBe('previous')
    expect(searchKeyAction(key('F3'), typing)).toBe('next')
  })

  it('moves with Enter and Shift+Enter only in the field', () => {
    expect(searchKeyAction(key('Enter'), typing)).toBe('next')
    expect(searchKeyAction(key('Enter', { shiftKey: true }), typing)).toBe('previous')
    expect(searchKeyAction(key('Enter'), open)).toBeUndefined()
  })

  it('closes with Esc', () => {
    expect(searchKeyAction(key('Escape'), open)).toBe('close')
    expect(searchKeyAction(key('Escape'), typing)).toBe('close')
  })

  it('leaves F3, Esc and Enter to the browser while closed', () => {
    for (const k of ['F3', 'Escape', 'Enter'])
      expect(searchKeyAction(key(k), closed)).toBeUndefined()
  })

  it('does not change the navigation keys', () => {
    expect(actionForKey(key('ArrowRight'))).toBe('next')
    expect(actionForKey(key('f', { ctrlKey: true }))).toBeUndefined()
    expect(searchKeyAction(key('ArrowRight'), open)).toBeUndefined()
  })
})
