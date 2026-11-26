import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  applyScaffold,
  BLOCK_END,
  BLOCK_START,
  extractManagedBlock,
  mergeManagedBlock,
  type PlannedChange,
  planScaffold,
  renderBlock,
  staleInstructions,
} from '../../src/cli/scaffold.ts'
import { contentLocations, ENGINE_ROOT } from '../../src/core/config.ts'

const kinds = (changes: readonly PlannedChange[]) =>
  Object.fromEntries(changes.map((change) => [change.path, change.kind]))

describe('renderBlock', () => {
  it('lists the skills in place of {{skills}}', () => {
    expect(renderBlock('Skills:\n\n{{skills}}\n', [{ name: 'a', description: 'Does A.' }])).toBe(
      'Skills:\n\n- `a`: Does A.',
    )
  })
})

describe('mergeManagedBlock', () => {
  const block = 'Rules.'
  const wrapped = `${BLOCK_START}\nRules.\n${BLOCK_END}`

  it('creates the block for a new file', () => {
    expect(mergeManagedBlock(undefined, block)).toEqual({ content: `${wrapped}\n` })
  })

  it('appends the block after existing notes', () => {
    expect(mergeManagedBlock('# Notes\n\nMine.\n', block)).toEqual({
      content: `# Notes\n\nMine.\n\n${wrapped}\n`,
    })
  })

  it('replaces only the text between the markers', () => {
    const existing = `Before.\n\n${BLOCK_START}\nOld rules.\n${BLOCK_END}\n\nAfter.\n`
    expect(mergeManagedBlock(existing, block)).toEqual({
      content: `Before.\n\n${wrapped}\n\nAfter.\n`,
    })
  })

  it.each([
    ['a start marker only', `${BLOCK_START}\nx`],
    ['an end marker only', `x\n${BLOCK_END}`],
    ['markers in the wrong order', `${BLOCK_END}\nx\n${BLOCK_START}`],
    ['two blocks', `${BLOCK_START}\n${BLOCK_END}\n${BLOCK_START}\n${BLOCK_END}`],
  ])('rejects %s', (_, existing) => {
    expect(mergeManagedBlock(existing, block)).toHaveProperty('error')
  })

  it('extracts the current block', () => {
    expect(extractManagedBlock(`a\n${BLOCK_START}\n x \n${BLOCK_END}\nb`)).toBe('x')
    expect(extractManagedBlock('no markers')).toBeUndefined()
  })
})

