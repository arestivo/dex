/**
 * The domain model shared by the build tooling. Everything here is plain
 * data so it can be serialised, tested and passed across module boundaries.
 */
import type { Element, ElementContent } from 'hast'

/** Pattern for deck slugs, slide ids and layout names. */
export const IDENTIFIER_PATTERN = /^[a-z][a-z0-9-]*$/

export const DEFAULT_LAYOUT = 'default'

export interface Author {
  readonly name: string
  readonly url?: string
}

/** Validated deck front matter. */
export interface DeckMeta {
  readonly title: string
  readonly subtitle?: string
  readonly description?: string
  readonly author?: Author
  readonly lang: string
}

/** A layout loaded from `layouts/<name>/`. */
export interface Layout {
  readonly name: string
  /** Template file, relative to the project root (for diagnostics). */
  readonly file: string
  /** Parsed template children. Must be cloned before being filled. */
  readonly template: readonly ElementContent[]
  /** Slot names the template declares; `''` is the default slot. */
  readonly slots: ReadonlySet<string>
  /** The layout stylesheet, already scoped to the layout. */
  readonly css: string
}

export interface RenderedSlide {
  readonly id: string
  readonly number: number
  readonly layout: string
  readonly title: string
  /** 1-based line of the slide's first line in the deck source. */
  readonly line: number
  /** The `<section>` element for the slide. */
  readonly element: Element
}

/** A deck compiled into renderable slides. */
export interface CompiledDeck {
  readonly slug: string
  readonly meta: DeckMeta
  readonly slides: readonly RenderedSlide[]
  /** Asset paths (relative to the deck folder) referenced by the slides. */
  readonly assets: ReadonlySet<string>
}
