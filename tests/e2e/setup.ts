/**
 * Builds the committed viewer fixture deck into a temporary folder and
 * serves it for the e2e tests. Tests never depend on real decks.
 */
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestProject } from 'vitest/node'
import { buildSite, startPreview } from '../../src/build/site.ts'
import { contentLocations } from '../../src/core/config.ts'

declare module 'vitest' {
  export interface ProvidedContext {
    baseUrl: string
  }
}

const FIXTURE = new URL('../fixtures/viewer/', import.meta.url).pathname

export default async function setup(project: TestProject) {
  const dist = await mkdtemp(join(tmpdir(), 'dex-e2e-'))
  const content = contentLocations({ folder: FIXTURE, dist })
  await buildSite(content, { logLevel: 'error' })
  const server = await startPreview(content, { logLevel: 'error', port: 0 })
  const url = server.resolvedUrls?.local[0]
  if (url === undefined) throw new Error('The preview server did not report a URL.')
  project.provide('baseUrl', url)
  return async () => {
    await server.close()
    await rm(dist, { recursive: true, force: true })
  }
}
