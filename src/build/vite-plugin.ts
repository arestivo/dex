/**
 * Vite integration. One pipeline for dev and build. Vite's root is the
 * engine (viewer code, styles, layouts); decks are read from, and the site
 * written to, the content locations given in the options.
 *
 * - `virtual:layouts.css`: scoped CSS of every layout in layouts/.
 * - dev: serves the index, deck pages and deck assets; reloads on changes.
 * - build: validates every deck, then emits the index, one page per deck
 *   and only the assets that slides reference, next to the client bundle.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { extname, join, relative, resolve, sep } from 'node:path'
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite'
import { CLIENT_ENTRY, type ContentLocations, ENGINE_ROOT, LAYOUTS_DIR } from '../core/config.ts'
import {
  type Diagnostic,
  DiagnosticBag,
  formatDiagnostic,
  hasErrors,
  sortDiagnostics,
} from '../core/diagnostics.ts'
import { layoutsCss, loadLayouts, STYLE_FILE } from '../core/layouts/load.ts'
import { IDENTIFIER_PATTERN } from '../core/model.ts'
import type { PageAssets } from '../core/render/html.ts'
import { renderDeckPage, renderErrorPage, renderIndexPage } from '../core/render/pages.ts'
import {
  compileDeckAt,
  compileWorkspace,
  findDecks,
  type ResolvedWorkspace,
  resolveOptions,
  type WorkspaceResult,
} from '../core/workspace.ts'

export interface DexPluginOptions {
  /** Where the decks are and where the site is built. */
  readonly content: ContentLocations
  /** Title of the site index page. */
  readonly siteTitle?: string
  /** Layouts folder (default: the engine's `layouts/`). */
  readonly layoutsDir?: string
}

const VIRTUAL_CSS = 'virtual:layouts.css'
const RESOLVED_CSS = `\0${VIRTUAL_CSS}`
const APP_DIR = '_app'

const CONTENT_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.json': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.zip': 'application/zip',
}

