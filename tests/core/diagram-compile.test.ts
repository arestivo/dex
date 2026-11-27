import { describe, expect, it } from 'vitest'
import { prefixIds, svgWidthEm } from '../../src/core/diagrams/figure.ts'
import type { DiagramOutcome } from '../../src/core/diagrams/render.ts'
import { compile, deck, messages, slide, slidesHtml } from '../helpers.ts'

const SVG = (theme: string) =>
  `<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='141.28pt' height='51.97pt' viewBox='0 0 141.28 51.97'><defs><path id='g0-1' d='M0 0'/><clipPath id='c1'><path d='M0 0'/></clipPath></defs><use xlink:href='#g0-1' clip-path='url(#c1)' data-theme='${theme}'/></svg>`
const ok = async (sources: readonly string[]): Promise<DiagramOutcome[]> =>
  sources.map(() => ({ svg: { light: SVG('light'), dark: SVG('dark') } }))
const tikz = (body = '\\node {A};', meta = ' alt="Two boxes"') =>
  `\`\`\`tikz${meta}\n\\begin{tikzpicture}\n${body}\n\\end{tikzpicture}\n\`\`\``

describe('diagram figures', () => {
  it('renders a figure with both renderings, alt text and an em width', async () => {
    const [html] = await slidesHtml(slide('loop', tikz()), { renderDiagrams: ok })
    expect(html).toContain('<figure class="diagram" role="img" aria-label="Two boxes">')
    expect(html).toMatch(
      /<svg[^>]*class="diagram__render diagram__render--light"[^>]*aria-hidden="true"[^>]*style="width: 14.128em"/,
    )
    expect(html).toContain('diagram__render--dark')
    expect(html).not.toContain('<pre')
    expect(html).not.toContain("width='141.28pt'")
  })

  it('gives every figure and mode its own ids', async () => {
    const [html = ''] = await slidesHtml(slide('loop', `${tikz()}\n\n${tikz()}`), {
      renderDiagrams: ok,
    })
    // The slide itself is id="loop"; count only the ids inside the diagrams.
    const ids = [...html.matchAll(/\sid="(loop-[^"]+)"/g)].map(([, id]) => id)
    expect(ids).toHaveLength(8)
    expect(new Set(ids).size).toBe(8)
    expect(html).toContain('href="#loop-diagram1-light-g0-1"')
    expect(html).toContain('clip-path="url(#loop-diagram2-dark-c1)"')
  })

  it('sends only valid blocks to the renderer, in order', async () => {
    const seen: string[] = []
    await compile(deck(slide('a', tikz('\\node {1};')), slide('b', tikz('\\node {2};'))), {
      renderDiagrams: async (sources) => {
        seen.push(...sources)
        return ok(sources)
      },
    })
    expect(seen.map((source) => source.match(/\\node \{(\d)\}/)?.[1])).toEqual(['1', '2'])
  })
})

describe('diagram diagnostics', () => {
  it('rejects blocks that are not one tikzpicture, at the fence line', async () => {
    const result = await messages(slide('a', '```tikz alt="x"\n\\node {A};\n```'), {
      renderDiagrams: ok,
    })
    expect(result).toEqual([
      expect.stringMatching(
        /^decks\/test\/slides\.md:7 error \[a\] A tikz block must contain exactly one tikzpicture/,
      ),
    ])
  })

  it('warns about missing alt text', async () => {
    const { diagnostics } = await compile(slide('a', tikz('\\node {A};', '')), {
      renderDiagrams: ok,
    })
    expect(diagnostics.items).toEqual([
      expect.objectContaining({
        severity: 'warning',
        line: 7,
        slideId: 'a',
        message: expect.stringMatching(/^Diagram without alt text/),
      }),
    ])
  })

  it('does not report tikz as an unknown code language', async () => {
    const { diagnostics } = await compile(slide('a', tikz()), { renderDiagrams: ok })
    expect(diagnostics.items).toEqual([])
  })

  it('maps block errors to the deck line', async () => {
    const result = await messages(slide('a', tikz('\\node (a) {A};\n\\draw (a) -- (nowhere);')), {
      renderDiagrams: async () => [
        { error: { file: 'block', line: 3, message: 'No shape named `nowhere` is known.' } },
      ],
    })
    // fence at line 7: block line 3 (the \draw) is deck line 10
    expect(result).toEqual([
      'decks/test/slides.md:10 error [a] Diagram error: No shape named `nowhere` is known.',
    ])
  })

  it('reports a preamble error once, on the preamble file', async () => {
    const result = await messages(deck(slide('a', tikz()), slide('b', tikz())), {
      renderDiagrams: async (sources) =>
        sources.map(() => ({
          error: { file: 'tikz/preamble.tex', line: 12, message: 'Undefined control sequence.' },
        })),
    })
    expect(result).toEqual([
      'tikz/preamble.tex:12 error Diagram preamble error: Undefined control sequence.',
    ])
  })

  it('names the preamble without a line when TeX cannot locate the error', async () => {
    const result = await messages(slide('a', tikz()), {
      renderDiagrams: async () => [
        { error: { file: 'decks/test/tikz.tex', message: 'File ended while scanning.' } },
      ],
    })
    expect(result).toEqual([
      'decks/test/tikz.tex error Diagram preamble error: File ended while scanning.',
    ])
  })

  it('is an error when no renderer is available', async () => {
    expect((await messages(slide('a', tikz())))[0]).toMatch(/Diagrams cannot be rendered here/)
  })
})

describe('figure helpers', () => {
  it('converts point widths to em (10pt = 1em)', () => {
    expect(svgWidthEm("<svg width='141.28pt' height='5pt'>")).toBe(14.128)
    expect(svgWidthEm('<svg>')).toBeUndefined()
  })

  it('prefixes ids and references', () => {
    expect(
      prefixIds(`<path id='a'/><use xlink:href='#a'/><g clip-path="url(#b)" id="b"/>`, 'p-'),
    ).toBe(`<path id='p-a'/><use xlink:href='#p-a'/><g clip-path="url(#p-b)" id="p-b"/>`)
  })
})
