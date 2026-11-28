// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  applySteps,
  back,
  clampSteps,
  describeSteps,
  forward,
  stepsOf,
} from '../../src/client/steps.ts'

describe('slide steps', () => {
  it('reveal one at a time, then advance', () => {
    expect(forward(0, 2)).toEqual({ reveal: 1 })
    expect(forward(1, 2)).toEqual({ reveal: 2 })
    expect(forward(2, 2)).toBe('next-slide')
  })

  it('hide in reverse order, then go back', () => {
    expect(back(2)).toEqual({ reveal: 1 })
    expect(back(1)).toEqual({ reveal: 0 })
    expect(back(0)).toBe('previous-slide')
  })

  it('move straight between slides without steps', () => {
    expect(forward(0, 0)).toBe('next-slide')
    expect(back(0)).toBe('previous-slide')
  })

  it('keep received counts within the slide', () => {
    expect(clampSteps(5, 3)).toBe(3)
    expect(clampSteps(-1, 3)).toBe(0)
    expect(clampSteps(1.7, 3)).toBe(1)
  })

  it('mark the revealed steps by number, not DOM order', () => {
    const slide = document.createElement('section')
    slide.innerHTML =
      '<div data-step="2">b</div><p>always</p><span data-step="1">a</span><li data-step="3">c</li>'
    applySteps(slide, 1)
    const revealed = () =>
      stepsOf(slide)
        .filter((step) => step.hasAttribute('data-revealed'))
        .map((step) => step.textContent)
    expect(revealed()).toEqual(['a'])
    applySteps(slide, 3)
    expect(revealed()).toEqual(['b', 'a', 'c'])
    applySteps(slide, 0)
    expect(revealed()).toEqual([])
  })

  it('describe the position only on slides with steps', () => {
    expect(describeSteps(1, 3)).toBe('step 1 of 3')
    expect(describeSteps(0, 0)).toBe('')
  })
})
