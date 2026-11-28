/**
 * The shortcut help: a modal <dialog> listing the shortcuts of the window it
 * is opened in, from the same table the keyboard handler uses (keyboard.ts).
 * The dialog gives focus trapping, the dialog role and Esc for free; a click
 * on its backdrop, or ? and h, close it too.
 */
import { element } from './chrome.ts'
import { SHORTCUTS, type ViewerWindow } from './keyboard.ts'

/** Entries that aren't single keys, so they aren't in SHORTCUTS. */
export interface HelpEntry {
  readonly shown: readonly string[]
  readonly label: string
}

export interface Help {
  toggle(): void
}

export function createHelp(
  window: ViewerWindow,
  extra: { readonly title: string; readonly entries: readonly HelpEntry[] }[] = [],
): Help {
  let dialog: HTMLDialogElement | undefined

  function build(): HTMLDialogElement {
    const box = element('dialog', 'viewer-help', { 'aria-labelledby': 'viewer-help-title' })
    const title = element('h2', 'viewer-help__title', { id: 'viewer-help-title' })
    title.textContent = 'Keyboard shortcuts'
    const keys = SHORTCUTS.filter((entry) => !entry.hidden && entry.windows.includes(window))
    box.append(title, list(keys))
    for (const group of extra) {
      const heading = element('h3', 'viewer-help__heading')
      heading.textContent = group.title
      box.append(heading, list(group.entries))
    }
    const hint = element('p', 'viewer-help__hint')
    hint.textContent = 'Esc or ? closes this.'
    box.append(hint)
    // A click on the dialog itself, not its content, is a click on the backdrop.
    box.addEventListener('click', (event) => {
      if (event.target === box) box.close()
    })
    box.addEventListener('keydown', (event) => {
      if ((event.key === '?' || event.key === 'h') && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        box.close()
      }
    })
    document.body.append(box)
    return box
  }

  return {
    toggle() {
      dialog ??= build()
      if (dialog.open) dialog.close()
      else dialog.showModal()
    },
  }
}

function list(entries: readonly HelpEntry[]): HTMLDListElement {
  const dl = element('dl', 'viewer-help__list')
  for (const entry of entries) {
    const keys = element('dt', 'viewer-help__keys')
    for (const [index, key] of entry.shown.entries()) {
      if (index > 0) keys.append(' ')
      const kbd = element('kbd', 'viewer-help__key')
      kbd.textContent = key
      keys.append(kbd)
    }
    const what = element('dd', 'viewer-help__label')
    what.textContent = entry.label
    dl.append(keys, what)
  }
  return dl
}
