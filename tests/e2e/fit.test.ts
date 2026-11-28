/**
 * `dex fit` against a temporary copy of a fixture whose slide only overflows
 * once its steps are shown. Needs Chromium, like the other e2e tests.
 */
import { appendFileSync, cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { FIXTURES, runDex } from '../helpers.ts'

let folder: string
beforeAll(() => {
  folder = mkdtempSync(join(tmpdir(), 'dex-fit-'))
  cpSync(join(FIXTURES, 'steps-fit'), folder, { recursive: true })
})
afterAll(() => {
  rmSync(folder, { recursive: true, force: true })
})

describe('dex fit', () => {
  it('measures slides with every step shown', async () => {
    const { code, stdout, stderr } = await runDex(folder, 'fit')
    expect(code).toBe(1)
    const output = `${stdout}\n${stderr}`
    expect(output).toMatch(/decks\/long\/slides\.md:\d+ error \[long\] Content does not fit/)
    expect(output).not.toContain('[short]')
  }, 120_000)
})

describe('dex fit and diagrams', () => {
  it('reports a slide that only its diagram makes too tall', async () => {
    const viewer = mkdtempSync(join(tmpdir(), 'dex-fit-diagram-'))
    try {
      cpSync(join(FIXTURES, 'viewer'), viewer, { recursive: true })
      const deck = join(viewer, 'decks/demo/slides.md')
      // The cached diagram, after enough text to leave it too little room.
      const block = /```tikz[\s\S]*?\n```/.exec(readFileSync(deck, 'utf8'))?.[0] ?? ''
      expect(block).not.toBe('')
      const lines = Array.from({ length: 11 }, (_, index) => `- Line ${index + 1}`).join('\n')
      // The same slide fits without its diagram.
      appendFileSync(
        deck,
        `\n---\n\n::slide{#tall-diagram}\n\n# Tall\n\n${lines}\n\n${block}\n\n---\n\n::slide{#tall-text}\n\n# Tall\n\n${lines}\n`,
      )
      const { code, stdout, stderr } = await runDex(viewer, 'fit', 'demo')
      const output = `${stdout}\n${stderr}`
      expect(code, output).toBe(1)
      expect(output).toMatch(/error \[tall-diagram\] Content does not fit/)
      expect(output).not.toContain('[tall-text]')
    } finally {
      rmSync(viewer, { recursive: true, force: true })
    }
  }, 180_000)
})
