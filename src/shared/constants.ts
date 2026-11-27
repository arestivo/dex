/** Constants shared by the build (Node) and the viewer (browser). */

/** localStorage key holding the reader's light/dark choice (`light` | `dark`). */
export const MODE_STORAGE_KEY = 'dex:mode'

/** Where earlier versions saved that choice; read once and moved to `MODE_STORAGE_KEY`. */
export const LEGACY_MODE_STORAGE_KEY = 'dex:theme'

/**
 * Attribute on `<html>` that carries the reader's light/dark choice. Not
 * `data-mode`: the viewer already sets that on `.deck` (presentation vs document).
 */
export const MODE_ATTRIBUTE = 'data-color-mode'
