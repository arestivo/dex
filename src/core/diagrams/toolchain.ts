/**
 * Finds the external programs and TeX files diagram rendering needs.
 * File-system and process access: one of the I/O modules of `core/`.
 */
import { execFileSync } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { basename, delimiter, join } from 'node:path'

export const TEX_PROGRAMS = ['xelatex', 'dvisvgm'] as const

/** Finds files through TeX's own search paths, without running TeX. */
const KPSEWHICH = 'kpsewhich'

export interface TexFile {
  /** What TeX looks for, e.g. `standalone.cls`. */
  readonly file: string
  /** The TeX Live package that provides it. */
  readonly package: string
}

/** The files every diagram loads (see wrapper.ts; a test keeps the two in step). */
export const TEX_FILES: readonly TexFile[] = [
  { file: 'standalone.cls', package: 'standalone' },
  { file: 'tikz.sty', package: 'pgf' },
  { file: 'pgfsys-dvisvgm.def', package: 'pgf' },
  { file: 'fontspec.sty', package: 'fontspec' },
  { file: 'FiraSans.sty', package: 'fira' },
  { file: 'FiraMono.sty', package: 'fira' },
]

export interface MissingTex {
  readonly programs: readonly string[]
  readonly files: readonly TexFile[]
}

/** Absolute path of `program` on PATH, or undefined. */
export function findProgram(
  program: string,
  path: string = process.env.PATH ?? '',
): string | undefined {
  for (const dir of path.split(delimiter)) {
    if (!dir) continue
    const candidate = join(dir, program)
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {
      // not here
    }
  }
  return undefined
}

/** The TeX programs that are missing from PATH (empty when all are there). */
export function missingTexPrograms(path?: string): string[] {
  return TEX_PROGRAMS.filter((program) => findProgram(program, path) === undefined)
}

/**
 * The required TeX files TeX can't find. Empty when `kpsewhich` itself is
 * missing: the check is skipped, and TeX's own error names the file instead.
 */
export function missingTexFiles(path: string = process.env.PATH ?? ''): TexFile[] {
  const kpsewhich = findProgram(KPSEWHICH, path)
  if (kpsewhich === undefined) return []
  let output = ''
  try {
    output = execFileSync(
      kpsewhich,
      TEX_FILES.map(({ file }) => file),
      {
        encoding: 'utf8',
        env: { ...process.env, PATH: path },
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    )
  } catch (error) {
    // kpsewhich exits non-zero when any file is missing, but still prints the found ones.
    output = String((error as { stdout?: unknown }).stdout ?? '')
  }
  const found = new Set(
    output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((line) => basename(line)),
  )
  return TEX_FILES.filter(({ file }) => !found.has(file))
}

/** Everything rendering needs that this machine lacks (programs first: files need TeX). */
export function missingTex(path?: string): MissingTex {
  const programs = missingTexPrograms(path)
  return { programs, files: programs.length > 0 ? [] : missingTexFiles(path) }
}

/** True when nothing is missing. */
export function texComplete(missing: MissingTex): boolean {
  return missing.programs.length === 0 && missing.files.length === 0
}

/** What is missing, in words: "xelatex, dvisvgm" or "standalone.cls (package standalone)". */
export function describeMissingTex(missing: MissingTex): string {
  if (texComplete(missing)) return ''
  if (missing.programs.length > 0) return `${missing.programs.join(', ')} not found`
  const files = missing.files.map(({ file, package: name }) => `${file} (package ${name})`)
  return `TeX can't find ${files.join(', ')}`
}
