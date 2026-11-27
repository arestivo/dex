/**
 * `dex init` planning: prepares a content folder for people and agents.
 *
 * Everything Dex writes is either inside the managed block of AGENTS.md
 * (between the markers) or a skill whose SKILL.md says `generatedBy: dex`.
 * `dex.yaml` is only a starter: once it exists it is the author's, and
 * `dex init` changes it only to set the theme passed with `--theme`.
 * The plan compares the desired state of each path with what is on disk, so
 * the same code drives `dex init` (apply the plan) and the `dex check`
 * warning (are existing managed files out of date?).
 */
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, isAbsolute, join, relative, sep } from 'node:path'
import { isMap, parseDocument, parse as parseYaml } from 'yaml'
import { type ContentLocations, DECKS_FOLDER, ENGINE_ROOT, SETTINGS_FILE } from '../core/config.ts'

export const BLOCK_START = '<!-- dex:start -->'
export const BLOCK_END = '<!-- dex:end -->'
export const SCAFFOLD_DIR = join(ENGINE_ROOT, 'scaffold')

const AGENTS_FILE = 'AGENTS.md'
const CLAUDE_FILE = 'CLAUDE.md'
const CLAUDE_IMPORT = '@AGENTS.md'
const GITIGNORE_FILE = '.gitignore'
/** Screenshots from `dex shot` (see src/cli/shot.ts). */
const SHOTS_FOLDER = '.dex/shots'
const SKILLS_DIR = join('.agents', 'skills')
const SKILL_LINKS_DIR = join('.claude', 'skills')
const SKILL_FILE = 'SKILL.md'
const MANAGER = 'dex'

// ---------------------------------------------------------------------------
// Managed block (pure)
// ---------------------------------------------------------------------------

export interface SkillInfo {
  readonly name: string
  readonly description: string
}

/** Fills the block template's `{{skills}}` placeholder. */
export function renderBlock(template: string, skills: readonly SkillInfo[]): string {
  const list = skills.map((skill) => `- \`${skill.name}\`: ${skill.description}`).join('\n')
  return template.replace('{{skills}}', list || '_No skills installed._').trim()
}

export type MergeResult = { readonly content: string } | { readonly error: string }

/**
 * Puts `block` between the markers in `existing` (or appends it), keeping
 * everything outside the markers. Malformed markers are an error.
 */
export function mergeManagedBlock(existing: string | undefined, block: string): MergeResult {
  const wrapped = `${BLOCK_START}\n${block.trim()}\n${BLOCK_END}`
  if (existing === undefined || existing.trim() === '') return { content: `${wrapped}\n` }

  const starts = occurrences(existing, BLOCK_START)
  const ends = occurrences(existing, BLOCK_END)
  if (starts.length === 0 && ends.length === 0) {
    return { content: `${existing.trimEnd()}\n\n${wrapped}\n` }
  }

  const [start] = starts
  const [end] = ends
  if (
    starts.length !== 1 ||
    ends.length !== 1 ||
    start === undefined ||
    end === undefined ||
    end < start
  ) {
    return {
      error: `${AGENTS_FILE} has malformed Dex markers: expected one ${BLOCK_START} followed by one ${BLOCK_END}. Fix or remove them, then run dex init again.`,
    }
  }
  return {
    content: existing.slice(0, start) + wrapped + existing.slice(end + BLOCK_END.length),
  }
}

/** The managed block's current body, or undefined when there are no valid markers. */
export function extractManagedBlock(content: string): string | undefined {
  const start = content.indexOf(BLOCK_START)
  const end = content.indexOf(BLOCK_END)
  if (start === -1 || end === -1 || end < start) return undefined
  return content.slice(start + BLOCK_START.length, end).trim()
}

