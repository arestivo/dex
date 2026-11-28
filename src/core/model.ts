/**
 * The domain model shared by the build tooling. Everything here is plain
 * data so it can be serialised, tested and passed across module boundaries.
 */
import type { Element, ElementContent } from 'hast'

/** Pattern for deck slugs, slide ids and layout names. */
export const IDENTIFIER_PATTERN = /^[a-z][a-z0-9-]*$/

export const DEFAULT_LAYOUT = 'default'

/** The theme used when neither the deck nor `dex.yaml` names one: today's colours. */
export const DEFAULT_THEME = 'default'

/** Where a theme comes from: the engine or the content folder's `themes/`. */
export type ThemeOrigin = 'built-in' | 'local'

/** One colour in both modes: six-digit uppercase hex, without `#`. */
export interface ModeColour {
  readonly light: string
  readonly dark: string
}

export interface Theme {
  readonly name: string
  readonly origin: ThemeOrigin
  /** `theme.css`, relative to the content folder (for diagnostics). */
  readonly file: string
  /** One line from `theme.md`'s front matter; `''` when missing. */
  readonly description: string
  /** Body of `theme.md`; `undefined` when there is no `theme.md`. */
  readonly notes: string | undefined
  /** The tokens this theme sets (without `--`); others keep the default values. */
  readonly colours: ReadonlyMap<string, ModeColour>
  /** Line of each token in `theme.css`, for diagnostics. */
  readonly lines: ReadonlyMap<string, number>
  /** The theme's CSS, scoped to `:root[data-theme="<name>"]`. */
  readonly css: string
}

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
  /** The colour theme named in the front matter, if any. */
  readonly theme?: string
  /** Whether builds publish the speaker notes (unset: the folder decides). */
  readonly publishNotes?: boolean
}

/** Where a layout comes from: the engine, the content folder's layouts/, or one deck's layouts/. */
export type LayoutOrigin = 'built-in' | 'local' | 'deck'

/** A layout loaded from `layouts/<name>/` (engine, content folder or deck). */
export interface Layout {
  readonly name: string
  readonly origin: LayoutOrigin
  /** The deck a `deck` layout belongs to (its slug). */
  readonly deck?: string
  /** Template file, relative to the content folder (for diagnostics). */
  readonly file: string
  /** One line from `layout.md`'s front matter; `''` when missing. */
  readonly description: string
  /** Body of `layout.md` (usage notes); `undefined` when there is no `layout.md`. */
  readonly notes: string | undefined
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
  /** The speaker notes, rendered; absent when the slide has none. */
  readonly notes?: readonly ElementContent[]
}

/** A deck compiled into renderable slides. */
export interface CompiledDeck {
  readonly slug: string
  readonly meta: DeckMeta
  readonly slides: readonly RenderedSlide[]
  /** The colour theme the deck uses (front matter, else `dex.yaml`, else `default`). */
  readonly theme: string
  /** Asset paths (relative to the deck folder) referenced by the slides. */
  readonly assets: ReadonlySet<string>
  /** Assets only the speaker notes reference: published only with the notes. */
  readonly noteAssets: ReadonlySet<string>
}
