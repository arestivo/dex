/**
 * Programmatic dev server, build and preview for a content folder.
 * Used by the `dex` CLI, the fit check and the e2e tests, so there is a
 * single place where the Vite configuration is assembled.
 */
import {
  build,
  createServer,
  type InlineConfig,
  type LogLevel,
  type PreviewServer,
  preview,
  type ViteDevServer,
} from 'vite'
import type { ContentLocations } from '../core/config.ts'
import { dex } from './vite-plugin.ts'

export interface SiteOptions {
  readonly port?: number | undefined
  readonly logLevel?: LogLevel
}

function viteConfig(content: ContentLocations, options: SiteOptions): InlineConfig {
  return {
    configFile: false,
    logLevel: options.logLevel ?? 'info',
    plugins: [dex({ content })],
    ...(options.port === undefined
      ? {}
      : {
          server: { port: options.port, strictPort: true },
          preview: { port: options.port, strictPort: true },
        }),
  }
}

export async function startDevServer(
  content: ContentLocations,
  options: SiteOptions = {},
): Promise<ViteDevServer> {
  const server = await createServer(viteConfig(content, options))
  await server.listen()
  return server
}

/** Builds the site into `content.outDir`. Rejects when any deck has errors. */
export async function buildSite(
  content: ContentLocations,
  options: SiteOptions = {},
): Promise<void> {
  await build(viteConfig(content, options))
}

/** Serves `content.outDir` like a plain static host. */
export function startPreview(
  content: ContentLocations,
  options: SiteOptions = {},
): Promise<PreviewServer> {
  return preview(viteConfig(content, options))
}
