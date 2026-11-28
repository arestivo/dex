import { describe, expect, it } from 'vitest'
import {
  elapsed,
  formatElapsed,
  IDLE_TIMER,
  reset,
  running,
  startOnce,
  toggle,
} from '../../src/client/timer.ts'

describe('presenter timer', () => {
  it('waits at zero until started, then counts', () => {
    expect(elapsed(IDLE_TIMER, 5000)).toBe(0)
    expect(running(IDLE_TIMER)).toBe(false)
    const started = startOnce(IDLE_TIMER, 1000)
    expect(elapsed(started, 4000)).toBe(3000)
    // Later slide changes don't restart it.
    expect(startOnce(started, 3000)).toBe(started)
  })

  it('pauses, resumes and resets', () => {
    const started = startOnce(IDLE_TIMER, 0)
    const paused = toggle(started, 10_000)
    expect(running(paused)).toBe(false)
    expect(elapsed(paused, 60_000)).toBe(10_000)
    const resumed = toggle(paused, 60_000)
    expect(elapsed(resumed, 65_000)).toBe(15_000)
    const zero = reset(resumed, 70_000)
    expect(elapsed(zero, 72_000)).toBe(2000)
    expect(elapsed(reset(paused, 99_000), 120_000)).toBe(0)
  })

  it('can be started by hand before the first slide change', () => {
    const started = toggle(IDLE_TIMER, 500)
    expect(started.started).toBe(true)
    expect(elapsed(started, 1500)).toBe(1000)
  })

  it('formats as mm:ss, then h:mm:ss', () => {
    expect(formatElapsed(0)).toBe('00:00')
    expect(formatElapsed(312_400)).toBe('05:12')
    expect(formatElapsed(3_600_000 + 65_000)).toBe('1:01:05')
    expect(formatElapsed(-5)).toBe('00:00')
  })
})
