/** Keyboard shortcuts. `actionForKey` is pure so it can be unit-tested. */

export type Action =
  | 'next'
  | 'previous'
  | 'first'
  | 'last'
  | 'toggle-mode'
  | 'presenter'
  | 'fullscreen'
  | 'blank'
  | 'unblank'
  | 'help'

/** The deck window, or the presenter window. */
export type ViewerWindow = 'deck' | 'presenter'

export interface Shortcut {
  /** `KeyboardEvent.key` values that trigger it. */
  readonly keys: readonly string[]
  /** Only with Shift (true), only without (false), or either (absent). */
  readonly shift?: boolean
  readonly action: Action
  /** How the help shows the keys. */
  readonly shown: readonly string[]
  /** What it does, for the help. */
  readonly label: string
  readonly windows: readonly ViewerWindow[]
  /** Left out of the help (it is mentioned in another entry's label). */
  readonly hidden?: boolean
}

const BOTH: readonly ViewerWindow[] = ['deck', 'presenter']

/**
 * Every shortcut, once: the keyboard handler and the help overlay both read
 * this table, so the help can't drift from the real keys.
 */
export const SHORTCUTS: readonly Shortcut[] = [
  {
    keys: ['ArrowRight', 'ArrowDown', 'PageDown', 'n'],
    action: 'next',
    shown: ['→', '↓', 'Space', 'PageDown', 'n'],
    label: 'Next step, or next slide',
    windows: BOTH,
  },
  {
    keys: ['ArrowLeft', 'ArrowUp', 'PageUp', 'p'],
    action: 'previous',
    shown: ['←', '↑', 'Shift+Space', 'PageUp', 'p'],
    label: 'Previous step, or previous slide',
    windows: BOTH,
  },
  // Space goes forward, Shift+Space back.
  { keys: [' '], shift: false, action: 'next', shown: [], label: '', windows: BOTH, hidden: true },
  {
    keys: [' '],
    shift: true,
    action: 'previous',
    shown: [],
    label: '',
    windows: BOTH,
    hidden: true,
  },
  { keys: ['Home'], action: 'first', shown: ['Home'], label: 'First slide', windows: BOTH },
  { keys: ['End'], action: 'last', shown: ['End'], label: 'Last slide', windows: BOTH },
  {
    keys: ['f'],
    action: 'fullscreen',
    shown: ['f'],
    label: 'Fullscreen on or off',
    windows: BOTH,
  },
  {
    keys: ['b', '.'],
    action: 'blank',
    shown: ['b', '.'],
    label: "Blank the audience's screen, or bring the slide back (also Esc)",
    windows: BOTH,
  },
  { keys: ['Escape'], action: 'unblank', shown: [], label: '', windows: BOTH, hidden: true },
  { keys: ['d'], action: 'toggle-mode', shown: ['d'], label: 'Light or dark mode', windows: BOTH },
  {
    keys: ['s'],
    action: 'presenter',
    shown: ['s'],
    label: 'Open the presenter window: notes, next slide, timer',
    windows: ['deck'],
  },
  {
    keys: ['?', 'h'],
    action: 'help',
    shown: ['?', 'h'],
    label: 'Show these shortcuts',
    windows: BOTH,
  },
]

export interface KeyInput {
  readonly key: string
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly altKey: boolean
}

export function actionForKey(event: KeyInput): Action | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined
  const shortcut = SHORTCUTS.find(
    (entry) =>
      entry.keys.includes(event.key) &&
      (entry.shift === undefined || entry.shift === event.shiftKey),
  )
  return shortcut?.action
}

export type SearchAction = 'open' | 'next' | 'previous' | 'close'

export interface SearchState {
  /** The search bar is shown. */
  readonly open: boolean
  /** Focus is in the search field. */
  readonly inField: boolean
}

/**
 * Search keys: Ctrl+F (Cmd+F) always opens the bar; F3, Esc and, in the
 * field, Enter only act while it is open. Everything else is left alone.
 */
export function searchKeyAction(event: KeyInput, state: SearchState): SearchAction | undefined {
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'f') {
    return 'open'
  }
  if (!state.open || event.ctrlKey || event.metaKey || event.altKey) return undefined
  switch (event.key) {
    case 'Escape':
      return 'close'
    case 'F3':
      return event.shiftKey ? 'previous' : 'next'
    case 'Enter':
      if (!state.inField) return undefined
      return event.shiftKey ? 'previous' : 'next'
    default:
      return undefined
  }
}

/** True when keystrokes should go to the element rather than the viewer. */
export function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return (
    target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]') !==
    null
  )
}

export function listenForKeys(onAction: (action: Action) => void): void {
  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || isEditable(event.target)) return
    // A modal dialog (the help) has the keys while it is open.
    if (event.target instanceof Element && event.target.closest('dialog[open]') !== null) return
    const action = actionForKey(event)
    if (action === undefined) return
    event.preventDefault()
    onAction(action)
  })
}
