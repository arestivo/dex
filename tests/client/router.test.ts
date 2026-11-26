import { describe, expect, it } from 'vitest'
import { fragmentFor, resolveFragment } from '../../src/client/router.ts'

const ids = ['title', 'uri', 'urn', 'cors-preflight']

describe('resolveFragment', () => {
  it('resolves slide ids canonically', () => {
    expect(resolveFragment('#cors-preflight', ids)).toEqual({ index: 3, canonical: true })
  })

  it('resolves remark-style positions and asks for a rewrite', () => {
    expect(resolveFragment('#2', ids)).toEqual({ index: 1, canonical: false })
  })

  it('falls back to the first slide', () => {
    expect(resolveFragment('', ids)).toEqual({ index: 0, canonical: false })
    expect(resolveFragment('#does-not-exist', ids)).toEqual({ index: 0, canonical: false })
    expect(resolveFragment('#99', ids)).toEqual({ index: 0, canonical: false })
    expect(resolveFragment('#0', ids)).toEqual({ index: 0, canonical: false })
    expect(resolveFragment('#%E0%A4%A', ids)).toEqual({ index: 0, canonical: false })
  })
})

describe('fragmentFor', () => {
  it('builds the fragment for an id', () => {
    expect(fragmentFor('urn')).toBe('#urn')
  })
})
