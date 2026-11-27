import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { doctorItems, formatDoctor } from '../../src/cli/doctor.ts'
import { TEX_FILES } from '../../src/core/diagrams/toolchain.ts'

let bin: string

beforeEach(() => {
  bin = mkdtempSync(join(tmpdir(), 'dex-doctor-'))
})

afterEach(() => {
  rmSync(bin, { recursive: true, force: true })
})

const script = (name: string, body = 'exit 0') => {
  writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`)
  chmodSync(join(bin, name), 0o755)
}
/** A fake kpsewhich that finds every required file except `except`. */
const kpsewhich = (except: readonly string[] = []) =>
  script(
    'kpsewhich',
    `for f in "$@"; do case "$f" in ${except.map((file) => `${file}) ;;`).join(' ')} *) echo "/texmf/$f" ;; esac; done`,
  )
const check = (env: NodeJS.ProcessEnv, nodeVersion = '24.1.0') =>
  doctorItems({ env: { PATH: bin, ...env }, nodeVersion })
const statuses = (items: ReturnType<typeof check>) =>
  Object.fromEntries(items.map((item) => [item.name, item.status]))

describe('dex doctor', () => {
  it('reports everything present', () => {
    for (const name of ['xelatex', 'dvisvgm', 'chromium']) script(name)
    kpsewhich()
    const items = check({})
    expect(statuses(items)).toEqual({
      'Node.js': 'ok',
      Chromium: 'ok',
      'TeX programs': 'ok',
      'TeX files': 'ok',
    })
    expect(formatDoctor(items)).toContain('Everything Dex needs is installed.')
    expect(formatDoctor(items)).not.toContain('How to fix')
  })

  it('names missing TeX files with their packages and how to install them', () => {
    for (const name of ['xelatex', 'dvisvgm', 'chromium']) script(name)
    kpsewhich(['FiraSans.sty'])
    const items = check({})
    expect(statuses(items)['TeX files']).toBe('missing')
    const report = formatDoctor(items)
    expect(report).toContain('missing FiraSans.sty (package fira)')
    expect(report).toContain('(drawing new diagrams)')
    expect(report).toContain('Install the TeX packages fira:')
    expect(report).toMatch(/nix develop \S+/)
    expect(report).toContain('sudo tlmgr install')
  })

  it('reports a missing Chromium and still checks the rest', () => {
    for (const name of ['xelatex', 'dvisvgm']) script(name)
    kpsewhich()
    const items = check({ CHROMIUM_PATH: undefined })
    expect(statuses(items)).toMatchObject({ Chromium: 'missing', 'TeX files': 'ok' })
    expect(formatDoctor(items)).toMatch(/Chromium, for dex fit, dex shot:\n.*CHROMIUM_PATH/)
  })

  it('does not count TeX files as missing when TeX itself is missing', () => {
    script('chromium')
    const items = check({})
    expect(statuses(items)).toMatchObject({ 'TeX programs': 'missing', 'TeX files': 'unchecked' })
    expect(formatDoctor(items)).toContain('1 missing.')
  })

  it('rejects Node.js older than 24', () => {
    expect(statuses(check({}, '22.11.0'))['Node.js']).toBe('missing')
  })

  it('checks every required TeX file', () => {
    for (const name of ['xelatex', 'dvisvgm']) script(name)
    kpsewhich(TEX_FILES.map(({ file }) => file))
    const files = check({}).find((item) => item.name === 'TeX files')
    for (const { file } of TEX_FILES) expect(files?.detail).toContain(file)
  })
})
