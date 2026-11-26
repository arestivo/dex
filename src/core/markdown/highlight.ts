import type { Element } from 'hast'
import type { Root } from 'mdast'
import {
  type BundledLanguage,
  type BundledTheme,
  bundledLanguages,
  createHighlighter,
  type HighlighterGeneric,
} from 'shiki'
import { visit } from 'unist-util-visit'

const THEMES = { light: 'github-light', dark: 'github-dark' } as const

type Highlighter = HighlighterGeneric<BundledLanguage, BundledTheme>

let highlighter: Promise<Highlighter> | undefined

/** Shared, lazily created Shiki highlighter (creating one is expensive). */
function getHighlighter(): Promise<Highlighter> {
  highlighter ??= createHighlighter({ themes: Object.values(THEMES), langs: [] })
  return highlighter
}

export function isKnownLanguage(lang: string): lang is BundledLanguage {
  return Object.hasOwn(bundledLanguages, lang.toLowerCase())
}

/** Code highlighter bound to the languages a set of slides uses. */
export interface CodeHighlighter {
  /** Returns a `<pre>` element; unknown languages render as plain code. */
  highlight(code: string, lang: string | null | undefined): Element
}

/** Loads every language used in `trees` and returns a synchronous highlighter. */
export async function prepareHighlighter(trees: readonly Root[]): Promise<CodeHighlighter> {
  const instance = await getHighlighter()
  const langs = new Set<BundledLanguage>()
  for (const tree of trees) {
    visit(tree, 'code', (node) => {
      if (node.lang && isKnownLanguage(node.lang))
        langs.add(node.lang.toLowerCase() as BundledLanguage)
    })
  }
  await instance.loadLanguage(...langs)

  return {
    highlight(code, lang) {
      const language = lang && isKnownLanguage(lang) ? lang.toLowerCase() : 'text'
      const root = instance.codeToHast(code, {
        lang: language,
        themes: THEMES,
        defaultColor: false,
      })
      const pre = root.children[0]
      if (pre?.type !== 'element') throw new Error('Shiki returned no <pre> element')
      if (lang) pre.properties.dataLanguage = lang
      return pre
    },
  }
}
