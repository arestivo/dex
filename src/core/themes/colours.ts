/**
 * A theme's full colour set: the engine's default colour tokens with the
 * theme's values on top, `var(--x)` defaults resolved. Used by the contrast
 * check and by diagram palettes. Pure.
 */
import type { ModeColour } from '../model.ts'
import { parseColourValue, type TokenDefault } from './parse.ts'

export type Colours = ReadonlyMap<string, ModeColour>

/** Merges `overrides` over the defaults; a default `var(--other)` follows `other`. */
export function mergeColours(defaults: readonly TokenDefault[], overrides: Colours): Colours {
  const raw = new Map(defaults.map((token) => [token.name, token.value]))
  const result = new Map<string, ModeColour>()
  const resolve = (name: string, depth: number): ModeColour | undefined => {
    const own = overrides.get(name) ?? result.get(name)
    if (own !== undefined) return own
    const value = raw.get(name)
    if (value === undefined || depth > 8) return undefined
    const reference = /^var\(\s*--([\w-]+)\s*\)$/.exec(value)?.[1]
    return reference === undefined ? parseColourValue(value) : resolve(reference, depth + 1)
  }
  for (const name of raw.keys()) {
    const colour = resolve(name, 0)
    if (colour !== undefined) result.set(name, colour)
  }
  return result
}
