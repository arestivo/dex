#!/usr/bin/env node
/**
 * The `dex` command. Run it in a content folder (one that contains a
 * `decks/` folder), or point at one with `--folder`.
 */
import { parseArgs } from 'node:util'
import { buildSite, startDevServer, startPreview } from '../build/site.ts'
import { contentLocations } from '../core/config.ts'
import { runCheck } from './check.ts'
import { runFit } from './fit.ts'

const USAGE = `Usage: dex <command> [options] [slug...]

Commands:
  dev               serve the decks with live reload
  build             build the static site
  preview           serve the built site like a static host
  check [slug...]   validate decks (no build)
  fit [slug...]     build, then report slides whose content does not fit

Options:
  --folder <dir>    content folder containing decks/ (default: current folder)
  --dist <dir>      output folder for the site (default: <folder>/dist)
  --port <n>        port for dev and preview
  -h, --help        show this help
`

async function main(argv: readonly string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      folder: { type: 'string' },
      dist: { type: 'string' },
      port: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  const [command, ...slugs] = positionals
  if (values.help || command === undefined) {
    console.log(USAGE)
    return values.help ? 0 : 1
  }

  const content = contentLocations({ folder: values.folder, dist: values.dist })
  const port = values.port === undefined ? undefined : Number(values.port)
  if (port !== undefined && !Number.isInteger(port)) {
    console.error(`Invalid --port "${values.port}".`)
    return 1
  }

  switch (command) {
    case 'dev': {
      const server = await startDevServer(content, { port })
      server.printUrls()
      return 0
    }
    case 'build':
      await buildSite(content)
      return 0
    case 'preview': {
      const server = await startPreview(content, { port })
      server.printUrls()
      return 0
    }
    case 'check':
      return runCheck(content, slugs)
    case 'fit':
      return runFit(content, slugs)
    default:
      console.error(`Unknown command "${command}".\n\n${USAGE}`)
      return 1
  }
}

try {
  process.exitCode = await main(process.argv.slice(2))
} catch (error) {
  // Vite and the checks have already printed diagnostics; keep the summary short.
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
