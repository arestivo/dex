import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BLOCK_END, BLOCK_START } from '../../src/cli/scaffold.ts'
import { PROJECT_ROOT, runDex } from '../helpers.ts'

describe('dex --help', () => {
  it('lists every command, including init and docs', async () => {
    const { code, stdout } = await runDex(PROJECT_ROOT, '--help')
    expect(code).toBe(0)
    for (const command of ['init', 'dev', 'build', 'preview', 'check', 'fit', 'docs']) {
      expect(stdout).toMatch(new RegExp(`^ {2}${command}\\b`, 'm'))
    }
  })
})

describe('dex init', () => {
  let folder: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'dex-cli-'))
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  it('creates the scaffold, then reports everything unchanged on a second run', async () => {
    const first = await runDex(folder, 'init')
    expect(first.code).toBe(0)
    expect(first.stdout).toMatch(/created\s+AGENTS\.md/)
    expect(first.stdout).toMatch(/created\s+\.agents\/skills\/author-deck\//)

    const second = await runDex(folder, 'init')
    expect(second.code).toBe(0)
    expect(second.stdout).not.toMatch(/^(created|updated)/m)
    expect(second.stdout).toMatch(/unchanged\s+AGENTS\.md/)
  })

  it('accepts --folder', async () => {
    const { code } = await runDex(PROJECT_ROOT, 'init', '--folder', folder)
    expect(code).toBe(0)
    expect(readFileSync(join(folder, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n')
  })

  it('refuses to run in the engine repository and writes nothing', async () => {
    const { code, stderr } = await runDex(PROJECT_ROOT, 'init')
    expect(code).toBe(1)
    expect(stderr).toContain('is the Dex engine repository, not a content folder')
    expect(stderr).toContain('Nothing was written.')
  })
})

describe('dex check and out-of-date instructions', () => {
  let folder: string

  beforeEach(async () => {
    folder = mkdtempSync(join(tmpdir(), 'dex-cli-'))
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  it('warns, without failing, when the managed block is out of date', async () => {
    await runDex(folder, 'init')
    expect((await runDex(folder, 'check')).stdout).not.toContain('dex init')

    writeFileSync(join(folder, 'AGENTS.md'), `${BLOCK_START}\nold\n${BLOCK_END}\n`)
    const { code, stdout } = await runDex(folder, 'check')
    expect(code).toBe(0)
    expect(stdout).toContain(
      'AGENTS.md warning Dex-managed instructions differ from the installed engine: run `dex init`',
    )
  })

  it('does not warn in a folder that was never initialised', async () => {
    const { mkdirSync } = await import('node:fs')
    mkdirSync(join(folder, 'decks'))
    writeFileSync(join(folder, 'AGENTS.md'), 'My own notes.\n')
    expect((await runDex(folder, 'check')).stdout).not.toContain('dex init')
  })
})

describe('dex docs', () => {
  const engineDoc = (file: string) => readFileSync(join(PROJECT_ROOT, 'docs', file), 'utf8')

  it('prints the authoring reference by default', async () => {
    const { code, stdout } = await runDex(tmpdir(), 'docs')
    expect(code).toBe(0)
    expect(stdout).toBe(engineDoc('authoring.md'))
  })

  it('prints the layouts reference', async () => {
    expect((await runDex(tmpdir(), 'docs', 'layouts')).stdout).toBe(engineDoc('layouts.md'))
  })

  it('lists the topics', async () => {
    const { code, stdout } = await runDex(tmpdir(), 'docs', '--list')
    expect(code).toBe(0)
    expect(stdout).toMatch(/^authoring\s+\S/m)
    expect(stdout).toMatch(/^layouts\s+\S/m)
  })

  it('rejects unknown topics, listing the available ones', async () => {
    const { code, stderr } = await runDex(tmpdir(), 'docs', 'themes')
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown docs topic "themes". Available: authoring, layouts.')
  })
})
