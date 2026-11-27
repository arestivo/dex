import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  describeMissingTex,
  missingTex,
  missingTexFiles,
  TEX_FILES,
} from '../../src/core/diagrams/toolchain.ts'
import { wrapperTex } from '../../src/core/diagrams/wrapper.ts'

let bin: string

beforeEach(() => {
  bin = mkdtempSync(join(tmpdir(), 'dex-toolchain-'))
})

afterEach(() => {
  rmSync(bin, { recursive: true, force: true })
})

const script = (name: string, body = 'exit 0') => {
  const file = join(bin, name)
  writeFileSync(file, `#!/bin/sh\n${body}\n`)
  chmodSync(file, 0o755)
}

/** A fake kpsewhich that knows `files`, printing a path for each one asked for. */
const kpsewhich = (files: readonly string[]) =>
  script(
    'kpsewhich',
    [
      'status=0',
      'for f in "$@"; do',
      '  case "$f" in',
      ...files.map((file) => `    ${file}) echo "/texmf/tex/${file}" ;;`),
      '    *) status=1 ;;',
      '  esac',
      'done',
      'exit $status',
    ].join('\n'),
  )
const allFiles = TEX_FILES.map(({ file }) => file)

describe('missingTex', () => {
  it('finds nothing missing in a complete installation', () => {
    script('xelatex')
    script('dvisvgm')
    kpsewhich(allFiles)
    expect(missingTex(bin)).toEqual({ programs: [], files: [] })
  })

  it('lists the files TeX cannot find, with their packages', () => {
    script('xelatex')
    script('dvisvgm')
    kpsewhich(allFiles.filter((file) => file !== 'standalone.cls' && file !== 'FiraSans.sty'))
    const missing = missingTex(bin)
    expect(missing.files).toEqual([
      { file: 'standalone.cls', package: 'standalone' },
      { file: 'FiraSans.sty', package: 'fira' },
    ])
    expect(describeMissingTex(missing)).toBe(
      "TeX can't find standalone.cls (package standalone), FiraSans.sty (package fira)",
    )
  })

  it('reports missing programs, without looking for files', () => {
    kpsewhich([])
    const missing = missingTex(bin)
    expect(missing).toEqual({ programs: ['xelatex', 'dvisvgm'], files: [] })
    expect(describeMissingTex(missing)).toBe('xelatex, dvisvgm not found')
  })

  it('skips the file check when kpsewhich is missing', () => {
    script('xelatex')
    script('dvisvgm')
    expect(missingTexFiles(bin)).toEqual([])
  })
})

describe('TEX_FILES', () => {
  it('lists exactly what the diagram wrapper loads', () => {
    const { tex } = wrapperTex({ folderPreamble: false })
    const loaded = [
      ...[...tex.matchAll(/\\documentclass(?:\[[^\]]*\])?\{([^}]+)\}/g)].map(([, n]) => `${n}.cls`),
      ...[...tex.matchAll(/\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/g)].map(([, n]) => `${n}.sty`),
      ...[...tex.matchAll(/\\def\\pgfsysdriver\{([^}]+)\}/g)].map(([, n]) => n),
    ]
    // Loaded implicitly: standalone's `tikz` option loads TikZ, and FiraSans uses fontspec under XeTeX.
    const implicit = ['tikz.sty', 'fontspec.sty']
    expect([...loaded, ...implicit].sort()).toEqual([...allFiles].sort())
    expect(tex).toMatch(/\\documentclass\[tikz[,\]]/)
  })
})
