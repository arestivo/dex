import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BLOCK_END, BLOCK_START } from '../../src/cli/scaffold.ts'
import { FIXTURES, PROJECT_ROOT, runDex } from '../helpers.ts'

describe('dex --help', () => {
  it('lists every command, including init, new and docs', async () => {
    const { code, stdout } = await runDex(PROJECT_ROOT, '--help')
    expect(code).toBe(0)
    for (const command of ['init', 'new', 'dev', 'build', 'preview', 'check', 'fit', 'docs']) {
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

  it('lists the built-in layouts, then the guide, in a folder without local layouts', async () => {
    const { code, stdout } = await runDex(tmpdir(), 'docs', 'layouts')
    expect(code).toBe(0)
    for (const name of ['default', 'title', 'section', 'center', 'two-columns']) {
      expect(stdout).toContain(`| \`${name}\` | built-in |`)
    }
    expect(stdout).not.toContain('| local |')
    expect(stdout).toContain('## Making layouts')
  })

  it('lists documented local layouts with their slots and notes', async () => {
    const { stdout } = await runDex(join(FIXTURES, 'local-layouts'), 'docs', 'layouts')
    expect(stdout).toContain(
      '| `quote` | local | A large centred quotation with its source underneath. | default, `source` |',
    )
    expect(stdout).toContain('## `quote` (local)')
    expect(stdout).toContain('### When to use')
  })

  it('marks local layouts without layout.md as undocumented', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'dex-docs-'))
    try {
      mkdirSync(join(folder, 'layouts/bare'), { recursive: true })
      writeFileSync(join(folder, 'layouts/bare/template.html'), '<slot name="main"></slot>')
      const { stdout } = await runDex(folder, 'docs', 'layouts')
      expect(stdout).toContain('| `bare` | local | _undocumented_ | `main` |')
      expect(stdout).toContain('undocumented. Read its `template.html`')
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  it('honours --folder', async () => {
    const { stdout } = await runDex(
      PROJECT_ROOT,
      'docs',
      'layouts',
      '--folder',
      join(FIXTURES, 'local-layouts'),
    )
    expect(stdout).toContain('| `quote` | local |')
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

describe('dex new layout', () => {
  let folder: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'dex-new-'))
    mkdirSync(join(folder, 'decks/demo'), { recursive: true })
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  it('creates a working local layout whose only warning is the missing description', async () => {
    const created = await runDex(folder, 'new', 'layout', 'quote')
    expect(created.code).toBe(0)
    for (const file of ['template.html', 'style.css', 'layout.md']) {
      expect(created.stdout).toContain(`created  layouts/quote/${file}`)
    }
    expect(readFileSync(join(folder, 'layouts/quote/layout.md'), 'utf8')).toContain('layout=quote')

    writeFileSync(
      join(folder, 'decks/demo/slides.md'),
      '---\ntitle: Demo\n---\n\n::slide{#a layout=quote}\n\n# Hello\n\nBody.\n',
    )
    const { code, stdout } = await runDex(folder, 'check')
    expect(code).toBe(0)
    expect(stdout).toContain(
      'layouts/quote/layout.md:1 warning layout.md has no description: add a one-line `description:` to its front matter.',
    )
    expect(stdout).toContain('0 error(s), 1 warning(s).')
  })

  it.each([
    ['a built-in name', ['title'], '"title" is a built-in layout'],
    ['an invalid name', ['My_Layout'], 'Invalid layout name "My_Layout"'],
    ['a missing name', [], 'Missing layout name'],
  ])('refuses %s and writes nothing', async (_, args, message) => {
    const { code, stderr } = await runDex(folder, 'new', 'layout', ...args)
    expect(code).toBe(1)
    expect(stderr).toContain(message)
    expect(stderr).toContain('Nothing was written.')
    expect(existsSync(join(folder, 'layouts'))).toBe(false)
  })

  it('refuses an existing local layout', async () => {
    await runDex(folder, 'new', 'layout', 'quote')
    const { code, stderr } = await runDex(folder, 'new', 'layout', 'quote')
    expect(code).toBe(1)
    expect(stderr).toContain('layouts/quote/ already exists.')
  })

  it('rejects unknown kinds', async () => {
    const { code, stderr } = await runDex(folder, 'new', 'theme', 'x')
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown kind "theme"')
  })
})

describe('dex build with local layouts', () => {
  it("bundles a local layout's scoped CSS and renders slides with it", async () => {
    const dist = mkdtempSync(join(tmpdir(), 'dex-build-'))
    try {
      const { code } = await runDex(join(FIXTURES, 'local-layouts'), 'build', '--dist', dist)
      expect(code).toBe(0)
      const { readdirSync } = await import('node:fs')
      const css = readdirSync(join(dist, '_app')).find((file) => file.endsWith('.css')) ?? ''
      expect(readFileSync(join(dist, '_app', css), 'utf8')).toMatch(
        /@scope\s*\(\.slide\[data-layout=("?)quote\1\]\)/,
      )
      expect(readFileSync(join(dist, 'demo/index.html'), 'utf8')).toContain(
        '<figure class="quote">',
      )
    } finally {
      rmSync(dist, { recursive: true, force: true })
    }
  })
})
