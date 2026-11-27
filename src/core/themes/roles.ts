/**
 * What each colour token colours, for the themes reference and starter
 * themes. A test checks that every colour token of `tokens.css` is here.
 */
export const TOKEN_ROLES: Readonly<Record<string, string>> = {
  'color-bg': 'slide background',
  'color-page': 'page behind the slides (presentation margins, document view)',
  'color-surface': 'raised surfaces: `kbd` keys, viewer buttons',
  'color-text': 'body text and headings',
  'color-muted': 'secondary text: slide numbers, captions, `.muted`',
  'color-border': 'rules, table and code borders',
  'color-accent': 'the theme colour: links, emphasis in layouts, diagrams (`DexAccent`)',
  'color-link': 'links (follows `--color-accent` unless set)',
  'color-highlight': '`<mark>` text background',
  'color-search-match': 'background of search matches (Ctrl+F in the viewer)',
  'color-search-current': 'background of the current search match',
  'color-search-text': 'text of search matches',
  'color-inverse-bg': 'title and section slides background (`DexInverse`)',
  'color-inverse-text': 'text on title and section slides (`DexInverseText`)',
  'color-inverse-muted': 'secondary text on title slides (subtitle, author)',
  'color-inverse-link': 'links on title and section slides',
  'tone-info': '`:::info` callouts, and `DexInfo` in diagrams',
  'tone-info-bg': '`:::info` background, and `DexAccentSoft`/`DexInfoSoft` in diagrams',
  'tone-warning': '`:::warning` callouts',
  'tone-warning-bg': '`:::warning` background',
  'tone-error': '`:::error` callouts',
  'tone-error-bg': '`:::error` background',
  'tone-success': '`:::success` callouts',
  'tone-success-bg': '`:::success` background',
  'tone-example': '`:::example` callouts',
  'tone-example-bg': '`:::example` background',
  'code-bg': 'code block background',
  'code-inline-bg': 'inline `code` background',
}
