import {
  LEGACY_MODE_STORAGE_KEY,
  MODE_ATTRIBUTE,
  MODE_STORAGE_KEY,
} from '../../shared/constants.ts'

/** Script and stylesheet URLs to reference from a page, already relative to it. */
export interface PageAssets {
  readonly scripts: readonly string[]
  readonly styles: readonly string[]
  /** Extra markup for `<head>` (e.g. the Vite dev client). */
  readonly head?: string
}

export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Applies the reader's saved light/dark mode before first paint, avoiding a
 * flash of the wrong mode. A choice saved under the old key is moved to the new one.
 */
export const MODE_BOOTSTRAP = `try{var s=localStorage,k=${JSON.stringify(MODE_STORAGE_KEY)},o=${JSON.stringify(LEGACY_MODE_STORAGE_KEY)},m=s.getItem(k);if(m===null){m=s.getItem(o);if(m==='light'||m==='dark')s.setItem(k,m);s.removeItem(o)}if(m==='light'||m==='dark')document.documentElement.setAttribute(${JSON.stringify(MODE_ATTRIBUTE)},m)}catch(e){}`

const FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect x='1' y='3' width='14' height='10' rx='2' fill='%232563eb'/%3E%3C/svg%3E"

export interface DocumentOptions {
  readonly lang: string
  readonly title: string
  readonly description?: string | undefined
  readonly assets: PageAssets
  readonly body: string
  /** The colour theme, set on `<html data-theme>` so it applies before any script runs. */
  readonly theme?: string | undefined
}

/** Wraps `body` in a complete HTML document. */
export function htmlDocument(options: DocumentOptions): string {
  const { lang, title, description, assets, body, theme } = options
  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light dark">',
    `<title>${escapeHtml(title)}</title>`,
    description ? `<meta name="description" content="${escapeHtml(description)}">` : '',
    `<link rel="icon" href="${FAVICON}">`,
    `<script>${MODE_BOOTSTRAP}</script>`,
    ...assets.styles.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`),
    ...assets.scripts.map((src) => `<script type="module" src="${escapeHtml(src)}"></script>`),
    assets.head ?? '',
  ].filter(Boolean)

  return `<!doctype html>
<html lang="${escapeHtml(lang)}"${theme === undefined ? '' : ` data-theme="${escapeHtml(theme)}"`}>
<head>
${head.map((line) => `  ${line}`).join('\n')}
</head>
<body>
${body}
</body>
</html>
`
}
