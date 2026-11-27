import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BLOCK_END, BLOCK_START } from '../../src/cli/scaffold.ts'
import { FIXTURES, PROJECT_ROOT, runDex } from '../helpers.ts'

describe('dex --help', () => {
  it('lists every command, including init, new, shot and docs', async () => {
    const { code, stdout } = await runDex(PROJECT_ROOT, '--help')
    expect(code).toBe(0)
    for (const command of [
      'init',
      'new',
      'dev',
      'build',
      'preview',
      'check',
      'fit',
      'shot',
      'docs',
      'doctor',
    ]) {
      expect(stdout).toMatch(new RegExp(`^ {2}${command}\\b`, 'm'))
    }
  })
})

describe('dex doctor', () => {
  it('reports the tools, exiting non-zero only when something is missing', async () => {
    const { code, stdout } = await runDex(tmpdir(), 'doctor')
    expect(stdout).toContain('What Dex needs on this machine:')
    for (const name of ['Node.js', 'Chromium', 'TeX programs', 'TeX files']) {
      expect(stdout).toMatch(new RegExp(`^(ok|missing|unchecked) +${name}`, 'm'))
    }
    expect(code).toBe(/^missing /m.test(stdout) ? 1 : 0)
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
    expect(first.stdout).toContain('dex doctor')

    const second = await runDex(folder, 'init')
    expect(second.code).toBe(0)
    expect(second.stdout).not.toMatch(/^(created|updated)/m)
    expect(second.stdout).toMatch(/unchanged\s+AGENTS\.md/)
  })

  it('writes the --theme into dex.yaml, and the build uses it', async () => {
    const { code, stdout } = await runDex(folder, 'init', '--theme', 'slate')
    expect(code).toBe(0)
    expect(stdout).toMatch(/created\s+dex\.yaml/)
    expect(readFileSync(join(folder, 'dex.yaml'), 'utf8')).toContain('theme: slate\n')

    mkdirSync(join(folder, 'decks/demo'), { recursive: true })
    writeFileSync(
      join(folder, 'decks/demo/slides.md'),
      '---\ntitle: Demo\n---\n\n::slide{#start}\n\n# Hello\n',
    )
    const build = await runDex(folder, 'build')
    expect(build.code).toBe(0)
    expect(readFileSync(join(folder, 'dist/demo/index.html'), 'utf8')).toContain(
      'data-theme="slate"',
    )
  })

  it('accepts a local theme for --theme', async () => {
    cpSync(join(FIXTURES, 'themes/themes'), join(folder, 'themes'), { recursive: true })
    const { code, stdout } = await runDex(folder, 'init', '--theme', 'ocean')
    expect(code).toBe(0)
    expect(stdout).toMatch(/created\s+dex\.yaml/)
    expect(readFileSync(join(folder, 'dex.yaml'), 'utf8')).toContain('theme: ocean\n')
  })

  it('rejects an unknown --theme and writes nothing', async () => {
    const { code, stderr } = await runDex(folder, 'init', '--theme', 'nope')
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown theme "nope". Available: default, ember, forest,')
    expect(stderr).toContain('Nothing was written.')
    expect(readdirSync(folder)).toEqual([])
  })

  it('rejects --theme with other commands', async () => {
    const { code, stderr } = await runDex(folder, 'build', '--theme', 'slate')
    expect(code).toBe(1)
    expect(stderr).toContain('--theme only works with `init`.')
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

  it('names the decks with their own layouts, without listing them', async () => {
    const { stdout } = await runDex(join(FIXTURES, 'local-layouts'), 'docs', 'layouts')
    expect(stdout).not.toContain('| deck |')
    expect(stdout).toContain(
      'These decks also have their own layouts, which only they can use: `one` (example), `two` (example). To list everything a deck can use, run `dex docs layouts --deck <slug>`.',
    )
  })

  it("lists a deck's own layouts with --deck", async () => {
    const { code, stdout } = await runDex(
      join(FIXTURES, 'local-layouts'),
      'docs',
      'layouts',
      '--deck',
      'one',
    )
    expect(code).toBe(0)
    expect(stdout).toContain('The layouts the `one` deck can use')
    expect(stdout).toContain('| `quote` | local |')
    expect(stdout).toContain("| `example` | deck | Deck one's example layout. | `title`, default |")
    expect(stdout).toContain('## `example` (deck)')
    expect(stdout).not.toContain('These decks also have')
  })

  it('rejects an unknown deck', async () => {
    const { code, stderr } = await runDex(tmpdir(), 'docs', 'layouts', '--deck', 'nope')
    expect(code).toBe(1)
    expect(stderr).toContain('No deck "nope" (expected decks/nope/slides.md).')
  })

  it('lists the topics', async () => {
    const { code, stdout } = await runDex(tmpdir(), 'docs', '--list')
    expect(code).toBe(0)
    expect(stdout).toMatch(/^authoring\s+\S/m)
    expect(stdout).toMatch(/^layouts\s+\S/m)
  })

  it('rejects unknown topics, listing the available ones', async () => {
    const { code, stderr } = await runDex(tmpdir(), 'docs', 'fonts')
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown docs topic "fonts". Available: authoring, layouts, themes.')
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

  describe('--deck', () => {
    const slides = (layout: string) =>
      writeFileSync(
        join(folder, 'decks/demo/slides.md'),
        `---\ntitle: Demo\n---\n\n::slide{#a layout=${layout}}\n\n# Hello\n\nBody.\n`,
      )

    it('creates a working deck layout whose only warning is the missing description', async () => {
      slides('request')
      const created = await runDex(folder, 'new', 'layout', 'request', '--deck', 'demo')
      expect(created.code).toBe(0)
      for (const file of ['template.html', 'style.css', 'layout.md']) {
        expect(created.stdout).toContain(`created  decks/demo/layouts/request/${file}`)
      }
      expect(created.stdout).toContain(
        'Use it in the "demo" deck with ::slide{#id layout=request}.',
      )
      expect(existsSync(join(folder, 'layouts'))).toBe(false)

      const { code, stdout } = await runDex(folder, 'check')
      expect(code).toBe(0)
      expect(stdout).toContain(
        'decks/demo/layouts/request/layout.md:1 warning layout.md has no description',
      )
      expect(stdout).toContain('0 error(s), 1 warning(s).')
    })

    it.each([
      [
        'an unknown deck',
        ['request', '--deck', 'nope'],
        'No deck "nope" (expected decks/nope/slides.md).',
      ],
      [
        'a built-in name',
        ['title', '--deck', 'demo'],
        '"title" is a built-in layout: deck layouts cannot replace built-in ones.',
      ],
      ['an invalid name', ['My_Layout', '--deck', 'demo'], 'Invalid layout name "My_Layout"'],
    ])('refuses %s and writes nothing', async (_, args, message) => {
      slides('default')
      const { code, stderr } = await runDex(folder, 'new', 'layout', ...args)
      expect(code).toBe(1)
      expect(stderr).toContain(message)
      expect(stderr).toContain('Nothing was written.')
      expect(existsSync(join(folder, 'decks/demo/layouts'))).toBe(false)
    })

    it('refuses a local layout name', async () => {
      slides('default')
      await runDex(folder, 'new', 'layout', 'quote')
      const { code, stderr } = await runDex(folder, 'new', 'layout', 'quote', '--deck', 'demo')
      expect(code).toBe(1)
      expect(stderr).toContain(
        '"quote" is a local layout (layouts/quote/): deck layouts cannot replace local ones.',
      )
      expect(existsSync(join(folder, 'decks/demo/layouts'))).toBe(false)
    })

    it('refuses an existing deck layout', async () => {
      slides('default')
      await runDex(folder, 'new', 'layout', 'request', '--deck', 'demo')
      const { code, stderr } = await runDex(folder, 'new', 'layout', 'request', '--deck', 'demo')
      expect(code).toBe(1)
      expect(stderr).toContain('decks/demo/layouts/request/ already exists.')
    })

    it('makes dex new layout refuse a name a deck already uses', async () => {
      slides('default')
      await runDex(folder, 'new', 'layout', 'request', '--deck', 'demo')
      const { code, stderr } = await runDex(folder, 'new', 'layout', 'request')
      expect(code).toBe(1)
      expect(stderr).toContain(
        '"request" is already a deck layout of "demo" (decks/demo/layouts/request/): a local layout with that name would replace it.',
      )
      expect(existsSync(join(folder, 'layouts'))).toBe(false)
    })

    it('is rejected by commands that have no deck layouts', async () => {
      const { code, stderr } = await runDex(folder, 'check', '--deck', 'demo')
      expect(code).toBe(1)
      expect(stderr).toContain('--deck only works with `new layout` and `docs layouts`.')
      expect(stderr).toContain('Usage: dex')
    })
  })

  it('rejects unknown kinds', async () => {
    const { code, stderr } = await runDex(folder, 'new', 'font', 'x')
    expect(code).toBe(1)
    expect(stderr).toContain('Unknown kind "font"')
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

describe('dex build with themes', () => {
  it("bundles every theme's scoped CSS and marks pages with their theme", async () => {
    const folder = mkdtempSync(join(tmpdir(), 'dex-build-themes-'))
    const dist = join(folder, 'dist')
    try {
      cpSync(join(FIXTURES, 'themes'), folder, { recursive: true })
      writeFileSync(join(folder, 'dex.yaml'), 'theme: ocean\n')
      const { code } = await runDex(folder, 'build')
      expect(code).toBe(0)
      const css = readdirSync(join(dist, '_app')).find((file) => file.endsWith('.css')) ?? ''
      expect(readFileSync(join(dist, '_app', css), 'utf8')).toMatch(
        /:root\[data-theme=("?)ocean\1\]\{--color-accent:/,
      )
      expect(readFileSync(join(dist, 'demo/index.html'), 'utf8')).toContain(
        '<html lang="en" data-theme="ocean">',
      )
      expect(readFileSync(join(dist, 'index.html'), 'utf8')).toContain('data-theme="ocean"')
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})

describe('dex new theme', () => {
  let folder: string

  beforeEach(() => {
    folder = mkdtempSync(join(tmpdir(), 'dex-new-theme-'))
    mkdirSync(join(folder, 'decks/demo'), { recursive: true })
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  it('creates a working theme whose only warning is the missing description', async () => {
    const created = await runDex(folder, 'new', 'theme', 'ocean')
    expect(created.code).toBe(0)
    expect(created.stdout).toContain('created  themes/ocean/theme.css')
    expect(created.stdout).toContain('created  themes/ocean/theme.md')
    const css = readFileSync(join(folder, 'themes/ocean/theme.css'), 'utf8')
    expect(css).toContain('--color-accent: light-dark(#1d5fd6, #7ea9ff);')
    expect(css).toContain('/* --color-link follows --color-accent;')

    writeFileSync(
      join(folder, 'decks/demo/slides.md'),
      '---\ntitle: Demo\ntheme: ocean\n---\n\n::slide{#a}\n\n# Hello\n\nBody.\n',
    )
    const { code, stdout } = await runDex(folder, 'check')
    expect(code).toBe(0)
    expect(stdout).toContain(
      'themes/ocean/theme.md:1 warning theme.md has no description: add a one-line `description:` to its front matter.',
    )
    expect(stdout).toContain('0 error(s), 1 warning(s).')
  })

  it.each([
    [
      'a built-in name',
      ['default'],
      '"default" is a built-in theme: local themes cannot replace built-in ones.',
    ],
    ['an invalid name', ['Ocean_Blue'], 'Invalid theme name "Ocean_Blue"'],
    ['a missing name', [], 'Missing theme name'],
  ])('refuses %s and writes nothing', async (_, args, message) => {
    const { code, stderr } = await runDex(folder, 'new', 'theme', ...args)
    expect(code).toBe(1)
    expect(stderr).toContain(message)
    expect(stderr).toContain('Nothing was written.')
    expect(existsSync(join(folder, 'themes'))).toBe(false)
  })

  it('refuses an existing local theme', async () => {
    await runDex(folder, 'new', 'theme', 'ocean')
    const { code, stderr } = await runDex(folder, 'new', 'theme', 'ocean')
    expect(code).toBe(1)
    expect(stderr).toContain('themes/ocean/ already exists.')
  })
})

describe('dex docs themes', () => {
  it('lists the built-in themes with their colours, then the guide and the tokens', async () => {
    const { code, stdout } = await runDex(tmpdir(), 'docs', 'themes')
    expect(code).toBe(0)
    for (const name of ['default', 'slate', 'forest', 'ember', 'high-contrast']) {
      expect(stdout).toContain(`| \`${name}\` | built-in |`)
    }
    expect(stdout).toContain(
      "use the folder's theme: **`default`** (no theme is set in `dex.yaml`)",
    )
    expect(stdout).toContain('## Making themes')
    expect(stdout).toContain('| `--color-accent` | the theme colour:')
  })

  it('lists local themes and the folder default from dex.yaml', async () => {
    const { stdout } = await runDex(join(FIXTURES, 'viewer'), 'docs', 'themes')
    expect(stdout).toContain('**`slate`** (set in `dex.yaml`)')
    const folder = mkdtempSync(join(tmpdir(), 'dex-docs-themes-'))
    try {
      cpSync(join(FIXTURES, 'themes'), folder, { recursive: true })
      const local = await runDex(folder, 'docs', 'themes')
      expect(local.stdout).toContain(
        '| `ocean` | local | Teal accents and deep blue title slides (test theme). | `#FFFFFF` / `#1B2130` / `#0B6E70` |',
      )
      expect(local.stdout).toContain('## `ocean` (local)')
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  it('is listed among the topics', async () => {
    const { stdout } = await runDex(tmpdir(), 'docs', '--list')
    expect(stdout).toMatch(/^themes\s+\S/m)
  })
})
