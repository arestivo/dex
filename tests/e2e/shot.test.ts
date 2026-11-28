/**
 * `dex shot` against a temporary copy of the viewer fixture (it writes
 * .dex/shots/ into the content folder). Needs Chromium, like the e2e tests.
 */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FIXTURES, runDex } from '../helpers.ts'

let folder: string
beforeAll(() => {
  folder = mkdtempSync(join(tmpdir(), 'dex-shot-'))
  cpSync(join(FIXTURES, 'viewer'), folder, { recursive: true })
})
afterAll(() => {
  rmSync(folder, { recursive: true, force: true })
})

const isPng = (file: string) =>
  readFileSync(file)
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))

describe('dex shot', () => {
  it('saves light and dark images of one slide and prints their paths', async () => {
    const { code, stdout } = await runDex(folder, 'shot', 'demo', 'diagram')
    expect(code).toBe(0)
    expect(stdout.trim().split('\n')).toEqual([
      '.dex/shots/demo/diagram-light.png',
      '.dex/shots/demo/diagram-dark.png',
    ])
    for (const theme of ['light', 'dark'])
      expect(isPng(join(folder, `.dex/shots/demo/diagram-${theme}.png`))).toBe(true)
    const light = readFileSync(join(folder, '.dex/shots/demo/diagram-light.png'))
    const dark = readFileSync(join(folder, '.dex/shots/demo/diagram-dark.png'))
    expect(light.equals(dark)).toBe(false)
  }, 120_000)

  it('captures a slide with steps', async () => {
    const { code, stdout } = await runDex(folder, 'shot', 'demo', 'reveal')
    expect(code).toBe(0)
    expect(stdout).toContain('.dex/shots/demo/reveal-light.png')
  }, 120_000)

  it('saves every slide of a deck', async () => {
    const { code } = await runDex(folder, 'shot', 'demo')
    expect(code).toBe(0)
    expect(readdirSync(join(folder, '.dex/shots/demo'))).toHaveLength(15 * 2)
  }, 180_000)

  it('refuses unknown slides and decks, writing nothing', async () => {
    rmSync(join(folder, '.dex/shots'), { recursive: true, force: true })
    const slide = await runDex(folder, 'shot', 'demo', 'nope')
    expect(slide.code).toBe(1)
    expect(slide.stderr).toContain('Not a slide of "demo": nope.')
    const deck = await runDex(folder, 'shot', 'ghost')
    expect(deck.code).toBe(1)
    expect(existsSync(join(folder, '.dex/shots'))).toBe(false)
  }, 60_000)
})
