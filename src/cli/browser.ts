/**
 * Locates a Chromium executable for browser-based checks (`dex fit`,
 * `dex shot`, e2e tests). We use the system browser instead of downloading
 * one, which keeps the toolchain reproducible under Nix.
 */
import { existsSync } from 'node:fs'
import type { Page } from 'playwright-core'
import { findProgram } from '../core/diagrams/toolchain.ts'

const CANDIDATES = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']

export type ChromiumLookup = { readonly path: string } | { readonly problem: string }

/** Finds Chromium (`CHROMIUM_PATH`, then PATH) without throwing. */
export function locateChromium(env: NodeJS.ProcessEnv = process.env): ChromiumLookup {
  const fromEnv = env.CHROMIUM_PATH
  if (fromEnv) {
    if (existsSync(fromEnv)) return { path: fromEnv }
    return { problem: `CHROMIUM_PATH points to "${fromEnv}", which does not exist.` }
  }
  for (const name of CANDIDATES) {
    const path = findProgram(name, env.PATH ?? '')
    if (path !== undefined) return { path }
  }
  return {
    problem: `No Chromium found on PATH (looked for ${CANDIDATES.join(', ')}). Install one (the Nix dev shell provides it) or set CHROMIUM_PATH.`,
  }
}

/** Finds Chromium, or throws with how to provide one. */
export function findChromium(): string {
  const found = locateChromium()
  if ('path' in found) return found.path
  throw new Error(found.problem)
}

/**
 * Shows every step of every slide, whatever the viewer revealed: `dex fit`
 * and `dex shot` check a slide's full content. Unlayered, so it beats the
 * viewer's layered rules.
 */
export async function showEveryStep(page: Page): Promise<void> {
  await page.addStyleTag({ content: '.step { visibility: visible !important; }' })
}
