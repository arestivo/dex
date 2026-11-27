/**
 * The standalone document every tikz block is compiled in. Changing it
 * changes every diagram, so it is part of the cache key (WRAPPER_VERSION).
 */

export const WRAPPER_VERSION = '1'
export const FOLDER_PREAMBLE = 'tikz/preamble.tex'
export const PALETTE_FILE = 'dex-palette.tex'
export const BLOCK_FILE = 'block.tex'

export interface WrapperOptions {
  readonly folderPreamble: boolean
  /** Path of the deck preamble relative to the content folder, e.g. `decks/talk/tikz.tex`. */
  readonly deckPreamble?: string | undefined
}

export interface Wrapper {
  readonly tex: string
  /** 1-based wrapper line → the file it inputs (for errors TeX blames on the wrapper). */
  readonly inputs: ReadonlyMap<number, string>
}

export function wrapperTex(options: WrapperOptions): Wrapper {
  const lines: string[] = [
    // PGF's default XeTeX driver emits PDF specials that dvisvgm ignores.
    '\\def\\pgfsysdriver{pgfsys-dvisvgm.def}',
    '\\documentclass[tikz,border=1pt]{standalone}',
    '\\usepackage[sfdefault]{FiraSans}',
    '\\usepackage{FiraMono}',
    '\\usetikzlibrary{arrows.meta,positioning,calc,fit,backgrounds,shapes.geometric}',
  ]
  const inputs = new Map<number, string>()
  const input = (file: string) => {
    lines.push(`\\input{${file}}`)
    inputs.set(lines.length, file)
  }
  input(PALETTE_FILE)
  if (options.folderPreamble) input(FOLDER_PREAMBLE)
  if (options.deckPreamble !== undefined) input(options.deckPreamble)
  lines.push('\\begin{document}\\color{DexInk}%')
  input(BLOCK_FILE)
  lines.push('\\end{document}')
  return { tex: `${lines.join('\n')}\n`, inputs }
}
