/**
 * The presenter timer: elapsed time that starts at the first slide change and
 * can be paused, resumed and reset. Pure: callers pass the current time (ms),
 * so it never drifts and is easy to test.
 */

export interface TimerState {
  /** Elapsed time banked before the current run. */
  readonly banked: number
  /** When the current run started; undefined while stopped or paused. */
  readonly since: number | undefined
  /** False until the first start: the timer waits for the talk to begin. */
  readonly started: boolean
}

export const IDLE_TIMER: TimerState = { banked: 0, since: undefined, started: false }

export function elapsed(state: TimerState, now: number): number {
  return state.banked + (state.since === undefined ? 0 : now - state.since)
}

/** Starts the timer the first time; later calls change nothing. */
export function startOnce(state: TimerState, now: number): TimerState {
  return state.started ? state : { banked: 0, since: now, started: true }
}

export function running(state: TimerState): boolean {
  return state.since !== undefined
}

/** Pauses a running timer, or resumes (or starts) a stopped one. */
export function toggle(state: TimerState, now: number): TimerState {
  if (state.since !== undefined) return { ...state, banked: elapsed(state, now), since: undefined }
  return { ...state, since: now, started: true }
}

/** Back to zero; keeps running if it was running. */
export function reset(state: TimerState, now: number): TimerState {
  return { banked: 0, since: state.since === undefined ? undefined : now, started: state.started }
}

/** `mm:ss`, or `h:mm:ss` from one hour. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const two = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${two(minutes)}:${two(seconds)}`
}