export function dex(options: DexPluginOptions): Plugin {
  const siteTitle = options.siteTitle ?? 'Slides'
  const { content } = options
  const workspace: ResolvedWorkspace = resolveOptions({
    root: content.root,
    decksDir: content.decksDir,
    layoutsDir: options.layoutsDir ?? LAYOUTS_DIR,
  })
  let config: ResolvedConfig
  /** Compiled in buildStart, emitted in generateBundle. */
  let built: WorkspaceResult | undefined

  const report = (diagnostics: readonly Diagnostic[]): void => {
    for (const d of sortDiagnostics(diagnostics)) {
      const line = formatDiagnostic(d)
      if (d.severity === 'error') config.logger.error(line)
      else config.logger.warn(line)
    }
  }

  return {
    name: 'dex',

    config() {
      return {
        root: ENGINE_ROOT,
        appType: 'custom',
        base: './',
        build: {
          outDir: content.outDir,
          // The output folder is dedicated to the site, even when it is
          // outside the engine root (where Vite would refuse to empty it).
          emptyOutDir: true,
          assetsDir: APP_DIR,
          rolldownOptions: { input: { app: join(ENGINE_ROOT, CLIENT_ENTRY) } },
        },
      }
    },

    configResolved(resolved) {
      config = resolved
    },

    resolveId(id) {
      return id === VIRTUAL_CSS ? RESOLVED_CSS : undefined
    },

    load(id) {
      if (id !== RESOLVED_CSS) return undefined
      const { layouts, diagnostics } = loadLayouts(workspace.root, workspace.layoutsDir)
      report(diagnostics.items)
      for (const layout of layouts.values()) {
        this.addWatchFile(join(workspace.layoutsDir, layout.name, STYLE_FILE))
      }
      return layoutsCss(layouts)
    },

    hotUpdate({ file }) {
      const inLayouts = isInside(workspace.layoutsDir, file)
      const inDecks = isInside(workspace.decksDir, file)
      if (!inLayouts && !inDecks) return undefined

      if (inLayouts && file.endsWith(STYLE_FILE)) {
        const css = this.environment.moduleGraph.getModuleById(RESOLVED_CSS)
        return css ? [css] : []
      }
      this.environment.hot.send({ type: 'full-reload' })
      return []
    },

    configureServer(server) {
      // Decks usually live outside the engine root, which Vite watches by default.
      server.watcher.add(workspace.decksDir)
      return () => {
        server.middlewares.use((req, res, next) => {
          handleDevRequest(server, req.url ?? '/', res).then(
            (handled) => handled || next(),
            (error: unknown) => next(error),
          )
        })
      }
    },

    configurePreviewServer(server) {
      // Behave like a plain static host: `/http/` serves `/http/index.html`.
      server.middlewares.use((req, _res, next) => {
        if (req.url !== undefined) {
          const url = new URL(req.url, 'http://localhost')
          if (url.pathname.endsWith('/')) req.url = `${url.pathname}index.html${url.search}`
        }
        next()
      })
    },

    async buildStart() {
      if (config.command !== 'build') return
      const result = await compileWorkspace(workspace)
      report(result.diagnostics)
      if (hasErrors(result.diagnostics)) {
        const count = result.diagnostics.filter((d) => d.severity === 'error').length
        this.error(`${count} error(s) in decks; nothing was built. Run \`dex check\` for details.`)
      }
      built = result
    },

    async generateBundle(_, bundle) {
      if (built === undefined) return
      const entry = Object.values(bundle).find(
        (chunk) => chunk.type === 'chunk' && chunk.isEntry && chunk.name === 'app',
      )
      if (entry?.type !== 'chunk') this.error('Client entry chunk not found.')
      const css = [...(entry.viteMetadata?.importedCss ?? [])]
      const assetsFrom = (prefix: string): PageAssets => ({
        scripts: [`${prefix}${entry.fileName}`],
        styles: css.map((file) => `${prefix}${file}`),
      })

      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: renderIndexPage(built.decks, assetsFrom(''), {
          title: siteTitle,
          deckHref: (slug) => `${slug}/`,
        }),
      })

      for (const deck of built.decks) {
        this.emitFile({
          type: 'asset',
          fileName: `${deck.slug}/index.html`,
          source: renderDeckPage(deck, assetsFrom('../')),
        })
        for (const asset of deck.assets) {
          this.emitFile({
            type: 'asset',
            fileName: `${deck.slug}/${asset}`,
            source: await readFile(join(workspace.decksDir, deck.slug, asset)),
          })
        }
      }
    },
  }

  async function handleDevRequest(
    server: ViteDevServer,
    url: string,
    res: ServerResponse,
  ): Promise<boolean> {
    const path = decodeURIComponent(new URL(url, 'http://localhost').pathname)
    const devAssets: PageAssets = { scripts: [`/${CLIENT_ENTRY}`], styles: [] }

    const html = async (body: string, status = 200): Promise<true> => {
      res.statusCode = status
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.end(await server.transformIndexHtml(path, body))
      return true
    }

    if (path === '/' || path === '/index.html') {
      const result = await compileWorkspace(workspace)
      report(result.diagnostics)
      return html(
        renderIndexPage(result.decks, devAssets, {
          title: siteTitle,
          deckHref: (slug) => `/${slug}/`,
        }),
      )
    }

    const [, slug, ...rest] = path.split('/')
    if (slug === undefined || !IDENTIFIER_PATTERN.test(slug)) return false
    const location = findDecks(workspace, new DiagnosticBag()).find((deck) => deck.slug === slug)
    if (location === undefined) return false

    if (rest.length === 0) {
      res.statusCode = 301
      res.setHeader('Location', `/${slug}/`)
      res.end()
      return true
    }

    if (rest.join('/') === '' || rest.join('/') === 'index.html') {
      const { layouts, diagnostics: layoutDiagnostics } = loadLayouts(
        workspace.root,
        workspace.layoutsDir,
      )
      const { deck, diagnostics } = await compileDeckAt(location, layouts)
      const all = [...layoutDiagnostics.items, ...diagnostics.items]
      report(all)
      if (deck === undefined || hasErrors(all))
        return html(renderErrorPage(sortDiagnostics(all), devAssets), 500)
      return html(renderDeckPage(deck, devAssets))
    }

    const file = resolve(location.dir, ...rest)
    if (!file.startsWith(location.dir + sep) || !existsSync(file) || !statSync(file).isFile())
      return false
    res.setHeader(
      'Content-Type',
      CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
    )
    createReadStream(file).pipe(res)
    return true
  }
}

function isInside(dir: string, file: string): boolean {
  const rel = relative(dir, file)
  return rel !== '' && !rel.startsWith('..') && !rel.startsWith(sep)
}
