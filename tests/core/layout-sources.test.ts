import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { formatDiagnostic } from '../../src/core/diagnostics.ts'
import {
  type LayoutSource,
  loadLayoutSet,
  parseLayoutDocument,
} from '../../src/core/layouts/load.ts'
import { compileWorkspace } from '../../src/core/workspace.ts'
import { FIXTURES, PROJECT_ROOT } from '../helpers.ts'

let root: string

const write = (path: string, text: string) => {
  mkdirSync(join(root, path, '..'), { recursive: true })
  writeFileSync(join(root, path), text)
}
const layout = (folder: string, name: string, notes?: string) => {
  write(`${folder}/${name}/template.html`, '<slot></slot>')
  if (notes !== undefined) write(`${folder}/${name}/layout.md`, notes)
}
const SOURCES: LayoutSource[] = [
  { dir: 'engine', origin: 'built-in' },
  { dir: 'layouts', origin: 'local' },
]
const load = () => {
  const set = loadLayoutSet(root, SOURCES)
  return { layouts: set.layouts, lines: set.diagnostics.items.map(formatDiagnostic) }
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dex-layouts-'))
  layout('engine', 'default', '---\ndescription: Title and body.\n---\nNotes.')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('loadLayoutSet', () => {
  it('loads built-in and local layouts with their origin', () => {
    layout('layouts', 'quote', '---\ndescription: A quote.\n---\n## When to use\nQuotes.')
    const { layouts, lines } = load()
    expect(lines).toEqual([])
    expect(layouts.get('default')).toMatchObject({
      origin: 'built-in',
      description: 'Title and body.',
    })
    expect(layouts.get('quote')).toMatchObject({
      origin: 'local',
      description: 'A quote.',
      notes: '## When to use\nQuotes.',
      file: 'layouts/quote/template.html',
    })
  })

  it('loads a folder only once when it is both the built-in and the local source', () => {
    const set = loadLayoutSet(root, [
      { dir: 'engine', origin: 'built-in' },
      { dir: 'engine', origin: 'local' },
    ])
    expect(set.diagnostics.items).toEqual([])
    expect(set.layouts.get('default')?.origin).toBe('built-in')
  })

  it('is silent when the content folder has no local layouts', () => {
    expect(load().lines).toEqual([])
  })

  it('rejects a local layout that reuses a built-in name and keeps the built-in', () => {
    layout('layouts', 'default', '---\ndescription: Mine.\n---\n')
    const { layouts, lines } = load()
    expect(layouts.get('default')?.origin).toBe('built-in')
    expect(lines).toEqual([
      'layouts/default/template.html error "default" is a built-in layout: local layouts cannot replace built-in ones. Rename this folder (e.g. layouts/default-custom/).',
    ])
  })

  it('rejects invalid local layout names', () => {
    layout('layouts', 'Bad_Name', '---\ndescription: x\n---\n')
    expect(load().lines[0]).toMatch(/^layouts\/Bad_Name error Invalid layout name "Bad_Name"/)
  })

  it('warns about a missing layout.md, and the layout still works', () => {
    layout('layouts', 'bare')
    const { layouts, lines } = load()
    expect(layouts.get('bare')).toMatchObject({ description: '', notes: undefined })
    expect(lines).toEqual([
      'layouts/bare/layout.md warning Layout "bare" has no layout.md: add one with a description and usage notes, so people and agents know when and how to use it.',
    ])
  })

  it('warns about an empty description', () => {
    layout('layouts', 'vague', '---\ndescription: ""\n---\nSome notes.')
    expect(load().lines).toEqual([
      'layouts/vague/layout.md:1 warning layout.md has no description: add a one-line `description:` to its front matter.',
    ])
  })
})

describe('parseLayoutDocument', () => {
  it('reads the description and the body', () => {
    expect(
      parseLayoutDocument('---\ndescription:  Two columns. \nother: 1\n---\n\nBody\n'),
    ).toEqual({
      description: 'Two columns.',
      notes: 'Body',
    })
  })

  it('treats a file without front matter as notes only', () => {
    expect(parseLayoutDocument('Just notes.\n')).toEqual({ description: '', notes: 'Just notes.' })
  })
})

describe('compileWorkspace with local layouts', () => {
  it('compiles a deck that uses a local layout', async () => {
    const result = await compileWorkspace({ root: join(FIXTURES, 'local-layouts') })
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([])
    expect(result.layouts.get('quote')?.origin).toBe('local')
    const slide = result.decks[0]?.slides[0]
    expect(slide?.layout).toBe('quote')
  })

  it('lists local layouts among the available ones for an unknown layout', async () => {
    const result = await compileWorkspace({
      root: join(FIXTURES, 'local-layouts'),
      decksDir: join(FIXTURES, 'broken', 'decks'),
    })
    expect(result.diagnostics.map((d) => d.message)).toContain(
      'Unknown layout "nope". Available: center, default, quote, section, title, two-columns.',
    )
  })

  it('uses the engine layouts by default', async () => {
    const result = await compileWorkspace({
      root: PROJECT_ROOT,
      decksDir: join(FIXTURES, 'clean', 'decks'),
    })
    expect([...result.layouts.values()].every((l) => l.origin === 'built-in')).toBe(true)
  })
})
