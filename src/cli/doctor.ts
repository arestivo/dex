/**
 * `dex doctor`: checks this machine for the tools each feature needs, and
 * says how to install what is missing. It checks the machine, not content,
 * so it needs no content folder. Returns the exit code (1 if anything is missing).
 */
import { ENGINE_ROOT } from '../core/config.ts'
import { findProgram, missingTexFiles, TEX_PROGRAMS } from '../core/diagrams/toolchain.ts'
import { locateChromium } from './browser.ts'

const MIN_NODE = 24

export interface DoctorItem {
  readonly name: string
  /** `unchecked` items can't be checked yet; they don't count as missing. */
  readonly status: 'ok' | 'missing' | 'unchecked'
  /** What was found, or what is missing. */
  readonly detail: string
  readonly neededFor: string
  /** How to fix it, when it is missing. */
  readonly fix?: string
}

export interface DoctorEnvironment {
  readonly env: NodeJS.ProcessEnv
  readonly nodeVersion: string
}

const NIX_SHELL = `run dex inside the engine's Nix shell, which has everything: nix develop ${ENGINE_ROOT}`

const TEX_INSTALL = [
  `Nix: ${NIX_SHELL}`,
  'Debian/Ubuntu: sudo apt install texlive-xetex texlive-latex-recommended texlive-latex-extra texlive-pictures texlive-fonts-extra dvisvgm',
  'Fedora: sudo dnf install texlive-xetex texlive-fontspec texlive-standalone texlive-pgf texlive-pgfplots texlive-fira texlive-dvisvgm',
  'macOS: MacTeX (brew install --cask mactex-no-gui), or BasicTeX plus: sudo tlmgr install standalone pgf pgfplots fontspec fira dvisvgm',
].join('\n')

/** Checks every tool; pure apart from looking at the file system. */
export function doctorItems({ env, nodeVersion }: DoctorEnvironment): DoctorItem[] {
  const path = env.PATH ?? ''
  const items: DoctorItem[] = []

  const major = Number(nodeVersion.split('.')[0])
  items.push({
    name: 'Node.js',
    status: major >= MIN_NODE ? 'ok' : 'missing',
    detail: nodeVersion,
    neededFor: 'every command',
    fix: `Install Node.js ${MIN_NODE} or later (https://nodejs.org), or ${NIX_SHELL}.`,
  })

  const chromium = locateChromium(env)
  items.push({
    name: 'Chromium',
    status: 'path' in chromium ? 'ok' : 'missing',
    detail: 'path' in chromium ? chromium.path : 'not found',
    neededFor: 'dex fit, dex shot',
    ...('path' in chromium ? {} : { fix: chromium.problem }),
  })

  const programs = TEX_PROGRAMS.filter((program) => findProgram(program, path) === undefined)
  items.push({
    name: 'TeX programs',
    status: programs.length === 0 ? 'ok' : 'missing',
    detail: programs.length === 0 ? TEX_PROGRAMS.join(', ') : `missing ${programs.join(', ')}`,
    neededFor: 'drawing new diagrams',
    fix: `Install TeX with XeLaTeX and dvisvgm:\n${TEX_INSTALL}`,
  })

  if (programs.length > 0) {
    items.push({
      name: 'TeX files',
      status: 'unchecked',
      detail: 'not checked: install the TeX programs first',
      neededFor: 'drawing new diagrams',
    })
  } else if (findProgram('kpsewhich', path) === undefined) {
    items.push({
      name: 'TeX files',
      status: 'unchecked',
      detail: 'not checked: kpsewhich not found (TeX errors will name missing files)',
      neededFor: 'drawing new diagrams',
    })
  } else {
    const files = missingTexFiles(path)
    const packages = [...new Set(files.map((file) => file.package))]
    items.push({
      name: 'TeX files',
      status: files.length === 0 ? 'ok' : 'missing',
      detail:
        files.length === 0
          ? 'standalone, pgf, fontspec, fira'
          : `missing ${files.map(({ file, package: name }) => `${file} (package ${name})`).join(', ')}`,
      neededFor: 'drawing new diagrams',
      fix: `Install the TeX packages ${packages.join(', ')}:\n${TEX_INSTALL}`,
    })
  }
  return items
}

/** The report, as printed. */
export function formatDoctor(items: readonly DoctorItem[]): string {
  const width = (pick: (item: DoctorItem) => string) =>
    Math.max(...items.map((item) => pick(item).length))
  const nameWidth = width((item) => item.name)
  const detailWidth = width((item) => item.detail)
  const lines = items.map(
    (item) =>
      `${item.status.padEnd(9)} ${item.name.padEnd(nameWidth)}  ${item.detail.padEnd(detailWidth)}  (${item.neededFor})`,
  )
  const fixes = items
    .filter((item) => item.status === 'missing' && item.fix !== undefined)
    .map((item) => `${item.name}, for ${item.neededFor}:\n${indent(item.fix ?? '')}`)
  const missing = items.filter((item) => item.status === 'missing').length
  const summary =
    missing === 0
      ? 'Everything Dex needs is installed.'
      : `${missing} missing. Decks whose diagrams are all in .dex/cache/ still build without TeX.`
  return [
    'What Dex needs on this machine:',
    '',
    ...lines,
    '',
    summary,
    ...(fixes.length > 0 ? ['', 'How to fix:', '', fixes.join('\n\n')] : []),
  ].join('\n')
}

export function runDoctor(): number {
  const items = doctorItems({ env: process.env, nodeVersion: process.versions.node })
  console.log(formatDoctor(items))
  return items.some((item) => item.status === 'missing') ? 1 : 0
}

function indent(text: string): string {
  return text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n')
}
