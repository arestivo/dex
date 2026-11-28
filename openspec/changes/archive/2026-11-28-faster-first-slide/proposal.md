# Proposal

## Why

Until the viewer's script runs, a deck page is an ordinary document. The page is already hidden behind the loading indicator, but the browser still lays out every slide of the deck, code blocks and examples included, before the script can show one. On real decks that first layout is roughly half the time to the first slide.

When the first slide is revealed, measured inside the page on a local server, over three runs:

| Deck | Before | Slides hidden while loading |
| --- | --- | --- |
| `from-specs-to-code` | 289–432 ms | 78–87 ms |
| `css3` | 571–684 ms | 239–252 ms |
| `html5` | 278–290 ms | 94–101 ms |
| `http` | 322–364 ms | 128–151 ms |

I also measured lazy-loading `css3`'s 51 example iframes. It gained nothing once slides are hidden (362 ms), and lazy iframes don't load for printing, so they print empty. Iframes are left alone.

## What Changes

- **Slides stay out of layout while the page loads.** While the page is hidden behind the loading indicator, every slide is also taken out of layout. The viewer then shows only the slide it chose. Without JavaScript nothing is hidden, as before.
- **Unchanged:**
  - the loading indicator itself;
  - the fallback that reveals the page after a few seconds if the script never runs;
  - print;
  - `dex fit` and `dex shot`, which measure after the viewer is ready.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `deck-viewer`: opening a deck lays out only the slide it shows.

## Impact

- **Code:** the inline loading style in `src/core/render/html.ts` gets one more rule.
- **Tests:**
  - the render tests (the rule is in the page);
  - an e2e test that no slide has a layout box until the viewer is ready;
  - the existing loading-indicator tests (fallback, no JavaScript) still pass.
