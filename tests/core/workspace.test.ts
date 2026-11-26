import { execFile } from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { describe, expect, it } from 'vitest'
import { formatDiagnostic } from '../../src/core/diagnostics.ts'
import { compileWorkspace } from '../../src/core/workspace.ts'
import { FIXTURES, PROJECT_ROOT } from '../helpers.ts'

const run = promisify(execFile)
const CLI = join(PROJECT_ROOT, 'src/cli/main.ts')
const LAYOUTS = 'center, default, section, title, two-columns'

async function dex(cwd: string, ...args: string[]) {
  try {
    const { stdout, stderr } = await run(process.execPath, [CLI, ...args], { cwd })
    return { code: 0, stdout, stderr }
  } catch (error) {
    const failure = error as { code: number; stdout: string; stderr: string }
    return { code: failure.code, stdout: failure.stdout, stderr: failure.stderr }
  }
}

describe('compileWorkspace', () => {
  it('compiles decks, ignores folders without slides.md and warns about unused assets', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'clean') })
    expect(result.decks.map((deck) => deck.slug)).toEqual(['demo'])
    expect([...(result.decks[0]?.assets ?? [])]).toEqual(['assets/used.svg'])
    expect(result.diagnostics.map(formatDiagnostic)).toEqual([
      'decks/demo/assets/unused.svg warning Asset is not used by any slide.',
    ])
  })

  it('uses the engine layouts by default', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'clean') })
    expect([...result.layouts.keys()].sort().join(', ')).toBe(LAYOUTS)
  })

  it('accepts an absolute decks folder outside the content root', async () => {
    const result = await compileWorkspace({
      root: PROJECT_ROOT,
      decksDir: join(FIXTURES, 'clean', 'decks'),
    })
    expect(result.decks.map((deck) => deck.slug)).toEqual(['demo'])
    expect(result.diagnostics[0]?.file).toBe('tests/fixtures/clean/decks/demo/assets/unused.svg')
  })

  it('reports invalid deck folder names and broken decks', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'broken') })
    const lines = result.diagnostics.map(formatDiagnostic)
    expect(result.decks).toEqual([])
    expect(lines).toContain(
      'decks/Bad_Name/slides.md error Invalid deck folder name "Bad_Name": deck slugs must match /^[a-z][a-z0-9-]*$/.',
    )
    expect(lines).toContain(
      `decks/broken/slides.md:5 error [a] Unknown layout "nope". Available: ${LAYOUTS}.`,
    )
  })

  it('reports a missing decks folder', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'viewer', 'decks') })
    expect(result.diagnostics.map((d) => d.message)[0]).toMatch(/^No decks folder at .*--folder\.$/)
  })

  it('compiles only the requested decks and reports unknown ones', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'clean') }, ['demo', 'ghost'])
    expect(result.decks).toHaveLength(1)
    expect(result.diagnostics.map(formatDiagnostic)).toContain(
      'decks/ghost error No deck "ghost" (expected slides.md there).',
    )
  })
})

describe('dex check', () => {
  it('uses the current folder as the content folder and exits 0 on clean decks', async () => {
    const { code, stdout } = await dex(join(FIXTURES, 'clean'), 'check')
    expect(code).toBe(0)
    expect(stdout).toContain(
      `1 deck(s), 2 slide(s), 5 layout(s) [${LAYOUTS}]: 0 error(s), 1 warning(s).`,
    )
  })

  it('accepts --folder', async () => {
    const { code, stdout } = await dex(PROJECT_ROOT, 'check', '--folder', join(FIXTURES, 'clean'))
    expect(code).toBe(0)
    expect(stdout).toContain('decks/demo/assets/unused.svg warning')
  })

  it('exits non-zero and prints diagnostics on errors', async () => {
    const { code, stdout } = await dex(join(FIXTURES, 'broken'), 'check')
    expect(code).toBe(1)
    expect(stdout).toContain('decks/broken/slides.md:9 error [a]')
  })

  it('checks only the named deck', async () => {
    const { code, stdout } = await dex(join(FIXTURES, 'broken'), 'check', 'broken')
    expect(code).toBe(1)
    expect(stdout).not.toContain('Bad_Name')
  })

  it('prints usage for unknown commands', async () => {
    const { code, stderr } = await dex(PROJECT_ROOT, 'frobnicate')
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown command "frobnicate"')
    expect(stderr).toContain('Usage: dex <command>')
  })
})
