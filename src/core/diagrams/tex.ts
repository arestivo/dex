/**
 * Compiles one tikz block for one mode: XeLaTeX → XDV → dvisvgm → SVG, in
 * an isolated temporary folder. This module does file-system and process
 * I/O; the rest of src/core/diagrams is pure.
 */
import { execFile } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'
import { BLOCK_FILE, PALETTE_FILE, wrapperTex } from './wrapper.ts'

const run = promisify(execFile)
const TIMEOUT_MS = 30_000

export interface TexJob {
  /** The block's source (one tikzpicture). */
  readonly source: string
  /** `\ifDexDark` and the colours for this mode. */
  readonly palette: string
  /** Content folder's `tikz/` folder, copied in when it exists. */
  readonly tikzDir?: string | undefined
  /** Deck preamble: its content and its path relative to the content folder. */
  readonly deckPreamble?: { readonly path: string; readonly content: string } | undefined
}

/** Where a TeX error happened: the block (line within it) or a preamble file. */
export interface TexError {
  readonly message: string
  /** `block`, or a path relative to the content folder such as `tikz/preamble.tex`. */
  readonly file: string
  readonly line?: number
}

export type TexResult = { readonly svg: string } | { readonly error: TexError }

export async function compileTikz(job: TexJob): Promise<TexResult> {
  const dir = mkdtempSync(join(tmpdir(), 'dex-tikz-'))
  try {
    const hasFolderPreamble =
      job.tikzDir !== undefined && existsSync(join(job.tikzDir, 'preamble.tex'))
    if (job.tikzDir !== undefined && existsSync(job.tikzDir))
      cpSync(job.tikzDir, join(dir, 'tikz'), { recursive: true })
    if (job.deckPreamble) {
      mkdirSync(dirname(join(dir, job.deckPreamble.path)), { recursive: true })
      writeFileSync(join(dir, job.deckPreamble.path), job.deckPreamble.content)
    }
    const wrapper = wrapperTex({
      folderPreamble: hasFolderPreamble,
      deckPreamble: job.deckPreamble?.path,
    })
    writeFileSync(join(dir, 'main.tex'), wrapper.tex)
    writeFileSync(join(dir, PALETTE_FILE), job.palette)
    writeFileSync(join(dir, BLOCK_FILE), job.source.endsWith('\n') ? job.source : `${job.source}\n`)

    const env = { ...process.env, openin_any: 'p', openout_any: 'p', shell_escape: 'f' }
    try {
      await run(
        'xelatex',
        [
          '-no-pdf',
          '-no-shell-escape',
          '-halt-on-error',
          '-interaction=nonstopmode',
          '-file-line-error',
          'main.tex',
        ],
        { cwd: dir, env, timeout: TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 },
      )
    } catch (error) {
      if ((error as { killed?: boolean }).killed) {
        return {
          error: {
            file: 'block',
            message: `TeX took longer than ${TIMEOUT_MS / 1000}s (an endless loop?).`,
          },
        }
      }
      const log = existsSync(join(dir, 'main.log'))
        ? readFileSync(join(dir, 'main.log'), 'utf8')
        : ''
      return { error: parseTexLog(log, wrapper.inputs) }
    }

    await run('dvisvgm', ['--no-fonts', '--exact-bbox', '--output=main.svg', 'main.xdv'], {
      cwd: dir,
      env,
      timeout: TIMEOUT_MS,
    })
    return { svg: readFileSync(join(dir, 'main.svg'), 'utf8') }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Extracts the first `file:line: message` error from a TeX log (written with
 * -file-line-error) and maps it to the block or a content-folder file.
 * When that error is the "Emergency stop" TeX gives up with, the message is
 * the `!` error before it, which says what went wrong (e.g. a missing file).
 */
export function parseTexLog(log: string, inputs: ReadonlyMap<number, string>): TexError {
  const match = /^(?:\.\/)?([^\s:]+\.tex):(\d+): (.+)$/m.exec(log)
  const bang = /^! (.+)$/m.exec(log)
  if (!match?.[1] || !match[2] || !match[3]) {
    return {
      file: 'block',
      message: explain(bang?.[1] ?? 'TeX failed without an error message (see the TeX log).'),
    }
  }
  const cause =
    match[3].startsWith('Emergency stop') && bang?.[1] !== undefined && bang.index < match.index
      ? bang[1]
      : match[3]
  return locate(match[1], Number(match[2]), explain(cause), inputs)
}

/** Adds how to fix a file TeX can't find: it is almost always a missing package. */
function explain(message: string): string {
  const file = /File `([^']+)' not found/.exec(message)?.[1]
  if (file === undefined) return message
  return `${message} Install the TeX package that provides ${file} (\`dex doctor\` checks the ones Dex needs), or run dex inside the engine's Nix shell (nix develop).`
}

function locate(
  file: string,
  line: number,
  message: string,
  inputs: ReadonlyMap<number, string>,
): TexError {
  if (file === BLOCK_FILE) return { file: 'block', line, message }
  if (file === 'main.tex') {
    // TeX blamed the wrapper (e.g. a brace left open to the end of a preamble):
    // attribute the error to the file that wrapper line inputs, without a line.
    const inputted = inputs.get(line)
    if (inputted === BLOCK_FILE || inputted === undefined) return { file: 'block', message }
    if (inputted === PALETTE_FILE)
      return { file: 'block', message: `Internal palette error: ${message}` }
    return { file: inputted, message }
  }
  return { file, line, message }
}
