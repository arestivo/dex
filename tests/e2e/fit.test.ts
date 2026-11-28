/**
 * `dex fit` against a temporary copy of a fixture whose slide only overflows
 * once its steps are shown. Needs Chromium, like the other e2e tests.
 */
import { cpSync, mkdtempSync, rmSync } from 'node:fs'
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