describe('planScaffold', () => {
  let root: string
  const content = () => contentLocations({ folder: root })
  const init = () => applyScaffold(planScaffold(content()))
  const read = (path: string) => readFileSync(join(root, path), 'utf8')

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dex-scaffold-'))
  })

  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('creates everything in an empty folder', () => {
    const plan = planScaffold(content())
    expect(plan.errors).toEqual([])
    expect(kinds(plan.changes)).toEqual({
      'decks/': 'create',
      'AGENTS.md': 'create',
      'CLAUDE.md': 'create',
      '.gitignore': 'create',
      '.agents/skills/author-deck/': 'create',
      '.claude/skills/author-deck': 'create',
      '.agents/skills/author-layout/': 'create',
      '.claude/skills/author-layout': 'create',
      '.agents/skills/migrate-remark-deck/': 'create',
      '.claude/skills/migrate-remark-deck': 'create',
    })
    applyScaffold(plan)

    expect(existsSync(join(root, 'decks'))).toBe(true)
    expect(read('AGENTS.md')).toContain('dex docs')
    expect(read('AGENTS.md')).toContain('- `author-deck`:')
    expect(read('AGENTS.md')).toContain('- `author-layout`:')
    expect(read('AGENTS.md')).toContain('layouts/<name>/')
    expect(read('AGENTS.md')).toContain('dex new layout <name>')
    expect(read('AGENTS.md')).toContain('dex docs layouts')
    expect(read('CLAUDE.md')).toBe('@AGENTS.md\n')
    expect(read('.gitignore')).toBe('/dist/\n')
    expect(read('.agents/skills/author-deck/SKILL.md')).toContain('generatedBy: dex')
    expect(readlinkSync(join(root, '.claude/skills/author-deck'))).toBe(
      '../../.agents/skills/author-deck',
    )
    expect(realpathSync(join(root, '.claude/skills/author-deck/SKILL.md'))).toBe(
      realpathSync(join(root, '.agents/skills/author-deck/SKILL.md')),
    )
  })

  it('is idempotent', () => {
    init()
    const second = planScaffold(content())
    expect(new Set(second.changes.map((change) => change.kind))).toEqual(new Set(['unchanged']))
  })

  it('keeps existing decks and notes, and imports AGENTS.md from an existing CLAUDE.md', () => {
    mkdirSync(join(root, 'decks/http'), { recursive: true })
    writeFileSync(join(root, 'decks/http/slides.md'), 'deck')
    writeFileSync(join(root, 'AGENTS.md'), '# My notes\n')
    writeFileSync(join(root, 'CLAUDE.md'), 'Be nice.\n')
    init()
    expect(read('decks/http/slides.md')).toBe('deck')
    expect(read('AGENTS.md')).toMatch(/^# My notes\n\n<!-- dex:start -->/)
    expect(read('CLAUDE.md')).toBe('@AGENTS.md\n\nBe nice.\n')
  })

  it('appends the output folder to .gitignore only when it is not ignored yet', () => {
    writeFileSync(join(root, '.gitignore'), 'node_modules/')
    init()
    expect(read('.gitignore')).toBe('node_modules/\n/dist/\n')

    writeFileSync(join(root, '.gitignore'), 'dist/\n')
    const plan = planScaffold(content())
    expect(kinds(plan.changes)['.gitignore']).toBe('unchanged')
  })

  it('skips .gitignore when the output folder is outside the content folder', () => {
    const plan = planScaffold(contentLocations({ folder: root, dist: tmpdir() }))
    expect(plan.changes.find((change) => change.path === '.gitignore')).toMatchObject({
      kind: 'skipped',
    })
  })

  it('refreshes the managed block and edited skills, keeping notes outside the markers', () => {
    init()
    writeFileSync(
      join(root, 'AGENTS.md'),
      `Notes above.\n\n${BLOCK_START}\nstale\n${BLOCK_END}\n\nNotes below.\n`,
    )
    writeFileSync(
      join(root, '.agents/skills/author-deck/SKILL.md'),
      '---\nname: author-deck\nmetadata:\n  generatedBy: dex\n---\nedited',
    )

    expect(staleInstructions(content()).sort()).toEqual([
      '.agents/skills/author-deck/',
      'AGENTS.md',
    ])
    const plan = planScaffold(content())
    expect(kinds(plan.changes)).toMatchObject({
      'AGENTS.md': 'update',
      '.agents/skills/author-deck/': 'update',
    })
    applyScaffold(plan)
    expect(read('AGENTS.md')).toMatch(
      /^Notes above\.\n\n<!-- dex:start -->[\s\S]*<!-- dex:end -->\n\nNotes below\.\n$/,
    )
    expect(read('.agents/skills/author-deck/SKILL.md')).not.toContain('edited')
    expect(staleInstructions(content())).toEqual([])
  })

  it('leaves unrelated skills and same-named unmanaged skills alone', () => {
    mkdirSync(join(root, '.agents/skills/my-skill'), { recursive: true })
    writeFileSync(join(root, '.agents/skills/my-skill/SKILL.md'), 'mine')
    mkdirSync(join(root, '.agents/skills/author-deck'), { recursive: true })
    writeFileSync(
      join(root, '.agents/skills/author-deck/SKILL.md'),
      '---\nname: author-deck\n---\nmine',
    )
    const plan = planScaffold(content())
    expect(kinds(plan.changes)['.agents/skills/author-deck/']).toBe('skipped')
    expect(plan.changes.some((change) => change.path.includes('my-skill'))).toBe(false)
    applyScaffold(plan)
    expect(read('.agents/skills/my-skill/SKILL.md')).toBe('mine')
    expect(read('.agents/skills/author-deck/SKILL.md')).toContain('mine')
  })

  it('reports managed skills the engine no longer provides as kept', () => {
    mkdirSync(join(root, '.agents/skills/old-skill'), { recursive: true })
    writeFileSync(
      join(root, '.agents/skills/old-skill/SKILL.md'),
      '---\nname: old-skill\nmetadata:\n  generatedBy: dex\n---\n',
    )
    expect(kinds(planScaffold(content()).changes)['.agents/skills/old-skill/']).toBe('kept')
  })

  it('reports malformed markers as an error and writes nothing', () => {
    writeFileSync(join(root, 'AGENTS.md'), `${BLOCK_START}\nunterminated`)
    const plan = planScaffold(content())
    expect(plan.errors[0]).toMatch(/malformed Dex markers/)
    expect(() => applyScaffold(plan)).toThrow(/malformed/)
    expect(existsSync(join(root, 'decks'))).toBe(false)
  })

  it('has no stale instructions in a folder that was never initialised', () => {
    writeFileSync(join(root, 'AGENTS.md'), 'notes')
    expect(staleInstructions(content())).toEqual([])
  })
})

describe('engine repository guard', () => {
  it('refuses to scaffold the engine repository itself', () => {
    const plan = planScaffold(contentLocations({ folder: ENGINE_ROOT }))
    expect(plan.changes).toEqual([])
    expect(plan.errors[0]).toMatch(/is the Dex engine repository, not a content folder/)
  })

  it('allows a content folder inside the engine repository', () => {
    const sub = mkdtempSync(join(ENGINE_ROOT, 'node_modules', '.dex-guard-'))
    try {
      expect(planScaffold(contentLocations({ folder: sub })).errors).toEqual([])
    } finally {
      rmSync(sub, { recursive: true, force: true })
    }
  })
})
