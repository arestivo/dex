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

/** On <html> while the page script hasn't run yet: content hidden, loading indicator shown. */
export const LOADING_ATTRIBUTE = 'data-loading'

/** After this long, a page whose script never ran is revealed anyway (as a document). */
export const LOADING_FALLBACK_MS = 5000
