/** Keyboard shortcuts. `actionForKey` is pure so it can be unit-tested. */

export type Action = 'next' | 'previous' | 'first' | 'last' | 'toggle-mode'

export interface KeyInput {
  readonly key: string
  readonly shiftKey: boolean
  readonly ctrlKey: boolean
  readonly metaKey: boolean
  readonly altKey: boolean
}

export function actionForKey(event: KeyInput): Action | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey) return undefined

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case 'n':
      return 'next'
    case ' ':
      return event.shiftKey ? 'previous' : 'next'
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
    case 'p':
      return 'previous'
    case 'Home':
      return 'first'
    case 'End':
      return 'last'
    case 'd':
      return 'toggle-mode'
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
    const action = actionForKey(event)
    if (action === undefined) return
    event.preventDefault()
    onAction(action)
  })
}