function occurrences(text: string, needle: string): number[] {
  const found: number[] = []
  for (let index = text.indexOf(needle); index !== -1; index = text.indexOf(needle, index + 1)) {
    found.push(index)
  }
  return found
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

export type ChangeKind = 'create' | 'update' | 'unchanged' | 'kept' | 'skipped'

export interface PlannedChange {
  /** Path relative to the content folder (folders end with `/`). */
  readonly path: string
  readonly kind: ChangeKind
  /** Why a path is kept or skipped. */
  readonly detail?: string
  /** True when the path already holds Dex-managed content (used for staleness). */
  readonly managed: boolean
  /** Performs the change; absent for unchanged/kept/skipped. */
  readonly apply?: () => void
}

export interface ScaffoldPlan {
  readonly changes: readonly PlannedChange[]
  /** Problems that prevent `dex init` from writing anything. */
  readonly errors: readonly string[]
}

export interface ScaffoldOptions {
  /** Engine root, for the "not in the engine repository" guard. */
  readonly engineRoot?: string
  /** Templates folder (`AGENTS.block.md`, `skills/`, `dex.yaml`). */
  readonly scaffoldDir?: string
  /** The folder theme to write into `dex.yaml` (`dex init --theme`). */
  readonly theme?: InitTheme
}

export interface InitTheme {
  readonly name: string
  /** Every theme the folder can use (built-in and local). */
  readonly available: readonly string[]
}

interface Skill extends SkillInfo {
  /** Files of the skill, keyed by path relative to the skill folder. */
  readonly files: ReadonlyMap<string, string>
}

export function planScaffold(
  content: ContentLocations,
  options: ScaffoldOptions = {},
): ScaffoldPlan {
  const root = content.root
  const engineRoot = options.engineRoot ?? ENGINE_ROOT
  const scaffoldDir = options.scaffoldDir ?? SCAFFOLD_DIR

  if (!existsSync(root)) return { changes: [], errors: [`The folder ${root} does not exist.`] }
  if (realpathSync(root) === realpathSync(engineRoot)) {
    return {
      changes: [],
      errors: [
        `${root} is the Dex engine repository, not a content folder. Run dex init in the folder that holds (or will hold) your decks/.`,
      ],
    }
  }

  const skills = loadSkills(join(scaffoldDir, 'skills'))
  const block = renderBlock(readFileSync(join(scaffoldDir, 'AGENTS.block.md'), 'utf8'), skills)
  const errors: string[] = []
  const changes: PlannedChange[] = [
    planDecksFolder(root),
    planAgentsFile(root, block, errors),
    planClaudeFile(root),
    planGitignore(content),
    planSettingsFile(
      root,
      readFileSync(join(scaffoldDir, SETTINGS_FILE), 'utf8'),
      options.theme,
      errors,
    ),
    ...planSkills(root, skills),
  ]
  return { changes, errors }
}

/** Applies every change of a plan that has no errors. */
export function applyScaffold(plan: ScaffoldPlan): void {
  if (plan.errors.length > 0) throw new Error(plan.errors.join('\n'))
  for (const change of plan.changes) change.apply?.()
}

/** Existing Dex-managed paths whose content differs from what the engine would write. */
export function staleInstructions(
  content: ContentLocations,
  options: ScaffoldOptions = {},
): string[] {
  const plan = planScaffold(content, options)
  if (plan.errors.length > 0) return []
  return plan.changes.filter((c) => c.managed && c.kind === 'update').map((c) => c.path)
}

function planDecksFolder(root: string): PlannedChange {
  const dir = join(root, DECKS_FOLDER)
  if (existsSync(dir)) return { path: `${DECKS_FOLDER}/`, kind: 'unchanged', managed: false }
  return {
    path: `${DECKS_FOLDER}/`,
    kind: 'create',
    managed: false,
    apply: () => mkdirSync(dir, { recursive: true }),
  }
}

function planAgentsFile(root: string, block: string, errors: string[]): PlannedChange {
  const file = join(root, AGENTS_FILE)
  const existing = readIfExists(file)
  const merged = mergeManagedBlock(existing, block)
  const managed = existing !== undefined && extractManagedBlock(existing) !== undefined
  if ('error' in merged) {
    errors.push(merged.error)
    return { path: AGENTS_FILE, kind: 'skipped', detail: merged.error, managed }
  }
  return fileChange(AGENTS_FILE, file, existing, merged.content, managed)
}

function planClaudeFile(root: string): PlannedChange {
  const file = join(root, CLAUDE_FILE)
  const existing = readIfExists(file)
  if (existing === undefined) {
    return fileChange(CLAUDE_FILE, file, undefined, `${CLAUDE_IMPORT}\n`, false)
  }
  const imports = existing.split(/\r?\n/).some((line) => line.trim() === CLAUDE_IMPORT)
  const desired = imports ? existing : `${CLAUDE_IMPORT}\n\n${existing}`
  return fileChange(CLAUDE_FILE, file, existing, desired, false)
}

function planGitignore(content: ContentLocations): PlannedChange {
  // Generated, per-machine output. The diagram cache (.dex/cache/) is meant to
  // be committed, so it is never ignored.
  const wanted = [SHOTS_FOLDER]
  const output = relative(content.root, content.outDir).split(sep).join('/')
  const outputInside = output !== '' && !output.startsWith('..') && !isAbsolute(output)
  if (outputInside) wanted.unshift(output)

  const file = join(content.root, GITIGNORE_FILE)
  const existing = readIfExists(file)
  const lines = new Set(existing?.split(/\r?\n/).map((line) => line.trim()) ?? [])
  const missing = wanted.filter(
    (path) => ![path, `${path}/`, `/${path}`, `/${path}/`].some((p) => lines.has(p)),
  )
  const detail = outputInside ? undefined : 'the output folder is outside the content folder'
  if (missing.length === 0) {
    return {
      ...fileChange(GITIGNORE_FILE, file, existing, existing ?? '', false),
      ...(detail ? { detail } : {}),
    }
  }
  const entries = missing.map((path) => `/${path}/\n`).join('')
  const desired =
    existing === undefined || existing === ''
      ? entries
      : `${existing.endsWith('\n') ? existing : `${existing}\n`}${entries}`
  return {
    ...fileChange(GITIGNORE_FILE, file, existing, desired, false),
    ...(detail ? { detail } : {}),
  }
}

function planSettingsFile(
  root: string,
  starter: string,
  theme: InitTheme | undefined,
  errors: string[],
): PlannedChange {
  const file = join(root, SETTINGS_FILE)
  const existing = readIfExists(file)
  // Not managed: an existing dex.yaml is the author's, never restored or "stale".
  if (theme === undefined)
    return fileChange(SETTINGS_FILE, file, existing, existing ?? starter, false)

  const skip = (error: string): PlannedChange => {
    errors.push(error)
    return { path: SETTINGS_FILE, kind: 'skipped', detail: error, managed: false }
  }
  if (!theme.available.includes(theme.name)) {
    return skip(
      `Unknown theme "${theme.name}". Available: ${[...theme.available].sort().join(', ')}. Run \`dex docs themes\` to see them.`,
    )
  }
  const edited = withTheme(existing ?? starter, theme.name)
  if ('error' in edited) {
    return skip(
      `${SETTINGS_FILE} can't be read: ${edited.error} Fix or delete it, then run dex init again.`,
    )
  }
  return fileChange(SETTINGS_FILE, file, existing, edited.content, false)
}

/** Sets `theme` in a settings file, keeping its comments and other keys. */
export function withTheme(text: string, theme: string): MergeResult {
  const document = parseDocument(text)
  const [problem] = document.errors
  if (problem !== undefined)
    return { error: `invalid YAML (${problem.message.split('\n')[0]?.replace(/:$/, '')}).` }
  if (document.contents !== null && !isMap(document.contents)) {
    return { error: 'it must be a YAML mapping, e.g. `theme: slate`.' }
  }
  if (document.get('theme') === theme) return { content: text }
  document.set('theme', theme)
  return { content: document.toString() }
}

function planSkills(root: string, skills: readonly Skill[]): PlannedChange[] {
  const changes: PlannedChange[] = []
  const provided = new Set(skills.map((skill) => skill.name))

  for (const skill of skills) {
    const dir = join(root, SKILLS_DIR, skill.name)
    const path = `${toPosix(join(SKILLS_DIR, skill.name))}/`
    const exists = existsSync(dir)
    const managed = exists && isManagedSkill(dir)

    if (exists && !managed) {
      changes.push({
        path,
        kind: 'skipped',
        detail: 'a skill with this name exists and is not managed by Dex; left alone',
        managed: false,
      })
      continue
    }

    const current = exists ? readTree(dir) : new Map<string, string>()
    const same =
      current.size === skill.files.size &&
      [...skill.files].every(([file, text]) => current.get(file) === text)
    changes.push({
      path,
      kind: !exists ? 'create' : same ? 'unchanged' : 'update',
      managed,
      ...(same && exists
        ? {}
        : {
            apply: () => {
              rmSync(dir, { recursive: true, force: true })
              for (const [file, text] of skill.files) writeFile(join(dir, file), text)
            },
          }),
    })
    changes.push(planSkillLink(root, skill.name))
  }

  const installed = join(root, SKILLS_DIR)
  if (existsSync(installed)) {
    for (const entry of readdirSync(installed, { withFileTypes: true })) {
      const dir = join(installed, entry.name)
      if (entry.isDirectory() && !provided.has(entry.name) && isManagedSkill(dir)) {
        changes.push({
          path: `${toPosix(join(SKILLS_DIR, entry.name))}/`,
          kind: 'kept',
          detail: 'no longer provided by Dex; delete it if you no longer need it',
          managed: false,
        })
      }
    }
  }
  return changes
}

function planSkillLink(root: string, name: string): PlannedChange {
  const link = join(root, SKILL_LINKS_DIR, name)
  const target = toPosix(join('..', '..', SKILLS_DIR, name))
  const path = toPosix(join(SKILL_LINKS_DIR, name))
  let stat: ReturnType<typeof lstatSync> | undefined
  try {
    stat = lstatSync(link)
  } catch {
    stat = undefined
  }
  if (stat === undefined) {
    return {
      path,
      kind: 'create',
      managed: false,
      apply: () => {
        mkdirSync(dirname(link), { recursive: true })
        symlinkSync(target, link, 'dir')
      },
    }
  }
  if (stat.isSymbolicLink() && toPosix(readlinkSync(link)) === target) {
    return { path, kind: 'unchanged', managed: false }
  }
  return {
    path,
    kind: 'skipped',
    detail: `exists and is not a link to ${target}; left alone`,
    managed: false,
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadSkills(dir: string): Skill[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const files = readTree(join(dir, entry.name))
      const meta = frontMatter(files.get(SKILL_FILE) ?? '')
      return {
        name: typeof meta.name === 'string' ? meta.name : entry.name,
        description: typeof meta.description === 'string' ? meta.description : '',
        files,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function isManagedSkill(dir: string): boolean {
  const skill = readIfExists(join(dir, SKILL_FILE))
  if (skill === undefined) return false
  const metadata = frontMatter(skill).metadata
  return typeof metadata === 'object' && metadata !== null && 'generatedBy' in metadata
    ? (metadata as { generatedBy: unknown }).generatedBy === MANAGER
    : false
}

function frontMatter(text: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)
  if (!match?.[1]) return {}
  try {
    const data: unknown = parseYaml(match[1])
    return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

/** All files under `dir`, keyed by POSIX path relative to it. */
function readTree(dir: string): Map<string, string> {
  const files = new Map<string, string>()
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue
    const full = join(entry.parentPath, entry.name)
    files.set(toPosix(relative(dir, full)), readFileSync(full, 'utf8'))
  }
  return files
}

function fileChange(
  path: string,
  file: string,
  existing: string | undefined,
  desired: string,
  managed: boolean,
): PlannedChange {
  if (existing === desired) return { path, kind: 'unchanged', managed }
  return {
    path,
    kind: existing === undefined ? 'create' : 'update',
    managed,
    apply: () => writeFile(file, desired),
  }
}

function writeFile(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
}

function readIfExists(file: string): string | undefined {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return undefined
  }
}

function toPosix(path: string): string {
  return path.split(sep).join('/')
}
