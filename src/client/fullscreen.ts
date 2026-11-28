/**
 * Fullscreen for the window the key is pressed in: browsers only let a
 * window make itself fullscreen, in response to the reader's action.
 */

/** Whether this browser lets the page go fullscreen (not iPhone Safari, for one). */
export function fullscreenAvailable(): boolean {
  return document.fullscreenEnabled === true
}

export function isFullscreen(): boolean {
  return document.fullscreenElement !== null
}

/** Enters or leaves fullscreen; `refused` runs when the browser says no. */
export async function toggleFullscreen(refused: () => void): Promise<void> {
  if (!fullscreenAvailable()) return
  try {
    if (isFullscreen()) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    refused()
  }
}

export function onFullscreenChange(listener: (on: boolean) => void): void {
  document.addEventListener('fullscreenchange', () => listener(isFullscreen()))
}
