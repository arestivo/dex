import { describe, expect, it } from 'vitest'
import { contentLocations, ENGINE_ROOT, LAYOUTS_DIR } from '../../src/core/config.ts'
import { PROJECT_ROOT } from '../helpers.ts'

describe('contentLocations', () => {
  it('uses the working directory as the content folder by default', () => {
    expect(contentLocations({}, '/home/me/talks')).toEqual({
      root: '/home/me/talks',
      decksDir: '/home/me/talks/decks',
      outDir: '/home/me/talks/dist',
    })
  })

  it('resolves --folder against the working directory', () => {
    expect(contentLocations({ folder: '../talks' }, '/home/me/engine')).toEqual({
      root: '/home/me/talks',
      decksDir: '/home/me/talks/decks',
      outDir: '/home/me/talks/dist',
    })
  })

  it('takes --dist independently of --folder', () => {
    const locations = contentLocations({ folder: '/srv/talks', dist: 'site' }, '/home/me')
    expect(locations.decksDir).toBe('/srv/talks/decks')
    expect(locations.outDir).toBe('/home/me/site')
  })
})

describe('engine locations', () => {
  it('finds the engine and its layouts regardless of the working directory', () => {
    expect(ENGINE_ROOT.replace(/\/$/, '')).toBe(PROJECT_ROOT.replace(/\/$/, ''))
    expect(LAYOUTS_DIR).toBe(`${ENGINE_ROOT.replace(/\/$/, '')}/layouts`)
  })
})
