/**
 * Locates a Chromium executable for browser-based checks (`check:fit`,
 * e2e tests). We use the system browser instead of downloading one, which
 * keeps the toolchain reproducible under Nix.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const CANDIDATES = ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']

export function findChromium(): string {
  const fromEnv = process.env.CHROMIUM_PATH
  if (fromEnv) {
    if (existsSync(fromEnv)) return fromEnv
    throw new Error(`CHROMIUM_PATH points to "${fromEnv}", which does not exist.`)
  }
  for (const name of CANDIDATES) {
    try {
      const path = execFileSync('which', [name], { encoding: 'utf8' }).trim()
      if (path) return path
    } catch {
      // not on PATH; try the next candidate
    }
  }
  throw new Error(
    'No Chromium found. Install one (the Nix dev shell provides it) or set CHROMIUM_PATH.',
  )
}
