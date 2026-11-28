import {
  LEGACY_MODE_STORAGE_KEY,
  LOADING_ATTRIBUTE,
  LOADING_FALLBACK_MS,
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

/**
 * Hides the page until its script has run (see src/client/main.ts), so readers
 * never see unstyled content (dev) or the stacked slides of the document view
 * (build). Set by script, so pages without JavaScript are never hidden; a
 * timer reveals the page if the script never runs.
 */
export const LOADING_BOOTSTRAP = `(function(r){r.setAttribute(${JSON.stringify(LOADING_ATTRIBUTE)},'');setTimeout(function(){r.removeAttribute(${JSON.stringify(LOADING_ATTRIBUTE)})},${LOADING_FALLBACK_MS})})(document.documentElement)`

const LOADING = `:root[${LOADING_ATTRIBUTE}]`

/**
 * The loading indicator. It must work before Dex's stylesheet exists (dev), and
 * every rule is scoped to the loading state: unlayered, it would beat every layer.
 * A ring in the text colour with an arc in the theme accent, fading in after
 * 300 ms so fast loads never draw it; no spinning with reduced motion.
 */
export const LOADING_STYLE = [
  `${LOADING}{color-scheme:light dark}`,
  `${LOADING}[${MODE_ATTRIBUTE}="light"]{color-scheme:light}`,
  `${LOADING}[${MODE_ATTRIBUTE}="dark"]{color-scheme:dark}`,
  `${LOADING} body{visibility:hidden}`,
  // Hidden is not enough: the browser would still lay out every slide of the
  // deck as one long document before the viewer shows one, about half of the
  // time to the first slide on long decks. Out of layout, they cost nothing.
  `${LOADING} .slide{display:none}`,
  `${LOADING}::after{content:"";position:fixed;top:50%;left:50%;box-sizing:border-box;width:2.5rem;height:2.5rem;margin:-1.25rem 0 0 -1.25rem;border:.25rem solid color-mix(in srgb,currentColor 18%,transparent);border-top-color:var(--color-accent,currentColor);border-radius:50%;opacity:0;animation:dex-loading-in .2s .3s forwards,dex-loading-spin .8s linear infinite}`,
  `@media (prefers-reduced-motion:reduce){${LOADING}::after{animation:dex-loading-in .2s .3s forwards}}`,
  '@keyframes dex-loading-in{to{opacity:1}}',
  '@keyframes dex-loading-spin{to{transform:rotate(1turn)}}',
].join('')

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
    `<script>${MODE_BOOTSTRAP}${assets.scripts.length > 0 ? `;${LOADING_BOOTSTRAP}` : ''}</script>`,
    assets.scripts.length > 0 ? `<style>${LOADING_STYLE}</style>` : '',
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
